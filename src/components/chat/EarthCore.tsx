import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';

export function EarthCore() {
  const { messages, isStreaming, isVoiceMode } = useApp();
  const isInitial = messages.length === 0;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
      
      {/* Background dark gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#050B14] via-[#010308] to-black" />

      {/* Core container space */}
      <motion.div
        animate={{
          scale: isInitial ? 1 : 0.85,
          opacity: isInitial ? 1 : 0.4,
          y: isInitial ? 0 : -40
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        style={{ willChange: "transform, opacity" }}
        className="relative flex items-center justify-center w-full h-full"
      >
        {/* Outer glowing rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          style={{ willChange: "transform" }}
          className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full border border-blue-500/10 border-t-blue-400/30 border-l-blue-400/10 border-r-transparent border-b-transparent"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ willChange: "transform" }}
          className="absolute w-[45vw] h-[45vw] max-w-[450px] max-h-[450px] rounded-full border border-cyan-400/20 border-b-cyan-300/40 border-r-cyan-300/10 border-l-transparent border-t-transparent"
        />

        {/* Central Core */}
        <div className="relative flex items-center justify-center w-32 h-32 md:w-48 md:h-48">
          {/* Inner pulsating glow based on state */}
          <motion.div
            animate={{
              scale: isStreaming || isVoiceMode ? [1, 1.2, 1] : [1, 1.05, 1],
              opacity: isStreaming || isVoiceMode ? [0.6, 1, 0.6] : [0.4, 0.6, 0.4],
            }}
            transition={{ 
              duration: isStreaming || isVoiceMode ? 1.5 : 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            style={{ willChange: "transform, opacity" }}
            className="absolute w-full h-full bg-blue-500/30 rounded-full blur-xl"
          />
          
          <motion.div
            animate={{
              rotate: 360,
              scale: isStreaming || isVoiceMode ? [1, 1.1, 1] : [1, 1.03, 1]
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: isStreaming || isVoiceMode ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }
            }}
            style={{ willChange: "transform" }}
            className="w-full h-full rounded-full bg-gradient-to-tr from-blue-900 via-blue-600 to-cyan-400 opacity-80 shadow-[0_0_40px_rgba(34,211,238,0.3)] border border-cyan-300/20"
          >
            {/* Texture/Inner detail */}
            <div className="w-full h-full rounded-full overflow-hidden opacity-50 relative pointer-events-none">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.8),_transparent)]" />
               <div className="absolute top-[10%] left-[20%] w-[30%] h-[20%] bg-blue-300/40 rounded-full blur-md" />
               <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[30%] bg-cyan-100/30 rounded-full blur-md" />
            </div>
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
}
