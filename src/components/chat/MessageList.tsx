import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Copy, Edit3, RotateCcw, PlayCircle, ThumbsUp, ThumbsDown, MessageCircle, Check, Trash2 } from 'lucide-react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import { useApp } from '../../context/AppContext';

import { RippleButton } from '../ui/RippleButton';

import { useHaptics } from '../../hooks/useHaptics';

function getSuggestedReplies(content: string) {
  const text = content.toLowerCase();
  if (text.includes('error') || text.includes('issue') || text.includes('fail')) {
    return ["How do I fix this?", "Explain the root cause", "Wait, why did this happen?"];
  }
  if (content.includes('```')) {
    return ["Can you explain how this works?", "Is there a more optimized way?", "Can you add comments to the code?"];
  }
  if (text.includes('features') || text.includes('example')) {
    return ["Can we build that?", "Show me another example", "Let's try it out"];
  }
  return ["Can you tell me more?", "Explain that in simpler terms", "Provide an example"];
}

export function MessageBubble({ message, isLatest }: { message: Message, isLatest?: boolean }) {
  const { settings } = useApp();
  const haptic = useHaptics();
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  const [showThumbsUpAnim, setShowThumbsUpAnim] = React.useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
  const [feedbackText, setFeedbackText] = React.useState('');
  
  const suggestions = useMemo(() => {
    return !isUser && isLatest && !message.isStreaming && !message.isError && message.content 
      ? getSuggestedReplies(message.content) 
      : [];
  }, [isUser, isLatest, message]);
  
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
            ? "bg-[#181818]/90 backdrop-blur-xl rounded-[28px] rounded-tr-[8px] text-white/95 border border-white/5 shadow-lg" 
            : "bg-transparent text-white/90"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className={cn("prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#1A1A1D] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl", message.isStreaming && message.content !== '' && "drop-shadow-[0_0_8px_rgba(0,184,217,0.5)]")}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                    <p className="text-sm sm:text-xs text-white/60 mb-4 sm:mb-3">Provide feedback to get a better response.</p>
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
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2"
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

      {/* Suggested Replies */}
      {suggestions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 mt-4 ml-2"
        >
          {suggestions.map((suggestion, idx) => (
            <RippleButton
              key={idx}
              onClick={() => window.dispatchEvent(new CustomEvent('earth:send', { detail: { text: suggestion } }))}
              className="px-3 py-1.5 text-[13px] bg-white/[0.05] border border-white/10 rounded-[20px] text-white/80 hover:text-white hover:bg-white/[0.1] hover:border-white/20 transition-ultra flex items-center gap-1.5 shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:scale-[1.02] active:scale-[0.98] hardware-accelerated"
            >
              <MessageCircle size={12} className="text-accent-400" />
              {suggestion}
            </RippleButton>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function ActionButton({ icon: Icon, title, onClick, className }: { icon: any, title: string, onClick?: () => void, className?: string }) {
  return (
    <button 
      title={title}
      onClick={onClick}
      className={cn("p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-ultra hover:scale-110 active:scale-95 hardware-accelerated shrink-0", className)}
    >
      <Icon size={16} />
    </button>
  );
}

export function MessageList() {
  const { messages } = useApp();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 pt-20 pb-4 flex flex-col">
      {messages.map((msg, index) => (
        <MessageBubble key={msg.id} message={msg} isLatest={index === messages.length - 1} />
      ))}
      <div ref={bottomRef} className="h-[160px] pb-[env(safe-area-inset-bottom)] shrink-0 w-full" />
    </div>
  );
}
