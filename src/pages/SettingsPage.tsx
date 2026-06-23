import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, Bell, Mic, Shield, HardDrive, Info, Bug, LogOut, ChevronDown, Cpu, Server, Layers, MemoryStick, Activity, Eye, Zap, UserCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { useHaptics } from '../hooks/useHaptics';
import { Logo } from '../components/ui/Logo';

const sections = [
  { id: 'appearance', label: 'Appearance', icon: Palette, value: 'Dark' },
];

const generalOptions = [
  { id: 'account', label: 'Account', icon: UserCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'voice', label: 'Voice & Audio', icon: Mic },
  { id: 'data', label: 'Network & Data', icon: Zap },
  { id: 'security', label: 'Security & Privacy', icon: Shield },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'report', label: 'Report bug', icon: Bug },
  { id: 'about', label: 'About', icon: Info },
];

function Toggle({ checked, onChange, label, desc }: { checked: boolean, onChange: (v: boolean) => void, label: string, desc?: string }) {
  const haptic = useHaptics();
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex flex-col">
        <span className="text-white text-[15px]">{label}</span>
        {desc && <span className="text-white/50 text-xs mt-0.5">{desc}</span>}
      </div>
      <button 
        onClick={() => {
          haptic(10);
          onChange(!checked);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-accent-500" : "bg-white/20"
        )}
      >
        <span className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )} />
      </button>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  const haptic = useHaptics();
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-white text-[15px]">{label}</span>
      <select 
        value={value}
        onChange={(e) => {
          haptic(10);
          onChange(e.target.value);
        }}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/90 outline-none focus:border-accent-500/50 transition-colors"
      >
        {options.map(opt => (
          <option key={opt} value={opt} className="bg-[#1A1A1D]">{opt}</option>
        ))}
      </select>
    </div>
  );
}

