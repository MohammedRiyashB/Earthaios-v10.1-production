import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';

interface EarthCoreProps {
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function EarthCore({ state }: EarthCoreProps) {
  const { messages, isStreaming, isVoiceMode } = useApp();
  const isInitial = messages.length === 0;

  // Derive internal state if not explicitly provided
  const internalState = state || (
    isStreaming ? 'thinking' : (isVoiceMode ? 'listening' : 'idle')
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
      
      {/* Background dark gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white dark:from-[#050B14] dark:via-[#010308] dark:to-black" />

      {/* Core container space */}
      <motion.div
        animate={{
          scale: isInitial ? 1 : 0.85,
          opacity: isInitial ? 1 : 0.4,
          y: isInitial ? 0 : 60
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        style={{ willChange: "transform, opacity" }}
        className="relative flex items-center justify-center w-full h-full"
      >
        {/* Outer glowing rings */}
        <AnimatePresence>
          {internalState === 'thinking' && (
            <motion.div
              key="thinking-rings"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.5 } }}
              style={{ willChange: "transform, opacity" }}
              className="absolute w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full border-[2px] border-cyan-400/30 border-t-cyan-300/60 border-b-purple-400/40 border-l-transparent border-r-transparent"
            />
          )}
          {internalState === 'listening' && (
            <motion.div
              key="listening-pulse"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ willChange: "transform, opacity" }}
              className="absolute w-[45vw] h-[45vw] max-w-[450px] max-h-[450px] rounded-full bg-blue-500/10 border border-blue-400/20"
            />
          )}
        </AnimatePresence>

        {/* Central Core */}
        <div className="relative flex items-center justify-center w-32 h-32 md:w-48 md:h-48">
          {/* Inner pulsating glow based on state */}
          <motion.div
            animate={{
              scale: internalState === 'speaking' ? [1, 1.3, 1] : internalState === 'thinking' ? [1, 1.1, 1] : internalState === 'listening' ? [1, 1.15, 1] : [1, 1.05, 1],
              opacity: internalState === 'speaking' ? [0.6, 1, 0.6] : internalState === 'thinking' ? [0.4, 0.8, 0.4] : internalState === 'listening' ? [0.5, 0.8, 0.5] : [0.3, 0.5, 0.3],
            }}
            transition={{ 
              duration: internalState === 'speaking' ? 0.8 : internalState === 'listening' ? 1.5 : internalState === 'thinking' ? 1 : 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            style={{ willChange: "transform, opacity" }}
            className={`absolute w-full h-full rounded-full blur-xl ${internalState === 'thinking' ? 'bg-cyan-500/40' : internalState === 'speaking' ? 'bg-indigo-500/50' : 'bg-blue-500/30'}`}
          />
          
          <motion.div
            animate={{
              rotate: internalState === 'thinking' ? 360 : 0,
              scale: internalState === 'speaking' ? [1, 1.1, 1] : internalState === 'listening' ? [1, 1.05, 1] : 1
            }}
            transition={{
              rotate: { duration: 10, repeat: Infinity, ease: "linear" },
              scale: { duration: internalState === 'speaking' ? 0.3 : 1.5, repeat: Infinity, ease: internalState === 'speaking' ? "anticipate" : "easeInOut" }
            }}
            style={{ willChange: "transform" }}
            className={`w-full h-full rounded-full opacity-90 shadow-[0_0_40px_rgba(34,211,238,0.3)] border border-white/20 overflow-hidden relative ${internalState === 'speaking' ? 'bg-gradient-to-tr from-indigo-900 via-blue-500 to-cyan-300' : internalState === 'thinking' ? 'bg-gradient-to-tr from-cyan-900 via-teal-600 to-blue-400' : 'bg-gradient-to-tr from-blue-900 via-blue-600 to-cyan-400'}`}
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
