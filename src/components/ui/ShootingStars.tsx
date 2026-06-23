import React, { useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  thickness: number;
}

export function ShootingStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isStreaming } = useApp();
  const starsRef = useRef<ShootingStar[]>([]);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const createStar = (): ShootingStar => {
      return {
        x: Math.random() * canvas.width * 1.5,
        y: Math.random() * -100,
        length: Math.random() * 100 + 50,
        speed: Math.random() * 5 + (isStreaming ? 15 : 2),
        angle: Math.PI / 4, // 45 degrees
        opacity: Math.random() * 0.8 + 0.2,
        thickness: Math.random() * 2 + 1,
      };
    };

    const updateStars = () => {
      // randomly add a new star occasionally based on state
      const targetStars = isStreaming ? 8 : 2;
      const spawnRate = isStreaming ? 0.3 : 0.05;

      if (starsRef.current.length < targetStars && Math.random() < spawnRate) {
        starsRef.current.push(createStar());
      }

      for (let i = starsRef.current.length - 1; i >= 0; i--) {
        const star = starsRef.current[i];
        star.x -= star.speed * Math.cos(star.angle);
        star.y += star.speed * Math.sin(star.angle);
        star.opacity -= 0.01;

        if (
          star.opacity <= 0 ||
          star.x < -100 ||
          star.y > canvas.height + 100
        ) {
          starsRef.current.splice(i, 1);
        }
      }
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const star of starsRef.current) {
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(
          star.x + star.length * Math.cos(star.angle),
          star.y - star.length * Math.sin(star.angle)
        );

        const gradient = ctx.createLinearGradient(
          star.x,
          star.y,
          star.x + star.length * Math.cos(star.angle),
          star.y - star.length * Math.sin(star.angle)
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = star.thickness;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    };

    const animate = () => {
      updateStars();
      drawStars();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}
