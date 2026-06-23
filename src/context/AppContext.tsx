import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ViewState, Message } from '../types';

import { earthApi } from '../services/earthApi';
import { memoryApi, StoredMessage } from '../services/memory';
import { idbSettings } from '../lib/idbStorage';

import { auth, googleProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, User, updateProfile } from '../lib/firebase';

export type ConnectionStatus = 'Offline' | 'Connected' | 'Thinking...' | 'Streaming...' | 'Poor Connection';

export interface AppSettings {
  useDarkTheme: boolean;
  autoTheme: boolean;
  fontSize: string;
  accentColor: string;
  pushNotifs: boolean;
  soundEffects: boolean;
  haptics: boolean;
  hapticsIntensity: string;
  notificationTone: string;
  voiceEnabled: boolean;
  assistantVoice: string;
  speakingRate: string;
  dataSaver: boolean;
  offlineMode: boolean;
  mediaAutoDownload: string;
  biometric: boolean;
  analytics: boolean;
  messageRetention: string;
}

const defaultSettings: AppSettings = {
  useDarkTheme: true,
  autoTheme: false,
  fontSize: 'Medium',
  accentColor: 'Logo',
  pushNotifs: true,
  soundEffects: true,
  haptics: true,
  hapticsIntensity: 'Medium',
  notificationTone: 'Cosmic',
  voiceEnabled: true,
  assistantVoice: 'Neural Natural',
  speakingRate: 'Normal',
  dataSaver: false,
  offlineMode: true,
  mediaAutoDownload: 'Wi-Fi only',
  biometric: false,
  analytics: false,
  messageRetention: 'Forever'
};

