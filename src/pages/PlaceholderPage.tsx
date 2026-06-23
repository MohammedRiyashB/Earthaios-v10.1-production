import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Bot, Map, User, Folder, Search } from 'lucide-react';

export function PlaceholderPage() {
  const { activeView } = useApp();
  
  const getIcon = () => {
    switch(activeView) {
      case 'agents': return Bot;
      case 'memory': return Search;
      case 'projects': return Folder;
      case 'search': return Search;
      default: return Map;
    }
  };
  
  const Icon = getIcon();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10"
    >
      <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
         <Icon size={32} className="text-white/40" />
      </div>
      <h1 className="text-2xl font-semibold capitalize text-white/90 tracking-wide mb-2">
        {activeView.replace('-', ' ')}
      </h1>
      <p className="text-white/40 max-w-sm text-sm leading-relaxed">
        This workspace block is currently under construction in the master branch. V10.1 components will be synced shortly.
      </p>
    </motion.div>
  );
}
