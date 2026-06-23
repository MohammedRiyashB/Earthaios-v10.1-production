import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useHaptics } from '../../hooks/useHaptics';
import { cn } from '../../lib/utils';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  time: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Core Engine Online',
    message: 'EARTH OS V10 initialized successfully and is running at optimal capacity.',
    time: '2m ago'
  },
  {
    id: '2',
    type: 'info',
    title: 'Model Update',
    message: 'Core engine updated. New parameters applied to conversational patterns.',
    time: '14m ago'
  },
  {
    id: '3',
    type: 'warning',
    title: 'Latency Detected',
    message: 'Brief latency spike detected in neural link. Compensating automatically.',
    time: '1h ago'
  }
];

export function NotificationOverlay() {
  const { isNotificationOpen, setIsNotificationOpen } = useApp();
  const haptic = useHaptics();

  const handleClose = () => {
    haptic(10);
    setIsNotificationOpen(false);
  };

  return (
    <AnimatePresence>
      {isNotificationOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-sm shadow-2xl"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="absolute bottom-0 left-0 right-0 h-[85vh] bg-[#0A0A0C] border-t border-white/10 rounded-t-[2.5rem] flex flex-col overflow-hidden shadow-2xl hardware-accelerated"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-500/10 rounded-xl">
                  <Bell size={20} className="text-accent-400" />
                </div>
                <h2 className="text-base font-semibold text-white tracking-widest uppercase">System Alerts</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-10 flex flex-col">
              {mockNotifications.map((notif, index) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent-500/50" />
                  <div className="flex gap-4">
                    <div className={cn("mt-0.5", {
                      'text-blue-400': notif.type === 'info',
                      'text-yellow-400': notif.type === 'warning',
                      'text-green-400': notif.type === 'success'
                    })}>
                      {notif.type === 'info' && <Info size={18} />}
                      {notif.type === 'warning' && <AlertTriangle size={18} />}
                      {notif.type === 'success' && <CheckCircle size={18} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white/90">{notif.title}</h3>
                        <span className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <div className="mt-auto pt-6 pb-2 text-center text-[10px] uppercase tracking-widest text-white/30 font-semibold">
                End of notifications
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
