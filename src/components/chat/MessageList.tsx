import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import { Copy, Edit3, RotateCcw, PlayCircle, ThumbsUp, ThumbsDown, MessageCircle, Check, Trash2 } from 'lucide-react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

import { RippleButton } from '../ui/RippleButton';

import { useHaptics } from '../../hooks/useHaptics';

export function MessageBubble({ message, isLatest }: { message: Message, isLatest?: boolean }) {
  const { settings, isIncognito } = useApp();
  const haptic = useHaptics();
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  const [showThumbsUpAnim, setShowThumbsUpAnim] = React.useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
  const [feedbackText, setFeedbackText] = React.useState('');
  
  const handlePlayTTS = () => {
    if (!settings.soundEffects) {
      alert("Sound Effects are disabled in settings.");
      return;
    }
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      
      if (settings.speakingRate === 'Slow') utterance.rate = 0.8;
      else if (settings.speakingRate === 'Fast') utterance.rate = 1.2;
      else utterance.rate = 1.0;
      
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("TTS not supported in your browser");
    }
  };

  const handleFeedbackSubmit = () => {
    if (feedbackText.trim()) {
      window.dispatchEvent(new CustomEvent('earth:send', { 
        detail: { text: `Regarding your previous response, here is my feedback to help you improve and provide a better response: ${feedbackText}` } 
      }));
    } else {
      // If empty, just ask for a better response
      window.dispatchEvent(new CustomEvent('earth:retry', { detail: { id: message.id } }));
    }
    setShowFeedbackModal(false);
    setFeedbackText('');
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full mb-8 group flex-col",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div className={cn(
        "max-w-[85%] md:max-w-[75%] flex flex-col gap-2",
        isUser ? "items-end" : "items-start"
      )}>
        
        <div className={cn(
          "px-5 py-4 text-[16px] leading-relaxed",
          isUser 
            ? "bg-[#F2F4F8] text-[#111827] dark:bg-[#181818]/90 dark:backdrop-blur-xl rounded-[28px] rounded-tr-[8px] dark:text-white/95 border border-black/5 dark:border-white/5 shadow-md dark:shadow-lg" 
            : "bg-transparent text-[#111827] dark:text-white/90"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className={cn("prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0", message.isStreaming && message.content !== '' && "drop-shadow-[0_0_8px_rgba(0,184,217,0.5)]")}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    
                    if (!inline && match && match[1] === 'chart' && !message.isStreaming) {
                      try {
                        const chartData = JSON.parse(String(children).replace(/\n$/, ''));
                        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
                        
                        return (
                          <div className="w-full h-[300px] mt-4 mb-4 bg-white dark:bg-[#1A1A1D] p-4 rounded-xl border border-black/5 dark:border-white/5">
                            <ResponsiveContainer width="100%" height="100%">
                              {chartData.type === 'bar' ? (
                                <BarChart data={chartData.data}>
                                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                  <XAxis dataKey={Object.keys(chartData.data[0] || {})[0]} stroke="#888" fontSize={12} />
                                  <YAxis stroke="#888" fontSize={12} />
                                  <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }} />
                                  <Bar dataKey={Object.keys(chartData.data[0] || {})[1] || 'value'} fill="#00B8D9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              ) : chartData.type === 'line' ? (
                                <LineChart data={chartData.data}>
                                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                  <XAxis dataKey={Object.keys(chartData.data[0] || {})[0]} stroke="#888" fontSize={12} />
                                  <YAxis stroke="#888" fontSize={12} />
                                  <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }} />
                                  <Line type="monotone" dataKey={Object.keys(chartData.data[0] || {})[1] || 'value'} stroke="#00B8D9" strokeWidth={2} />
                                </LineChart>
                              ) : chartData.type === 'pie' ? (
                                <PieChart>
                                  <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }} />
                                  <Pie data={chartData.data} dataKey={Object.keys(chartData.data[0] || {})[1] || 'value'} nameKey={Object.keys(chartData.data[0] || {})[0] || 'name'} outerRadius={100} fill="#8884d8">
                                    {chartData.data.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              ) : (
                                <div className="flex items-center justify-center h-full text-red-500">Unsupported chart type</div>
                              )}
                            </ResponsiveContainer>
                          </div>
                        );
                      } catch (e) {
                         // Fallback to json if error
                      }
                    }

                    return !inline && match ? (
                      <div className="relative group max-w-full overflow-hidden rounded-xl border border-white/10 mt-4 mb-4 bg-[#1E1E1E]">
                        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
                          <span className="text-xs font-medium text-white/50 uppercase tracking-widest">{match[1]}</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                            className="text-white/40 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <SyntaxHighlighter
                          {...props}
                          children={String(children).replace(/\n$/, '')}
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            background: 'transparent',
                            padding: '1rem',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    ) : (
                      <code {...props} className={cn("bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-[0.85em]", className)}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                 {message.content}
              </ReactMarkdown>
              {message.isStreaming && message.content === '' && (
                 <div className="flex gap-1.5 items-center py-1">
                   <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0 }} className="w-1.5 h-1.5 bg-accent-400 rounded-full" />
                   <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-1.5 h-1.5 bg-accent-400 rounded-full" />
                   <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-1.5 h-1.5 bg-accent-400 rounded-full" />
                 </div>
              )}
              {message.isStreaming && message.content !== '' && (
                <motion.span 
                  animate={{ opacity: [0, 1, 0] }} 
                  transition={{ duration: 0.8, repeat: Infinity }} 
                  className="inline-block w-2 h-4 ml-1 bg-accent-400/80 align-middle shadow-[0_0_8px_#00B8D9]"
                />
              )}
            </div>
          )}
        </div>

        {/* Action Buttons (visible on hover) */}
        {!isUser && message.content.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
          >
            <ActionButton 
              icon={PlayCircle} 
              title={isPlaying ? "Stop" : "Read Aloud (TTS)"} 
              onClick={handlePlayTTS} 
              className={isPlaying ? "text-accent-400 hover:text-accent-300" : ""}
            />
            <ActionButton 
              icon={isCopied ? Check : Copy} 
              title={isCopied ? "Copied!" : "Copy"} 
              className={isCopied ? "text-green-400 hover:text-green-300" : ""}
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }} 
            />
            <ActionButton 
              icon={RotateCcw} 
              title="Regenerate" 
              className={message.isError ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : ""}
              onClick={() => {
                haptic(15);
                window.dispatchEvent(new CustomEvent('earth:retry', { detail: { id: message.id } }));
              }} 
            />
            <div className="relative">
              <ActionButton 
                icon={ThumbsUp} 
                title="Good Response" 
                onClick={() => {
                  haptic(10);
                  setShowThumbsUpAnim(true);
                  setTimeout(() => setShowThumbsUpAnim(false), 2000);
                }}
              />
              {showThumbsUpAnim && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: 1, y: -20, scale: 1.2 }}
                  exit={{ opacity: 0, y: -40, scale: 1 }}
                  className="absolute left-1/2 -top-4 -translate-x-1/2 text-accent-400 pointer-events-none"
                >
                  <ThumbsUp size={24} className="fill-accent-400" />
                </motion.div>
              )}
            </div>
            <div className="relative">
              <ActionButton 
                icon={ThumbsDown} 
                title="Bad Response" 
                onClick={() => { haptic(10); setShowFeedbackModal(true); }}
              />
              {showFeedbackModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:relative sm:inset-auto sm:z-50 sm:p-0 sm:bg-transparent sm:backdrop-blur-none">
                  <div className="w-full max-w-[300px] p-5 bg-[#1A1A1D] border border-white/10 rounded-2xl shadow-2xl sm:absolute sm:top-10 sm:left-0 sm:w-72 sm:p-3 sm:rounded-xl ml-0">
                    <h4 className="text-base sm:text-sm font-semibold mb-2">Help improve the AI</h4>
                    <p className="text-sm sm:text-xs text-gray-500 dark:text-white/60 mb-4 sm:mb-3">Provide feedback to get a better response.</p>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="What was wrong?"
                      className="w-full text-base sm:text-sm bg-black/40 border border-white/10 rounded-lg p-3 sm:p-2 resize-none outline-none focus:border-accent-400 mb-4 sm:mb-3"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2 text-sm sm:text-xs">
                      <button 
                        onClick={() => setShowFeedbackModal(false)}
                        className="px-4 py-2 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleFeedbackSubmit}
                        className="px-4 py-2 sm:px-3 sm:py-1.5 bg-accent-500 hover:bg-accent-600 rounded-lg transition text-white"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <ActionButton 
              icon={Trash2} 
              title="Remove"
              className="hover:text-red-400 hover:bg-red-500/10"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('earth:delete', { detail: { id: message.id } }));
              }}
            />
          </motion.div>
        )}
        
        {isUser && (
           <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mr-2 mt-3"
          >
            <ActionButton 
              icon={Edit3} 
              title="Edit"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('earth:edit', { detail: { id: message.id, content: message.content } }));
              }}
            />
            <ActionButton 
              icon={Trash2} 
              title="Remove"
              className="hover:text-red-400 hover:bg-red-500/10"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('earth:delete', { detail: { id: message.id } }));
              }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function ActionButton({ icon: Icon, title, onClick, className }: { icon: any, title: string, onClick?: () => void, className?: string }) {
  return (
    <button 
      title={title}
      onClick={onClick}
      className={cn("p-1.5 text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-ultra hover:scale-110 active:scale-95 hardware-accelerated shrink-0", className)}
    >
      <Icon size={16} />
    </button>
  );
}

