import React from 'react';
import { Menu, MessageCircle, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useHaptics } from '../../hooks/useHaptics';

export function TopBar() {
  const { toggleSidebar, connectionStatus, isIncognito, setIsIncognito, activeView, setActiveView } = useApp();
  const haptic = useHaptics();

  const btnClass = "w-[46px] h-[46px] rounded-full bg-[#18181A] md:bg-[#18181A]/80 hover:bg-[#202020] text-gray-400 hover:text-white transition-all flex items-center justify-center relative shadow-sm";

  return (
    <>
      <header className="flex justify-between items-center px-4 pb-2 pt-[max(env(safe-area-inset-top),16px)] w-full z-20 sticky top-0 bg-transparent shrink-0">
        <div className="flex items-center gap-4">
          {activeView === 'settings' ? (
            <button
              onClick={() => {
                haptic(10);
                setActiveView('chat');
              }}
              className={btnClass}
            >
              <ArrowLeft size={20} className="stroke-[1.5]" />
            </button>
          ) : (
            <button
              onClick={() => {
                haptic(10);
                toggleSidebar();
              }}
              className={btnClass}
            >
              <Menu size={20} className="stroke-[1.5]" />
            </button>
          )}

          <div className="flex flex-col">
             <div className="h-4 relative overflow-hidden w-32 mt-0.5">
               <AnimatePresence mode="wait">
                 {connectionStatus !== 'Connected' && (
                   <motion.span
                     key={connectionStatus}
                     initial={{ y: 10, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     exit={{ y: -10, opacity: 0 }}
                     transition={{ duration: 0.3 }}
                     className="absolute text-[11px] text-accent-400 font-mono tracking-wide flex items-center gap-1.5"
                   >
                     <span className={cn(
                       "w-1.5 h-1.5 rounded-full",
                       connectionStatus === 'Offline' ? 'bg-red-500' : 'bg-accent-500',
                       ['Thinking...', 'Streaming...'].includes(connectionStatus) ? 'animate-bounce' : 'animate-pulse'
                     )} />
                     {connectionStatus.toUpperCase()}
                   </motion.span>
                 )}
               </AnimatePresence>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeView !== 'settings' && (
            <button
              onClick={() => {
                haptic(10);
                setIsIncognito(!isIncognito);
              }}
              className={cn(
                btnClass,
                isIncognito && "text-accent-500 bg-accent-500/10 hover:bg-accent-500/20 shadow-[0_0_15px_rgba(var(--accent-500),0.3)]"
              )}
            >
               <MessageCircle size={20} className="stroke-[1.5]" />
            </button>
          )}
        </div>
      </header>
    </>
  );
}