export function SettingsPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [bugReport, setBugReport] = useState('');
  const [storageSizes, setStorageSizes] = useState({ local: '0 B', idb: '0 B', cache: '0 B' });
  
  const { 
    settings, 
    updateSetting, 
    clearMessages,
    user,
    authLoading,
    loginWithGoogle,
    loginAsGuest,
    logout 
  } = useApp();
  const haptic = useHaptics();

  const toggleSection = (id: string) => {
    haptic(10);
    setOpenSection(openSection === id ? null : id);
  };

  const handleClearCache = async () => {
    haptic(15);
    if (confirm("Are you sure you want to clear all cache? This will reload the app.")) {
      clearMessages();
      localStorage.clear();
      try {
        indexedDB.deleteDatabase('earth-os-db');
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      } catch(e) {}
      haptic([10, 50, 10]);
      window.location.reload();
    }
  };

  React.useEffect(() => {
    if (openSection === 'storage') {
      const calculateSizes = async () => {
        let localSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) localSize += localStorage.getItem(key)?.length || 0;
        }

        const formatBytes = (bytes: number) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        let cacheSize = 0;
        let idbSize = 0;

        try {
          if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            // Typically storage estimate covers IndexedDB/Caches broadly. Let's use idbSize as the overall usage roughly.
            idbSize = estimate.usage || 0;
          }
          
          const keys = await caches.keys();
          for (const key of keys) {
            const cache = await caches.open(key);
            const reqs = await cache.keys();
            for(const req of reqs) {
              const res = await cache.match(req);
              if (res) {
                const blob = await res.blob();
                cacheSize += blob.size;
              }
            }
          }
        } catch(e) {}

        setStorageSizes({
          local: formatBytes(localSize),
          idb: formatBytes(idbSize),
          cache: formatBytes(cacheSize),
        });
      };
      calculateSizes();
    }
  }, [openSection]);

  const handleToggleNotifs = async (v: boolean) => {
    haptic(10);
    if (v) {
      if ('Notification' in window) {
        const p = await Notification.requestPermission();
        if (p === 'granted') {
          updateSetting('pushNotifs', true);
        } else {
          alert('Denied');
          updateSetting('pushNotifs', false);
        }
      } else {
        alert('Not supported');
        updateSetting('pushNotifs', false);
      }
    } else {
      updateSetting('pushNotifs', false);
    }
  };

  const handleToggleVoice = async (v: boolean) => {
    haptic(10);
    if (v) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        updateSetting('voiceEnabled', true);
      } catch(e) {
        alert('Permission Denied');
        updateSetting('voiceEnabled', false);
      }
    } else {
      updateSetting('voiceEnabled', false);
    }
  };

  const renderContent = (id: string) => {
    switch (id) {
      case 'appearance':
        return (
          <div className="p-5 pt-2 flex flex-col">
            <Toggle checked={settings.useDarkTheme} onChange={(v) => updateSetting('useDarkTheme', v)} label="Dark Theme" desc="Use darker colors for the interface" />
            <Select label="Font Size" value={settings.fontSize} onChange={(v) => updateSetting('fontSize', v)} options={['Small', 'Medium', 'Large']} />
            <Select label="Color Theme" value={settings.accentColor} onChange={(v) => updateSetting('accentColor', v)} options={['Logo', 'Blue', 'Emerald', 'Rose', 'Amber']} />
          </div>
        );
      case 'account':
        return (
          <div className="p-5 pt-2 flex flex-col gap-4">
            {authLoading ? (
              <div className="text-white/50 animate-pulse text-sm">Checking authentication status...</div>
            ) : user ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent-500/20 border border-accent-500/50 flex items-center justify-center overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle size={32} className="text-accent-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-lg truncate">
                      {user.displayName || (user.isAnonymous ? 'Guest User' : user.email || 'User')}
                    </span>
                    <span className="text-white/50 text-sm truncate">
                      {user.isAnonymous ? 'Temporary session' : user.email}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    haptic(15);
                    alert("Redirecting to Premium subscription portal...");
                  }}
                  className="w-full py-2.5 mt-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                >
                  Subscription Details
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-white/80 text-sm mb-2">Sign in to save your settings and preferences.</p>
                <button 
                  onClick={async () => {
                    haptic(15);
                    try {
                      await loginWithGoogle();
                    } catch (e) {
                      alert("Error signing in with Google");
                    }
                  }}
                  className="w-full py-3 bg-white text-black hover:bg-white/90 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                  Sign in with Google
                </button>
                <button 
                  onClick={async () => {
                    haptic(15);
                    try {
                      await loginAsGuest();
                    } catch (e) {
                      alert("Error signing in as Guest. Ensure Anonymous Auth is enabled in Firebase Console.");
                    }
                  }}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <UserCircle size={18} />
                  Continue as Guest
                </button>
              </div>
            )}
          </div>
        );
      case 'notifications':
        return (
          <div className="p-5 pt-2 flex flex-col">
            <Toggle checked={settings.pushNotifs} onChange={handleToggleNotifs} label="Push Notifications" desc={settings.pushNotifs ? "Enabled ✓" : "Alerts for messages and updates"} />
            <Toggle checked={settings.soundEffects} onChange={(v) => updateSetting('soundEffects', v)} label="Sound Effects" desc="Play a sound when receiving messages" />
            <Toggle checked={settings.haptics} onChange={(v) => updateSetting('haptics', v)} label="Haptic Feedback" desc="Vibrate on interactions" />
            
            {settings.haptics && (
              <Select label="Haptics Intensity" value={settings.hapticsIntensity} onChange={(v) => updateSetting('hapticsIntensity', v)} options={['Light', 'Medium', 'Strong']} />
            )}
            
            <Select label="Notification Tone" value={settings.notificationTone} onChange={(v) => updateSetting('notificationTone', v)} options={['Cosmic', 'Classic', 'Subtle', 'None']} />
          </div>
        );
      case 'voice':
        return (
          <div className="p-5 pt-2 flex flex-col">
            <Toggle checked={settings.voiceEnabled} onChange={handleToggleVoice} label="Voice Input" desc={settings.voiceEnabled ? "Microphone Connected ✓" : "Allow microphone access"} />
            <Select label="Assistant Voice" value={settings.assistantVoice} onChange={(v) => updateSetting('assistantVoice', v)} options={['Neural Natural', 'Robotic', 'Soft', 'Deep']} />
            <Select label="Speaking Rate" value={settings.speakingRate} onChange={(v) => updateSetting('speakingRate', v)} options={['Slow', 'Normal', 'Fast']} />
          </div>
        );
      case 'data':
        return (
          <div className="p-5 pt-2 flex flex-col">
            <Toggle checked={settings.dataSaver} onChange={(v) => updateSetting('dataSaver', v)} label="Data Saver Mode" desc="Optimize network usage on slow connections" />
            <Toggle checked={settings.offlineMode} onChange={(v) => {
              if (v && 'serviceWorker' in navigator) {
                // Register a minimal service worker dynamically if user asks for it, or just show ready
                updateSetting('offlineMode', v);
              } else {
                updateSetting('offlineMode', v);
              }
            }} label="Offline Support" desc={settings.offlineMode ? "Offline Ready ✓" : "Cache assets for offline availability"} />
            <Select label="Media Auto-Download" value={settings.mediaAutoDownload} onChange={(v) => updateSetting('mediaAutoDownload', v)} options={['Wi-Fi only', 'Wi-Fi & Cellular', 'Never']} />
          </div>
        );
      case 'security':
        return (
          <div className="p-5 pt-2 flex flex-col">
            <Toggle checked={settings.biometric} onChange={async (v) => {
              if (v && window.PublicKeyCredential) {
                // Feature supported
                updateSetting('biometric', true);
              } else if (v) {
                alert('Not Supported');
                updateSetting('biometric', false);
              } else {
                updateSetting('biometric', false);
              }
            }} label="Biometric Lock" desc={settings.biometric ? "Face/Touch ID Available" : "Require Face/Touch ID to open app"} />
            <Toggle checked={settings.analytics} onChange={(v) => updateSetting('analytics', v)} label="Share Analytics" desc="Help us improve EARTH OS" />
            <Select label="Message Retention" value={settings.messageRetention} onChange={(v) => updateSetting('messageRetention', v)} options={['Forever', '30 Days', '7 Days']} />
          </div>
        );
      case 'storage':
        return (
          <div className="p-5 pt-2 flex flex-col gap-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">App Storage (Local)</span>
              <span className="text-white font-mono">{storageSizes.local}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">Cache</span>
              <span className="text-white font-mono">{storageSizes.cache}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">Offline Data (IDB)</span>
              <span className="text-white font-mono">{storageSizes.idb}</span>
            </div>
            <button 
              onClick={handleClearCache}
              className="mt-2 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium"
            >
              Clear All Cache
            </button>
          </div>
        );
      case 'report':
        return (
          <div className="p-5 pt-2 flex flex-col gap-3">
            <textarea 
              value={bugReport}
              onChange={(e) => setBugReport(e.target.value)}
              placeholder="Describe the issue..." 
              className="bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-accent-500 h-24 resize-none"
            />
            <button 
               onClick={() => {
                 haptic(15);
                 if (!bugReport.trim()) {
                   alert("Please describe the issue.");
                   return;
                 }
                 const reports = JSON.parse(localStorage.getItem('bugReports') || '[]');
                 reports.push({ text: bugReport, timestamp: Date.now() });
                 localStorage.setItem('bugReports', JSON.stringify(reports));
                 alert("Report submitted successfully");
                 setBugReport('');
                 haptic([10, 50, 10]);
               }}
               className="py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
            >
              Submit Report
            </button>
          </div>
        );
      case 'about':
        return (
          <div className="p-5 pt-2 text-sm text-white/70 space-y-4">
            <div className="text-center mb-6 flex flex-col items-center">
              <Logo className="w-16 h-16 mb-4 shadow-accent-glow-lg" />
              <h2 className="text-xl font-bold text-white mb-1 tracking-tight">EARTH AI OS</h2>
              <p className="text-accent-400 font-mono text-xs opacity-80 uppercase tracking-widest">Version 10.1</p>
            </div>
            
            <div className="space-y-3">
               <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/50">Founder</span>
                  <span className="text-white">Mohammed Riyash B</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/50">Organization</span>
                  <span className="text-white">BMR Inc.</span>
               </div>
               
               <div className="py-4">
                 <span className="text-white/50 mb-2 block">Current Intelligence Model</span>
                 <div className="flex items-center justify-between p-3 rounded-2xl border border-accent-500/30 bg-accent-500/10 shadow-accent-glow-sm">
                   <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent-400)_80%,transparent)]" />
                     <span className="text-emerald-400 font-semibold tracking-wide">Core engine by earthai os</span>
                   </div>
                 </div>
               </div>
            </div>

            <div className="pt-4">
              <a 
                href="upi://pay?pa=mohdriyash10-1@oksbi&pn=Mohammed%20Riyash%20B&aid=uGICAgKCzlaKFcg"
                className="w-full flex items-center justify-center gap-2 py-3 bg-accent-500 hover:bg-accent-400 text-black font-semibold rounded-xl transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Donate via UPI
              </a>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 overflow-y-auto px-4 py-8 w-full mx-auto no-scrollbar"
    >
      <h1 className="text-2xl font-bold tracking-tight mb-8 px-1">Settings</h1>

      <div className="space-y-6">
        {/* Appearance block */}
        <div className="bg-white/[0.05] border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/5 shadow-sm">
          {sections.map((item) => {
             const isOpen = openSection === item.id;
             return (
               <div key={item.id} className="flex flex-col">
                 <button 
                    onClick={() => toggleSection(item.id)}
                    className="w-full flex items-center justify-between p-5 hover:bg-white/[0.08] transition-colors text-left group"
                 >
                   <div className="flex items-center gap-4 text-white/80 group-hover:text-white transition-colors">
                     <item.icon size={20} />
                     <span className="font-medium text-[15px]">{item.label}</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-sm text-white/40">{item.value}</span>
                     <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                       <ChevronDown size={18} className="text-white/20 group-hover:text-white/40" />
                     </motion.div>
                   </div>
                 </button>
                 <AnimatePresence>
                   {isOpen && (
                     <motion.div
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: "auto", opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="overflow-hidden bg-black/20"
                     >
                       {renderContent(item.id)}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             )
          })}
        </div>

        {/* General block */}
        <div className="bg-white/[0.05] border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/5 shadow-sm">
          {generalOptions.map((item) => {
            const Icon = item.icon as any;
            const isOpen = openSection === item.id;
            return (
              <div key={item.id} className="flex flex-col">
                <button 
                  onClick={() => toggleSection(item.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/[0.08] transition-colors text-left group"
                >
                  <div className="flex items-center gap-4 text-white/80 group-hover:text-white transition-colors">
                    {typeof Icon === 'function' ? (
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Icon /></svg>
                    ) : (
                       <Icon size={20} />
                    )}
                    <span className="font-medium text-[15px]">{item.label}</span>
                  </div>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                    <ChevronDown size={18} className="text-white/20 group-hover:text-white/40" />
                  </motion.div>
                </button>
                <AnimatePresence>
                   {isOpen && (
                     <motion.div
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: "auto", opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="overflow-hidden bg-black/20"
                     >
                       {renderContent(item.id)}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            )
          })}
        </div>
        
        {/* Logout */}
        {user && (
          <button 
             onClick={async () => {
               haptic(20);
               try {
                 await logout();
               } catch (e) {
                 alert("Error logging out.");
               }
             }}
             className="w-full flex items-center justify-start gap-4 p-5 bg-white/[0.05] border border-white/10 rounded-3xl hover:bg-red-500/10 hover:text-red-400 text-white/80 transition-all text-left group">
             <LogOut size={20} className="group-hover:text-red-400" />
             <span className="font-medium text-[15px]">Log out from EARTH</span>
          </button>
        )}

        {/* Founder Card at the bottom of Settings */}
        <div className="mt-10 mb-6 relative">
          <div className="absolute inset-0 bg-accent-500/10 blur-[30px] rounded-full" />
          <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-5 flex items-center gap-4 hover:bg-white/[0.06] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-12 rounded-full border border-accent-500/50 flex items-center justify-center bg-gradient-to-br from-accent-900 to-black relative overflow-hidden shadow-accent-glow-sm shrink-0">
              <div className="absolute inset-0 bg-accent-500/20 mix-blend-overlay animate-pulse" />
              <span className="text-accent-400 font-bold text-xl">M</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight text-white/95">Mohammed Riyash B</span>
              <span className="text-sm text-accent-400 font-medium">Founder · BMR Inc.</span>
            </div>
          </div>
        </div>

      </div>
      <div className="h-32" />
    </motion.div>
  );
}

