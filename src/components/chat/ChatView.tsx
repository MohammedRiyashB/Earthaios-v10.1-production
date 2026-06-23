import React from 'react';
import { EarthCore } from './EarthCore';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';
import { ShootingStars } from '../ui/ShootingStars';

export function ChatView() {
  const { messages, isStreaming, isVoiceMode } = useApp();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 flex flex-col relative w-full h-full overflow-hidden hardware-accelerated"
    >
      <ShootingStars />
      <EarthCore />
      <div className="flex-1 overflow-y-auto no-scrollbar z-10 w-full relative">
        <MessageList />
      </div>
      <div 
        className="fixed bottom-0 left-0 right-0 z-[9999] w-full pt-20 pointer-events-none flex flex-col bg-gradient-to-t from-[#000000] via-[#000000]/90 to-transparent"
      >
        <div className="pointer-events-auto px-4 sm:px-6 w-full max-w-4xl mx-auto flex flex-col items-center">
          <ChatInput />
        </div>
        <div style={{ height: 'max(env(safe-area-inset-bottom), 8px)' }} className="w-full shrink-0 relative flex justify-center items-end">
           <motion.div 
             animate={{ 
               opacity: isVoiceMode || isStreaming ? [0.5, 1, 0.5] : 0.8,
               scaleX: isVoiceMode || isStreaming ? [0.95, 1.05, 0.95] : 1
             }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
             className="h-[3px] w-[90%] md:w-[60%] rounded-t-full opacity-80"
             style={{ 
               background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.2), rgba(34,197,94,0.8), rgba(16,185,129,0.8), rgba(34,197,94,0.2), transparent)',
               boxShadow: '0 0 15px rgba(34,197,94,0.3)'
             }}
           />
        </div>
      </div>
    </motion.div>
  );
}

