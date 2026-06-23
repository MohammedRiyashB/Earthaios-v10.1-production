import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ViewState, Message } from '../types';

import { earthApi } from '../services/earthApi';
import { memoryApi, StoredMessage } from '../services/memory';
import { idbSettings } from '../lib/idbStorage';

import { auth, googleProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, User } from '../lib/firebase';

export type ConnectionStatus = 'Offline' | 'Connected' | 'Thinking...' | 'Streaming...' | 'Poor Connection';

export interface AppSettings {
  useDarkTheme: boolean;
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
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Connected');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const loginAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in as guest", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
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

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  
  const [conversationId, setConversationId] = useState<string>(() => "default_convo");
  const [sessions, setSessions] = useState<any[]>([]);

  // Load sessions on mount
  useEffect(() => {
    import('../lib/idbStorage').then(({ idbConversations }) => {
      idbConversations.getConversations().then(loadedSessions => {
        setSessions(loadedSessions);
        if (loadedSessions.length > 0) {
          const latest = loadedSessions[0];
          setConversationId(latest.id);
          // And we should load messages for this latest session!
          memoryApi.loadConversation(latest.id).then(loadedMsgs => {
            if (loadedMsgs && loadedMsgs.length > 0) {
              const mappedMsgs = loadedMsgs.map(m => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
              }));
              setMessages(mappedMsgs);
            } else {
              setMessages([{
                id: 'welcome_1',
                role: 'assistant',
                content: 'System initialized. CORE ENGINE V1 is online. Founder protocols verified. How may I assist you today, sir?',
                timestamp: new Date()
              }]);
            }
          }).catch(console.error);
        } else {
          // If no sessions, let's create one natively
          const newId = Date.now().toString();
          setConversationId(newId);
          const newSession = {
            id: newId,
            title: 'New Chat',
            updatedAt: Date.now(),
            isPinned: false
          };
          setSessions([newSession]);
          idbConversations.saveConversation(newSession).catch(console.error);
          setMessages([{
            id: 'welcome_1',
            role: 'assistant',
            content: 'System initialized. CORE ENGINE V1 is online. Founder protocols verified. How may I assist you today, sir?',
            timestamp: new Date()
          }]);
        }
      }).catch(console.error);
    });
  }, []);

  const createNewSession = () => {
    const newId = Date.now().toString();
    setConversationId(newId);
    setMessages([{
      id: 'welcome_1',
      role: 'assistant',
      content: 'System initialized. CORE ENGINE V1 is online. Founder protocols verified. How may I assist you today, sir?',
      timestamp: new Date()
    }]);
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
        setMessages([{
          id: 'welcome_1',
          role: 'assistant',
          content: 'System initialized. CORE ENGINE V1 is online. Founder protocols verified. How may I assist you today, sir?',
          timestamp: new Date()
        }]);
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
  };

  const updateSession = async (id: string, updates: Partial<any>) => {
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, ...updates };
        import('../lib/idbStorage').then(({ idbConversations }) => {
          idbConversations.saveConversation(updated).catch(console.error);
        });
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

    // Load initial memory
    const loadConversationMemory = async () => {
      const pastMessages = await memoryApi.loadConversation('default_convo');
      if (pastMessages && pastMessages.length > 0) {
        setMessages(pastMessages.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
        })));
      } else {
        // Welcome message for new session
        const welcomeMsg: Message = {
          id: 'welcome_1',
          role: 'assistant',
          content: 'System initialized. CORE ENGINE V1 is online. Founder protocols verified. How may I assist you today, sir?',
          timestamp: new Date()
        };
        setMessages([welcomeMsg]);
      }
    };
    loadConversationMemory();

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
  
  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const updateMessage = (id: string, content: string | ((prev: string) => string), extras?: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id 
        ? { 
            ...msg, 
            content: typeof content === 'function' ? content(msg.content) : content,
            ...extras
          }
        : msg
    ));
  };

  const clearMessages = () => setMessages([]);

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
      settings,
      updateSetting,
      isSearchOpen,
      setIsSearchOpen,
      isNotificationOpen,
      setIsNotificationOpen,
      user,
      authLoading,
      loginWithGoogle,
      loginAsGuest,
      logout,
      sessions,
      createNewSession,
      loadSession,
      deleteSession,
      updateSession
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
