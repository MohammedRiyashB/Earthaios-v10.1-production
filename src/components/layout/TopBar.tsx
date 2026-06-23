import React, { useEffect, useState, useRef } from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useHaptics } from '../../hooks/useHaptics';
import { INTEGRATION_APPS, AppConnectorModal } from '../ui/AppConnectorModal';

const statuses = [
  "SYSTEM READY",
  "STREAMING ACTIVE",
  "MEMORY ACTIVE",
  "LATENCY NORMAL"
];

export function TopBar() {
  const { toggleSidebar, activeView, connectionStatus, setIsSearchOpen, setIsNotificationOpen } = useApp();
  const haptic = useHaptics();

  const [showNotificationIcon, setShowNotificationIcon] = useState(false);
  
  // States for App Connector
  const [currentAppIdx, setCurrentAppIdx] = useState(0);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // start with false (Search) -> then true (Bell) every 10 seconds
    const interval = setInterval(() => {
      setShowNotificationIcon(prev => !prev);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // cycle icons every 5 seconds
    const interval = setInterval(() => {
      setCurrentAppIdx(prev => (prev + 1) % INTEGRATION_APPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePointerDown = () => {
    pressTimer.current = setTimeout(() => {
      haptic(50);
      setIsAppModalOpen(true);
    }, 500); // 500ms long press
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const CurrentAppIcon = INTEGRATION_APPS[currentAppIdx].icon;
  const currentAppColor = INTEGRATION_APPS[currentAppIdx].color;

  return (
    <>
      <header className="flex justify-between items-center px-4 pb-4 pt-[max(env(safe-area-inset-top),16px)] w-full z-10 sticky top-0 bg-transparent shrink-0 hardware-accelerated transition-ultra">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              haptic(10);
              toggleSidebar();
            }}
            className="p-3 rounded-full bg-white/[0.04] backdrop-blur-lg hover:bg-white/[0.1] border border-white/10 transition-ultra text-white/80 hover:text-white z-20 hover:scale-[1.08] active:scale-95 shadow-sm"
          >
            <Menu size={22} />
          </button>

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
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={() => { haptic(5); setIsAppModalOpen(true); /* also allow click if they don't know to long press */ }}
            className="p-3 rounded-full bg-white/[0.04] backdrop-blur-lg hover:bg-white/[0.1] border border-white/10 transition-ultra text-white/80 hover:text-white z-20 hover:scale-[1.08] active:scale-95 shadow-sm flex items-center justify-center relative w-[46px] h-[46px] overflow-hidden group"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAppIdx}
                initial={{ y: 20, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 25 }}
                className={cn("flex items-center justify-center pointer-events-none absolute inset-0", currentAppColor)}
              >
                <CurrentAppIcon size={20} />
              </motion.div>
            </AnimatePresence>
          </button>

          <button
            onClick={() => {
              haptic(10);
              if (showNotificationIcon) {
                setIsNotificationOpen(true);
              } else {
                setIsSearchOpen(true);
              }
            }}
            className="p-3 rounded-full bg-white/[0.04] backdrop-blur-lg hover:bg-white/[0.1] border border-white/10 transition-ultra text-white/80 hover:text-white z-20 hover:scale-[1.08] active:scale-95 shadow-sm flex items-center justify-center relative w-[46px] h-[46px] overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {showNotificationIcon ? (
                <motion.div
                  key="bell"
                  initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex items-center justify-center pointer-events-none absolute inset-0"
                >
                  <Bell size={20} className="text-accent-400" />
                </motion.div>
              ) : (
                 <motion.div
                  key="search"
                  initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex items-center justify-center pointer-events-none absolute inset-0"
                >
                  <Search size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      <AppConnectorModal 
        isOpen={isAppModalOpen} 
        onClose={() => setIsAppModalOpen(false)} 
      />
    </>
  );
}
