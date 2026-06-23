import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Search, Library, FolderOpen, Bot, 
  Dna, Code2, BrainCircuit, Settings, X, Zap, Check, Edit2, Pin, Trash2, FolderPlus, MoreHorizontal, Clock, Grid
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';
import { ViewState } from '../../types';
import { useHaptics } from '../../hooks/useHaptics';

interface NavItem {
  id: ViewState | string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'scheduled', label: 'Scheduled', icon: Clock },
  { id: 'apps', label: 'Apps', icon: Grid },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export function Sidebar() {
  const { 
    isSidebarOpen, toggleSidebar, activeView, setActiveView,
    sessions, createNewSession, loadSession, deleteSession, updateSession
  } = useApp();
  const haptic = useHaptics();

  const [contextMenu, setContextMenu] = useState<{ id: string, x: number, y: number, isPinned: boolean } | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef<boolean>(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const handlePointerDown = (e: React.PointerEvent, id: string, isPinned: boolean) => {
    if (editingId === id) return;
    const x = e.clientX;
    const y = e.clientY;
    isDragging.current = false;
    
    pressTimer.current = setTimeout(() => {
      if (isDragging.current) return;
      haptic(50);
      
      const menuWidth = 220;
      const menuHeight = 200;
      
      let finalX = x;
      let finalY = y;
      
      if (x + menuWidth > window.innerWidth) {
        finalX = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        finalY = window.innerHeight - menuHeight - 10;
      }
      
      setContextMenu({ id, x: finalX, y: finalY, isPinned });
    }, 500);
  };

  const handlePointerMove = () => {
    isDragging.current = true;
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handlePointerUp = (e: React.PointerEvent, id: string) => {
    if (editingId === id) return;
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
    if (!contextMenu && !isDragging.current) {
      // Tap detected
      loadSession(id);
      setActiveView('chat');
      toggleSidebar();
    }
  };

  const pinnedItems = sessions.filter(s => s.isPinned);
  const recentItems = sessions.filter(s => !s.isPinned && !s.isProject);

  const togglePin = () => {
    if (contextMenu) {
      updateSession(contextMenu.id, { isPinned: !contextMenu.isPinned });
      setContextMenu(null);
    }
  };

  const deleteChat = () => {
    if (contextMenu) {
      deleteSession(contextMenu.id);
      setContextMenu(null);
    }
  };

  const handleNewChat = () => {
    createNewSession();
    setActiveView('chat');
    toggleSidebar();
  };

  const handleRenameSubmit = (id: string) => {
    if (editingTitle.trim()) {
      updateSession(id, { title: editingTitle.trim() });
    }
    setEditingId(null);
  };


  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
        className={cn(
          "fixed top-0 left-0 h-[100dvh] w-[85%] max-w-[320px] z-50 flex flex-col hardware-accelerated",
          "bg-black border-r border-white/5"
        )}
      >
        <div className="p-4 pt-[max(env(safe-area-inset-top),24px)] flex justify-between items-center w-full shrink-0">
          <div className="flex items-center gap-3 pl-2">
             <span className="text-xl font-bold tracking-tight text-white">EARTH OS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-full bg-white/[0.08] border border-white/5 p-1 backdrop-blur-md">
              <button 
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                onClick={() => { setActiveView('search'); toggleSidebar(); }}
              >
                <Search size={18} />
              </button>
              <button 
                className="w-7 h-7 rounded-full bg-[#8E44AD] flex items-center justify-center text-[10px] font-bold text-white ml-1 transition-transform active:scale-95"
                onClick={() => { setActiveView('settings'); toggleSidebar(); }}
              >
                MB
              </button>
            </div>
            <button
              onClick={handleNewChat}
              className="p-2 rounded-full bg-white/[0.08] border border-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <Edit2 size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-6 pb-24">
          
          <div className="space-y-1">
            {navItems.map((item) => {
              return (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-colors text-white/80 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.1]"
                  onClick={() => { toggleSidebar(); }}
                >
                  <item.icon size={20} className="text-white/70" strokeWidth={1.5} />
                  <span className="font-medium text-[15px]">{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="px-2">
            <h3 className="text-xs font-semibold text-white/50 mb-2 px-1">Pinned</h3>
            <div className="space-y-0.5">
              {pinnedItems.map(item => (
                <div 
                  key={item.id}
                  className="relative touch-none"
                >
                  <button
                    onPointerDown={(e) => handlePointerDown(e, item.id, item.isPinned)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(e) => handlePointerUp(e, item.id)}
                    onPointerLeave={() => { if(pressTimer.current) clearTimeout(pressTimer.current); }}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-white/90 hover:bg-white/[0.06] active:bg-white/[0.1]"
                  >
                    <Pin size={16} className="text-white/50 shrink-0" strokeWidth={2} />
                    {editingId === item.id ? (
                      <input 
                        type="text" 
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRenameSubmit(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="bg-white/10 text-white rounded px-2 py-0.5 w-full outline-none focus:ring-1 focus:ring-white/30"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-sm truncate">{item.title}</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="px-2">
            <h3 className="text-xs font-semibold text-white/50 mb-2 px-1">Recents</h3>
            <div className="space-y-0.5">
              {recentItems.map(item => (
                <div 
                  key={item.id}
                  className="relative touch-none"
                >
                  <button
                    onPointerDown={(e) => handlePointerDown(e, item.id, item.isPinned)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(e) => handlePointerUp(e, item.id)}
                    onPointerLeave={() => { if(pressTimer.current) clearTimeout(pressTimer.current); }}
                    className="w-full flex items-center gap-3 px-2 py-3 rounded-lg transition-colors text-white/90 hover:bg-white/[0.06] active:bg-white/[0.1]"
                  >
                    {editingId === item.id ? (
                      <input 
                        type="text" 
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRenameSubmit(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="bg-white/10 text-white rounded px-2 py-0.5 w-full outline-none focus:ring-1 focus:ring-white/30"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-sm truncate">{item.title}</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </motion.aside>

      {/* Context Menu Modal */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ 
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 9999
            }}
            className="w-56 bg-black/90 border border-white/10 rounded-3xl shadow-2xl py-2 flex flex-col backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/90 w-full text-left transition-colors" onClick={togglePin}>
              <Pin size={18} className="text-white/70" />
              <span className="text-[15px]">{contextMenu.isPinned ? "Unpin" : "Pin"}</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/90 w-full text-left transition-colors" onClick={() => {
              const session = sessions.find(s => s.id === contextMenu.id);
              if (session) {
                setEditingId(contextMenu.id);
                setEditingTitle(session.title);
              }
              setContextMenu(null);
            }}>
              <Edit2 size={18} className="text-white/70" />
              <span className="text-[15px]">Rename</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/90 w-full text-left transition-colors" onClick={() => {
              // Add to project
              updateSession(contextMenu.id, { isProject: true });
              setContextMenu(null);
            }}>
              <FolderPlus size={18} className="text-white/70" />
              <span className="text-[15px]">Add to project <span className="float-right">{'>'}</span></span>
            </button>
            <button className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-red-400 w-full text-left transition-colors mt-1" onClick={deleteChat}>
              <Trash2 size={18} className="text-red-400" />
              <span className="text-[15px]">Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
