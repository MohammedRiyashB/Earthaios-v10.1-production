/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ChatView } from './components/chat/ChatView';
import { SettingsPage } from './pages/SettingsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { GlobalSearch } from './components/ui/GlobalSearch';
import { NotificationOverlay } from './components/ui/NotificationOverlay';
import { useGyroscope } from './hooks/useGyroscope';

function MainArea() {
  const { activeView } = useApp();
  const tilt = useGyroscope();

  const renderView = () => {
    switch (activeView) {
      case 'chat': return <ChatView />;
      case 'settings': return <SettingsPage />;
      default: return <PlaceholderPage />;
    }
  };

  return (
    <motion.main 
      animate={{
        backgroundPosition: `${50 + tilt.x * 20}% ${50 + tilt.y * 20}%`
      }}
      transition={{
        backgroundPosition: { type: "tween", ease: "linear", duration: 0.1 }
      }}
      style={{
        backgroundSize: '150% 150%'
      }}
      className="flex-1 flex flex-col relative h-full overflow-hidden bg-black"
    >
      <TopBar />
      <AnimatePresence mode="wait">
        {renderView()}
      </AnimatePresence>
    </motion.main>
  );
}

function BiometricScreen({ onUnlock }: { onUnlock: () => void }) {
  useEffect(() => {
    // Mock the biometric prompt delay
    const timer = setTimeout(() => {
      onUnlock();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onUnlock]);

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
      <motion.div 
        animate={{ scale: [1, 1.1, 1] }} 
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-20 h-20 bg-accent-500/20 rounded-full flex items-center justify-center mb-6 border border-accent-500/30 shadow-accent-glow-xl"
      >
        <Shield size={32} className="text-accent-400" />
      </motion.div>
      <h2 className="text-white text-xl font-medium tracking-tight mb-2">EARTH OS Locked</h2>
      <p className="text-white/50 text-sm">Authenticating via biometrics...</p>
    </div>
  );
}

function AppWithSettings() {
  const { settings } = useApp();
  const [isUnlocked, setIsUnlocked] = useState(!settings.biometric);
  
  const textSizeClass = 
    settings.fontSize === 'Small' ? 'text-sm' :
    settings.fontSize === 'Large' ? 'text-lg' : 'text-base';
    
  return (
    <div data-theme={settings.accentColor} className={`flex h-[100dvh] w-full bg-black text-white font-sans overflow-hidden relative shadow-2xl ${textSizeClass}`}>
      <AnimatePresence>
        {!isUnlocked && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
            <BiometricScreen onUnlock={() => setIsUnlocked(true)} />
          </motion.div>
        )}
      </AnimatePresence>
      <Sidebar />
      <MainArea />
      <GlobalSearch />
      <NotificationOverlay />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppWithSettings />
    </AppProvider>
  );
}