import { getGreeting } from '../../lib/greetings';

export function EmptyGreeting() {
  const { user, isTyping } = useApp();
  const [greeting, setGreeting] = React.useState('');

  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  if (isTyping) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-center pointer-events-auto w-full px-4"
    >
      <div 
        className="text-gray-800 dark:text-gray-100 text-3xl sm:text-4xl font-medium tracking-tight mb-2"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {greeting}
      </div>
      {user?.displayName ? (
         <div className="text-gray-500 dark:text-gray-400 text-lg font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
           {user.displayName}
         </div>
      ) : null}
    </motion.div>
  );
}

export function MessageList() {
  const { messages, isIncognito, isTyping } = useApp();

  if (messages.length === 0) {
    if (isIncognito) {
      if (isTyping) return null;
      
      return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 z-10 relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            className="w-full max-w-sm mx-auto text-center flex flex-col items-center"
          >
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 mb-6 text-gray-500">
              <path d="M12 10V2L6.5 10H12ZM12 10V2L17.5 10H12ZM2 10H22M6 14C4.89543 14 4 14.8954 4 16C4 17.1046 4.89543 18 6 18C7.10457 18 8 17.1046 8 16C8 14.8954 7.10457 14 6 14ZM18 14C16.8954 14 16 14.8954 16 16C16 17.1046 16.8954 18 18 18C19.1046 18 20 17.1046 20 16C20 14.8954 19.1046 14 18 14ZM8 16H16" />
            </svg>
            <p className="text-gray-400 dark:text-white/60 leading-relaxed font-medium text-[14px]" style={{ fontFamily: 'var(--font-mono)' }}>
              This chat won't appear in your chat history, and won't be used to train our models. For safety, we may keep a copy of this chat for up to 30 days.
            </p>
          </motion.div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 pt-20 pb-4 flex flex-col h-full">
      {messages.map((msg, index) => (
        <MessageBubble key={msg.id} message={msg} isLatest={index === messages.length - 1} />
      ))}
      <div className="h-[160px] pb-[env(safe-area-inset-bottom)] shrink-0 w-full" />
    </div>
  );
}
