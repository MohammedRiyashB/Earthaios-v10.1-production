import React, { useState, useRef, useEffect } from 'react';
import { EarthCore } from './EarthCore';
import { ChatInput } from './ChatInput';
import { MessageList, EmptyGreeting } from './MessageList';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';
import { ShootingStars } from '../ui/ShootingStars';
import { ModelSelector } from '../ui/ModelSelector';

export function ChatView() {
  const { messages, isStreaming, isVoiceMode, isIncognito } = useApp();
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const lastScrollTopRef = useRef(0);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 150; // 150px threshold
    
    // Determine scroll direction
    if (scrollTop < lastScrollTopRef.current && !isAtBottom) {
      // User scrolled up
      setUserScrolled(true);
    }
    
    if (isAtBottom) {
      // User reached the bottom
      setUserScrolled(false);
    }
    
    lastScrollTopRef.current = scrollTop;
  };

  useEffect(() => {
    if (!userScrolled && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isStreaming]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 flex flex-col relative w-full h-full overflow-hidden hardware-accelerated"
    >
      {!isIncognito && (
        <>
          <ShootingStars />
          <EarthCore />
          {messages.length === 0 && (
            <div className="absolute inset-x-0 top-[20%] lg:top-[25%] flex justify-center pointer-events-none z-10">
              <EmptyGreeting />
            </div>
          )}
        </>
      )}
      {isIncognito && (
        <div className="absolute inset-0 bg-black pointer-events-none z-0" />
      )}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar z-10 w-full relative"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 85%, transparent 100%)'
        }}
      >
        <MessageList />
      </div>
      <div 
        className="fixed bottom-0 left-0 right-0 z-[50] w-full pt-20 pointer-events-none flex flex-col"
      >
        <div className="pointer-events-auto px-4 sm:px-6 w-full max-w-[700px] mx-auto flex flex-col items-center pb-2">
          <ChatInput />
        </div>
        <div 
           style={{ height: 'max(env(safe-area-inset-bottom), 16px)' }} 
           className="w-full shrink-0 relative flex justify-center items-end"
        >
           <motion.button 
             onClick={() => setIsModelSelectorOpen(true)}
             animate={{ 
               opacity: isVoiceMode || isStreaming ? [0.5, 1, 0.5] : 0.8,
               scaleX: isVoiceMode || isStreaming ? [0.95, 1.05, 0.95] : 1
             }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
             className="h-[4px] w-[90%] md:w-[60%] rounded-t-full opacity-80 pointer-events-auto cursor-pointer hover:opacity-100 hover:h-[6px] active:scale-95 transition-all mb-1"
             style={{ 
               background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.3), rgba(34,197,94,1), rgba(16,185,129,1), rgba(34,197,94,0.3), transparent)',
               boxShadow: '0 0 20px rgba(34,197,94,0.5), 0 -2px 10px rgba(34,197,94,0.3)'
             }}
           />
        </div>
      </div>
      
      <ModelSelector 
        isOpen={isModelSelectorOpen} 
        onClose={() => setIsModelSelectorOpen(false)} 
      />
    </motion.div>
  );
}

