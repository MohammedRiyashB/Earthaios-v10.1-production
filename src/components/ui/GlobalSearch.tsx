import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, MessageSquare, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useHaptics } from '../../hooks/useHaptics';

export function GlobalSearch() {
  const { isSearchOpen, setIsSearchOpen, messages, setActiveView } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const haptic = useHaptics();

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  // Handle Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        haptic(10);
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        haptic(10);
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen, haptic]);

  if (!isSearchOpen) return null;

  const handleClose = () => {
    haptic(10);
    setIsSearchOpen(false);
  };

  const lowerQuery = query.toLowerCase();

  // Search through messages
  const messageResults = messages.filter(m => 
    m.content.toLowerCase().includes(lowerQuery)
  );

  // Settings mock options
  const settingOptions = [
    { label: 'Appearance', view: 'settings', icon: Settings },
    { label: 'Account', view: 'settings', icon: Settings },
    { label: 'Notifications', view: 'settings', icon: Settings },
    { label: 'Voice & Audio', view: 'settings', icon: Settings },
    { label: 'Network & Data', view: 'settings', icon: Settings },
    { label: 'Security & Privacy', view: 'settings', icon: Settings },
    { label: 'Storage', view: 'settings', icon: Settings },
    { label: 'About', view: 'settings', icon: Settings }
  ].filter(opt => opt.label.toLowerCase().includes(lowerQuery));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-lg bg-[#111113] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]"
        >
          {/* Header */}
          <div className="flex items-center px-4 py-3 border-b border-white/5">
            <Search className="text-white/40 mr-3" size={20} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search messages or settings..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
            />
            <button onClick={handleClose} className="p-1 text-white/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
            {query.length > 0 ? (
              <>
                {/* Settings Results */}
                {settingOptions.length > 0 && (
                  <div className="mb-4">
                    <h3 className="px-3 py-1 text-[11px] font-semibold tracking-wider text-white/40 uppercase mb-1">
                      Settings
                    </h3>
                    <div className="space-y-1">
                      {settingOptions.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            haptic(15);
                            setActiveView('settings');
                            setIsSearchOpen(false);
                          }}
                          className="w-full flex items-center px-3 py-2 rounded-xl text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors text-left"
                        >
                          <opt.icon size={16} className="mr-3 text-white/50" />
                          <span className="text-sm">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Results */}
                {messageResults.length > 0 && (
                  <div>
                    <h3 className="px-3 py-1 text-[11px] font-semibold tracking-wider text-white/40 uppercase mb-1">
                      Messages
                    </h3>
                    <div className="space-y-1">
                      {messageResults.map((msg) => (
                        <button
                          key={msg.id}
                          onClick={() => {
                            haptic(15);
                            setActiveView('chat');
                            setIsSearchOpen(false);
                          }}
                          className="w-full flex flex-col px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors text-left group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "text-xs font-medium",
                              msg.role === 'user' ? "text-accent-400" : "text-emerald-400"
                            )}>
                              {msg.role === 'user' ? 'You' : 'EARTH OS'}
                            </span>
                            <span className="text-[10px] text-white/30">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
                            {msg.content}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {settingOptions.length === 0 && messageResults.length === 0 && (
                  <div className="py-10 text-center text-white/40 text-sm">
                    No results found for "{query}"
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center flex flex-col items-center">
                <Search className="text-white/20 mb-3" size={32} />
                <p className="text-white/40 text-sm">Type to search for messages or settings</p>
                <div className="flex items-center gap-2 mt-4 text-xs text-white/30 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">⌘</span>
                  <span>+</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">K</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