interface AppContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  messages: Message[];
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, content: string | ((prev: string) => string), extras?: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  isVoiceMode: boolean;
  setIsVoiceMode: (isVoiceMode: boolean) => void;
  conversationId: string;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  currentModel: string;
  setCurrentModel: (model: string) => void;
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  isIncognito: boolean;
  setIsIncognito: (incognito: boolean) => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  user: User | null;
  authLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  sessions: any[];
  createNewSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<any>) => void;
  memories: import('../types').MemoryItem[];
  addMemory: (memory: Omit<import('../types').MemoryItem, 'id' | 'timestamp'>) => void;
  deleteMemory: (id: string) => void;
  updateMemory: (id: string, updates: Partial<import('../types').MemoryItem>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('chat');
  const [isIncognito, setIsIncognito] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const [normalMessages, setNormalMessages] = useState<Message[]>([]);
  const [incognitoMessages, setIncognitoMessages] = useState<Message[]>([]);

  const messages = isIncognito ? incognitoMessages : normalMessages;
  
  const setMessages = (msgs: Message[] | ((prev: Message[]) => Message[])) => {
    if (isIncognito) {
      // @ts-ignore
      setIncognitoMessages(msgs);
    } else {
      // @ts-ignore
      setNormalMessages(msgs);
    }
  };

  const addMessage = (msg: Message) => {
    if (isIncognito) {
      setIncognitoMessages(prev => [...prev, msg]);
    } else {
      setNormalMessages(prev => [...prev, msg]);
    }
  };

  const updateMessage = (id: string, content: string | ((prev: string) => string), extras?: Partial<Message>) => {
    if (isIncognito) {
      setIncognitoMessages(prev => prev.map(msg => 
        msg.id === id 
          ? { 
              ...msg, 
              content: typeof content === 'function' ? content(msg.content) : content,
              ...extras
            }
          : msg
      ));
    } else {
      setNormalMessages(prev => prev.map(msg => 
        msg.id === id 
          ? { 
              ...msg, 
              content: typeof content === 'function' ? content(msg.content) : content,
              ...extras
            }
          : msg
      ));
    }
  };

  const clearMessages = () => {
    if (isIncognito) {
      setIncognitoMessages([]);
    } else {
      setNormalMessages([]);
    }
  };
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [currentModel, setCurrentModel] = useState('core-engine-v1');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Connected');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [memories, setMemories] = useState<import('../types').MemoryItem[]>([
    {
      id: 'mock_1',
      type: 'long-term',
      category: 'user-profile',
      content: 'User prefers concise summaries and dark mode UIs.',
      importance: 8,
      timestamp: new Date(Date.now() - 86400000 * 2),
      isPinned: true,
      tags: ['preferences', 'system']
    },
    {
      id: 'mock_2',
      type: 'long-term',
      category: 'general',
      content: 'Working on EARTH AI OS project. Goals: Voice Mode, Memory Manager, Web Search.',
      importance: 9,
      timestamp: new Date(Date.now() - 3600000 * 5),
      isPinned: true,
      tags: ['projects', 'earth-os']
    },
    {
      id: 'mock_3',
      type: 'short-term',
      category: 'timeline',
      content: 'Successfully resolved theme desynchronization architecture bug.',
      importance: 6,
      timestamp: new Date(Date.now() - 1800000),
      isPinned: false,
      tags: ['bugfix']
    }
  ]);

  const addMemory = (memory: Omit<import('../types').MemoryItem, 'id' | 'timestamp'>) => {
    const newItem: import('../types').MemoryItem = {
      ...memory,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMemories(prev => [newItem, ...prev]);
    // Would sync with IDB here in a production setting
  };

  const deleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const updateMemory = (id: string, updates: Partial<import('../types').MemoryItem>) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };


  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('earth_os_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.accentColor === 'Blue') parsed.accentColor = 'Logo';
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    idbSettings.get('user_settings').then(saved => {
      if (saved) {
        setSettings(prev => ({ ...prev, ...saved }));
      }
    }).catch(console.error);
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser && !currentUser.isAnonymous) {
        // Logged in with Google, fetch sessions from Firebase
        try {
          const fbSessions = await memoryApi.loadSessions();
          if (fbSessions.length > 0) {
            import('../lib/idbStorage').then(({ idbConversations }) => {
               idbConversations.getConversations().then(localSessions => {
                 // Merge sessions, preferring Firebase if same ID
                 const localMap = new Map(localSessions.map(s => [s.id, s]));
                 fbSessions.forEach(fb => {
                   localMap.set(fb.id, fb);
                   idbConversations.saveConversation(fb).catch(() => {});
                 });
                 const merged = Array.from(localMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
                 setSessions(merged);
               });
            });
          }
        } catch (e) {
          console.warn("Failed to load Firebase sessions:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        console.error("Error signing in with Google", error);
        throw error;
      }
    }
  };

  const loginAsGuest = async () => {
    try {
      const name = window.prompt("Enter your guest name:");
      const cred = await signInAnonymously(auth);
      if (name && name.trim().length > 0 && cred.user) {
        await updateProfile(cred.user, { displayName: name.trim() });
        setUser({ ...cred.user, displayName: name.trim() } as any);
      }
    } catch (error) {
      console.error("Error signing in as guest", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      import('../lib/idbStorage').then(({ idbConversations, idbChats }) => {
        idbConversations.clearAll().catch(console.error);
        idbChats.clearAll().catch(console.error);
      });
      setSessions([]);
      setMessages([]);
      createNewSession();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  useEffect(() => {
    localStorage.setItem('earth_os_settings', JSON.stringify(settings));
    idbSettings.set('user_settings', settings).catch(console.error);

    // Dark theme
    if (settings.useDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Font Size
    let px = '16px';
    if (settings.fontSize === 'Small') px = '14px';
    else if (settings.fontSize === 'Large') px = '18px';
    else if (settings.fontSize === 'Extra Large') px = '20px';
    document.documentElement.style.fontSize = px;

    // Color theme
    document.documentElement.setAttribute('data-theme', settings.accentColor);

    // Data saver
    if (settings.dataSaver) {
      document.documentElement.classList.add('data-saver');
    } else {
      document.documentElement.classList.remove('data-saver');
    }
  }, [settings]);

  useEffect(() => {
    if (!settings.autoTheme) return;

    let sensor: any = null;
    let mediaQuery: MediaQueryList | null = null;

    const handleLightChange = (illuminance: number) => {
      // 50 lux is often used as a threshold for dim vs bright rooms
      if (illuminance < 50 && !settings.useDarkTheme) {
        updateSetting('useDarkTheme', true);
      } else if (illuminance >= 50 && settings.useDarkTheme) {
        updateSetting('useDarkTheme', false);
      }
    };

    let cleanupMediaQuery: (() => void) | null = null;
    let sensorHandler: (() => void) | null = null;

    if ('AmbientLightSensor' in window) {
      try {
        sensor = new (window as any).AmbientLightSensor();
        sensorHandler = () => {
          handleLightChange(sensor.illuminance);
        };
        sensor.addEventListener('reading', sensorHandler);
        sensor.start();
      } catch (err) {
        console.warn('Ambient Light Sensor not available, falling back to prefers-color-scheme', err);
        // Fallback to media query if sensor permission denied
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
           updateSetting('useDarkTheme', e.matches);
        };
        mediaQuery.addEventListener('change', handleChange);
        cleanupMediaQuery = () => mediaQuery?.removeEventListener('change', handleChange);
        // Do not call updateSetting here continuously to avoid loop if useDarkTheme dependencies change
      }
    } else {
      // Fallback to prefers-color-scheme if sensor not supported
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
         updateSetting('useDarkTheme', e.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      cleanupMediaQuery = () => mediaQuery?.removeEventListener('change', handleChange);
    }

    return () => {
      if (sensor) {
        if (sensorHandler) sensor.removeEventListener('reading', sensorHandler);
        sensor.stop();
      }
      if (cleanupMediaQuery) cleanupMediaQuery();
    };
  }, [settings.autoTheme, settings.useDarkTheme]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  
  const [conversationId, setConversationId] = useState<string>(() => "default_convo");
  const [sessions, setSessions] = useState<any[]>([]);

  // Load sessions on mount and spawn a fresh new session
  useEffect(() => {
    import('../lib/idbStorage').then(({ idbConversations }) => {
      idbConversations.getConversations().then(loadedSessions => {
        // Clean up any empty "New Chat" sessions to prevent clutter
        const cleanedSessions = loadedSessions.filter(s => {
          if (s.title === 'New Chat') {
            idbConversations.deleteConversation(s.id).catch(() => {});
            memoryApi.deleteSession(s.id).catch(() => {});
            return false;
          }
          return true;
        });
        setSessions(cleanedSessions);
        
        // Start a fresh new chat every time the app opens
        const newId = Date.now().toString();
        setConversationId(newId);
        const newSession = {
          id: newId,
          title: 'New Chat',
          updatedAt: Date.now(),
          isPinned: false
        };
        setSessions(prev => [newSession, ...prev]);
        idbConversations.saveConversation(newSession).catch(console.error);
        memoryApi.saveSession(newSession).catch(console.error);
        setMessages([]);
      }).catch(console.error);
    });
  }, []);

  const createNewSession = () => {
    const newId = Date.now().toString();
    setConversationId(newId);
    setMessages([]);
    const newSession = {
      id: newId,
      title: 'New Chat',
      updatedAt: Date.now(),
      isPinned: false
    };
    setSessions(prev => [newSession, ...prev]);
    import('../lib/idbStorage').then(({ idbConversations }) => {
      idbConversations.saveConversation(newSession).catch(console.error);
    });
    memoryApi.saveSession(newSession).catch(console.error);
  };

  const loadSession = async (id: string) => {
    setConversationId(id);
    setMessages([]); // Will load naturally or we can load memoryApi
    try {
      const loadedMsgs = await memoryApi.loadConversation(id);
      if (loadedMsgs && loadedMsgs.length > 0) {
        const mappedMsgs = loadedMsgs.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
        }));
        setMessages(mappedMsgs);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = async (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (conversationId === id) {
        if (filtered.length > 0) {
          loadSession(filtered[0].id);
        } else {
          // Defer to avoid state update during render if possible
          setTimeout(() => createNewSession(), 0);
        }
      }
      return filtered;
    });
    import('../lib/idbStorage').then(({ idbConversations }) => {
      idbConversations.deleteConversation(id).catch(console.error);
    });
    memoryApi.deleteSession(id).catch(console.error);
  };

  const updateSession = async (id: string, updates: Partial<any>) => {
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, ...updates };
        import('../lib/idbStorage').then(({ idbConversations }) => {
          idbConversations.saveConversation(updated).catch(console.error);
        });
        memoryApi.saveSession(updated).catch(console.error);
        return updated;
      }
      return s;
    }));
  };

  useEffect(() => {
    // Initial health check
    const checkConnection = async () => {
      if (!navigator.onLine) {
        setConnectionStatus('Offline');
        return;
      }
      
      const connection = (navigator as any).connection;
      if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
        setConnectionStatus('Poor Connection');
      }
      
      try {
        const isOk = await earthApi.healthCheck();
        if (navigator.onLine) {
            const currentConnection = (navigator as any).connection;
            if (currentConnection && (currentConnection.effectiveType === 'slow-2g' || currentConnection.effectiveType === '2g')) {
                setConnectionStatus('Poor Connection');
            } else {
                setConnectionStatus(isOk ? 'Connected' : 'Offline');
            }
        }
      } catch (e) {
        setConnectionStatus('Offline');
      }
    };
    checkConnection();

    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setConnectionStatus('Offline');
    };

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', checkConnection);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Optional polling for health
    const interval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', checkConnection);
      }
    };
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  
  return (
    <AppContext.Provider value={{
      isSidebarOpen,
      toggleSidebar,
      activeView,
      setActiveView,
      messages,
      addMessage,
      updateMessage,
      setMessages,
      clearMessages,
      isStreaming,
      setIsStreaming,
      isVoiceMode,
      setIsVoiceMode,
      conversationId,
      connectionStatus,
      setConnectionStatus,
      currentModel,
      setCurrentModel,
      settings,
      updateSetting,
      isSearchOpen,
      setIsSearchOpen,
      isNotificationOpen,
      setIsNotificationOpen,
      isIncognito,
      setIsIncognito,
      isTyping,
      setIsTyping,
      user,
      authLoading,
      loginWithGoogle,
      loginAsGuest,
      logout,
      sessions,
      createNewSession,
      loadSession,
      deleteSession,
      updateSession,
      memories,
      addMemory,
      deleteMemory,
      updateMemory
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
