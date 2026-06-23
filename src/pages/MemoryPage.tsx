import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Brain, Search, Clock, Zap, Target, Star, Trash2, Pin, Plus, UserCircle, Save, Database } from 'lucide-react';
import { MemoryItem } from '../types';

export function MemoryPage() {
  const { memories, addMemory, deleteMemory, updateMemory } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'short-term' | 'long-term' | 'user-profile'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredMemories = memories.filter(m => {
    if (activeTab !== 'all' && m.type !== activeTab && m.category !== activeTab) {
      if (activeTab === 'long-term' && m.type === 'long-term' && m.category !== 'user-profile') return true;
      if (activeTab === 'user-profile' && m.category === 'user-profile') return true;
      if (activeTab === 'short-term' && m.type === 'short-term') return true;
      return false;
    }
    if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .sort((a, b) => (b.isPinned === a.isPinned ? 0 : b.isPinned ? 1 : -1));

  return (
    <div 
      className="flex-1 overflow-auto bg-white dark:bg-black/80 relative"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 90%, transparent 100%)'
      }}
    >
      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8 mt-16 pb-24">
        
        <header className="space-y-2">
          <div className="flex items-center gap-3 text-accent-500 dark:text-accent-400">
            <Brain size={28} />
            <h1 className="text-3xl font-medium tracking-tight text-gray-900 dark:text-white">Memory Matrix</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Manage EARTH AI Core Intelligence, Context, and Preferences.
          </p>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Database} label="Total Memories" value={memories.length} />
          <StatCard icon={Zap} label="Short-Term" value={memories.filter(m => m.type === 'short-term').length} />
          <StatCard icon={Save} label="Long-Term" value={memories.filter(m => m.type === 'long-term').length} />
          <StatCard icon={UserCircle} label="User Profile" value={memories.filter(m => m.category === 'user-profile').length} />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto">
            {(['all', 'short-term', 'long-term', 'user-profile'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none capitalize px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {tab === 'user-profile' ? 'Profile' : tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory..."
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
            />
          </div>
        </div>

        {/* Memory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMemories.map(memory => (
              <motion.div
                key={memory.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-5 rounded-2xl border transition-all ${memory.isPinned ? 'bg-accent-50 dark:bg-accent-500/5 border-accent-200 dark:border-accent-500/20 shadow-sm' : 'bg-white dark:bg-[#181818] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
                      memory.type === 'long-term' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                    }`}>
                      {memory.type.replace('-', ' ')}
                    </span>
                    {memory.category === 'user-profile' && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1">
                        <UserCircle size={12} /> Profile
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                     <button
                        onClick={() => updateMemory(memory.id, { isPinned: !memory.isPinned })}
                        className={`p-1.5 rounded-full transition-colors ${memory.isPinned ? 'text-accent-500 dark:text-accent-400 bg-accent-100 dark:bg-accent-500/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                     >
                       <Pin size={16} />
                     </button>
                     <button 
                        onClick={() => deleteMemory(memory.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                     >
                        <Trash2 size={16} />
                     </button>
                  </div>
                </div>

                <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-[15px]">
                  {memory.content}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    {memory.tags.map(tag => (
                      <span key={tag} className="text-xs text-gray-500 dark:text-gray-400 before:content-['#']">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                     <span className="flex items-center gap-1" title="Importance Score"><Star size={12} className={memory.importance > 7 ? 'text-yellow-500 fill-yellow-500' : ''}/> {memory.importance}/10</span>
                     <span className="flex items-center gap-1"><Clock size={12} /> {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(memory.timestamp)}</span>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
          {filteredMemories.length === 0 && (
             <div className="col-span-1 md:col-span-2 text-center py-20 text-gray-500 dark:text-gray-400">
               <Brain size={48} className="mx-auto mb-4 opacity-20" />
               <p>No memories found matching your criteria.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: number }) {
  return (
    <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2 relative">
       <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-white/80 shadow-sm">
         <Icon size={18} />
       </div>
       <div>
         <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
         <div className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">{label}</div>
       </div>
    </div>
  );
}
