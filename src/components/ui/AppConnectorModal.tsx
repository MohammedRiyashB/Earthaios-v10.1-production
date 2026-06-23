import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search as SearchIcon, Plug, Mail, Github, Calendar, Cloud, Flame, CheckCircle2, Circle } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics';
import { cn } from '../../lib/utils';
import { RippleButton } from './RippleButton';

export const INTEGRATION_APPS = [
  { id: '1', name: 'Gmail', icon: Mail, color: 'text-red-500', bg: 'bg-red-500/10', category: 'Google Workspace' },
  { id: '2', name: 'Google Drive', icon: Cloud, color: 'text-green-500', bg: 'bg-green-500/10', category: 'Google Workspace' },
  { id: '3', name: 'Google Calendar', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10', category: 'Google Workspace' },
  { id: '4', name: 'GitHub', icon: Github, color: 'text-white', bg: 'bg-white/10', category: 'Development' },
  { id: '5', name: 'Firebase', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10', category: 'Development' },
];

interface AppConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppConnectorModal({ isOpen, onClose }: AppConnectorModalProps) {
  const haptic = useHaptics();
  const [searchTerm, setSearchTerm] = useState('');
  const [connections, setConnections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem('earth_os_integrations');
    if (saved) setConnections(JSON.parse(saved));
  }, []);

  const toggleConnection = (id: string) => {
    haptic(15);
    const newConns = { ...connections, [id]: !connections[id] };
    setConnections(newConns);
    localStorage.setItem('earth_os_integrations', JSON.stringify(newConns));
  };

  const filteredApps = INTEGRATION_APPS.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(filteredApps.map(app => app.category)));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-[#0A0A0C] border border-white/10 sm:rounded-3xl rounded-t-3xl flex flex-col shadow-2xl relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-col p-6 pb-4 border-b border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-500/20 rounded-xl relative">
                    <Plug size={20} className="text-accent-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Connect Tools</h2>
                    <p className="text-xs text-white/50 mt-0.5">Tier-1 Integrations</p>
                  </div>
                </div>
                <button
                  onClick={() => { haptic(10); onClose(); }}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search built-in tools..."
                  className="w-full bg-[#1A1A1D] border border-white/10 focus:border-accent-500/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-ultra"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
              {categories.map(category => (
                <div key={category}>
                  <h3 className="text-xs tracking-wider font-semibold text-white/40 uppercase mb-3 px-1">{category}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredApps.filter(a => a.category === category).map((app, idx) => (
                      <RippleButton
                        key={app.id}
                        onClick={() => toggleConnection(app.id)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border transition-ultra text-left hardware-accelerated",
                          connections[app.id] 
                            ? "bg-white/[0.05] border-accent-500/50 shadow-[0_0_15px_rgba(0,184,217,0.1)]" 
                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-md", app.bg)}>
                            <app.icon size={20} className={app.color} />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white/90 block">
                              {app.name}
                            </span>
                            <span className="text-[10px] text-white/50">
                              {connections[app.id] ? 'Connected' : 'Not Connected'}
                            </span>
                          </div>
                        </div>
                        <div>
                          {connections[app.id] ? (
                            <CheckCircle2 size={18} className="text-accent-500 mr-1" />
                          ) : (
                            <Circle size={18} className="text-white/20 mr-1" />
                          )}
                        </div>
                      </RippleButton>
                    ))}
                  </div>
                </div>
              ))}
              
              {filteredApps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-white/40">
                  <SearchIcon size={32} className="mb-4 opacity-50" />
                  <p>No extensions found</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/5 bg-[#0a0a0c] text-center shrink-0">
               <p className="text-[10px] uppercase tracking-widest font-semibold text-accent-500">EARTH OS Integration Engine</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
