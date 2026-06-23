import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { Check, ChevronDown, Zap } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
}

const MODELS: Model[] = [
  {
    id: 'core-engine-v1',
    name: 'Core Engine V1',
    description: 'Highly optimized native model for fast tasks.',
    icon: <Zap size={16} />
  },
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto',
    description: 'Automatically routes to the best model using OpenRouter.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 6L20 12L14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 6L4 12L10 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) // approximate generic path for their logo
  }
];

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelSelector({ isOpen, onClose }: ModelSelectorProps) {
  const { currentModel, setCurrentModel } = useApp();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[99998] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[99999] bg-white dark:bg-[#121212] border-t border-black/10 dark:border-white/10 rounded-t-3xl pt-2 pb-6 px-4 shadow-2xl safe-area-bottom hardware-accelerated"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                onClose();
              }
            }}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
            
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 px-2 tracking-tight">Select Model</h2>
              
              {MODELS.map(model => {
                const isSelected = currentModel === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      setCurrentModel(model.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                      isSelected 
                        ? 'bg-black/5 dark:bg-white/10 border-transparent shadow-sm' 
                        : 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? 'bg-black text-white dark:bg-white dark:text-black' 
                          : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/60'
                      }`}>
                        {model.id === 'openrouter/auto' ? (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM5 12V10L10.5 7.5V11L7.5 12L10.5 13V16.5L5 14V12ZM19 12V14L13.5 16.5V13L16.5 12L13.5 11V7.5L19 10V12Z" fill="currentColor" />
                          </svg>
                        ) : model.icon }
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">{model.name}</div>
                        <div className="text-xs text-gray-500 dark:text-white/50">{model.description}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={20} className="text-black dark:text-white mx-2 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
