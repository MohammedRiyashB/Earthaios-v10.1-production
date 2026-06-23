import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, ArrowUp, Wifi, WifiOff, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { earthApi } from '../../services/earthApi';
import { memoryApi } from '../../services/memory';
import { useHaptics } from '../../hooks/useHaptics';

export function ChatInput() {
  const { updateSession, addMessage, updateMessage, messages, setMessages, conversationId, setIsStreaming, isStreaming, isVoiceMode, setIsVoiceMode, connectionStatus, setConnectionStatus, settings } = useApp();
  const haptic = useHaptics();
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [interimResult, setInterimResult] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceMode(true);
        setInterimResult('');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        setInterimResult(interim);
        
        if (finalTranscript) {
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsVoiceMode(false);
        setInterimResult('');
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access in your browser to use voice input.');
        }
      };

      recognition.onend = () => {
        setIsVoiceMode(false);
        setInterimResult('');
      };

      recognitionRef.current = recognition;
    }
  }, [setIsVoiceMode]);

  const toggleVoiceMode = () => {
    if (!settings.voiceEnabled) {
      alert("Voice input is disabled in Settings.");
      haptic([10, 50, 10]);
      return;
    }
    
    if (!recognitionRef.current) {
      alert("Voice input is not supported in your browser.");
      haptic([10, 50, 10]);
      return;
    }

    haptic(10);
    if (isVoiceMode) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
      textareaRef.current.style.overflowY = scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [input, interimResult]);

  useEffect(() => {
    const handleRetry = (e: any) => {
      // Find the user message right before the failed response
      const failedId = e.detail?.id;
      if (!failedId || isStreaming) return;
      
      const failedIndex = messages.findIndex(m => m.id === failedId);
      if (failedIndex > 0 && messages[failedIndex - 1].role === 'user') {
        const userMsg = messages[failedIndex - 1];
        // Execute the send logic for this userMsg silently
        const runRetry = async () => {
          setIsStreaming(true);
          setConnectionStatus('Thinking...');
          const responseId = failedId;
          updateMessage(responseId, '', { isError: false, isStreaming: true });

          try {
            const apiMessages: { role: 'user' | 'assistant' | 'system', content: string }[] = messages.slice(0, failedIndex).map(m => ({
              role: m.role,
              content: m.content
            }));
      
            // Network Optimization: Send brief prompt if bandwidth is low or dataSaver is on
            if (settings.dataSaver || connectionStatus === 'Poor Connection' || ((navigator as any).connection?.effectiveType && ['2g', 'slow-2g'].includes((navigator as any).connection.effectiveType))) {
              apiMessages.push({
                role: 'system',
                content: 'The user is on a very slow internet connection or data saver is on. Provide a highly concise, minimal bandwidth response.'
              });
            }

            const stream = earthApi.streamMessage(apiMessages);
            let fullResponse = '';
            
            for await (const chunk of stream) {
              if (fullResponse === '') setConnectionStatus('Streaming...');
              fullResponse += chunk;
              updateMessage(responseId, fullResponse, { isStreaming: true });
            }
            
            updateMessage(responseId, fullResponse, { isStreaming: false });
            setConnectionStatus('Connected');
      
            memoryApi.saveMessage({
              id: responseId,
              conversationId,
              role: 'assistant',
              content: fullResponse,
              timestamp: new Date()
            });
          } catch (err: any) {
             updateMessage(responseId, `EARTH AI temporarily unavailable. ${err.message}`, { isStreaming: false, isError: true });
             setConnectionStatus('Offline');
          } finally {
             setIsStreaming(false);
          }
        };
        runRetry();
      }
    };
    
    // Add custom event listener for sending auto-replies/suggestions
    const handleRemoteSend = (e: any) => {
      const text = e.detail?.text;
      if (text && !isStreaming) {
         setInput(text);
         // Small timeout to allow state to update before sending
         setTimeout(() => {
            const finalInput = text;
            if (messages.length === 0) {
              updateSession(conversationId, { title: finalInput.substring(0, 50), updatedAt: Date.now() });
            } else {
              updateSession(conversationId, { updatedAt: Date.now() });
            }
            
            const userMsg = {
              id: Date.now().toString(),
              role: 'user' as const,
              content: finalInput,
              timestamp: new Date()
            };

            addMessage(userMsg);
            memoryApi.saveMessage({
              ...userMsg,
              conversationId
            });
            
            setInput('');
            setInterimResult('');
            setIsStreaming(true);
            setConnectionStatus('Thinking...');

            const responseId = (Date.now() + 1).toString();
            addMessage({
              id: responseId,
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              isStreaming: true
            });

            const callApi = async () => {
              try {
                const apiMessages: { role: 'user' | 'assistant' | 'system', content: string }[] = [...messages, userMsg].map(m => ({
                  role: m.role,
                  content: m.content
                }));
          
                // Network Optimization: Send brief prompt if bandwidth is low or dataSaver is on
                if (settings.dataSaver || connectionStatus === 'Poor Connection' || ((navigator as any).connection?.effectiveType && ['2g', 'slow-2g'].includes((navigator as any).connection.effectiveType))) {
                  apiMessages.push({
                    role: 'system',
                    content: 'The user is on a very slow internet connection or data saver is on. Provide a highly concise, minimal bandwidth response.'
                  });
                }

                const stream = earthApi.streamMessage(apiMessages);
                let fullResponse = '';
                
                for await (const chunk of stream) {
                  if (fullResponse === '') setConnectionStatus('Streaming...');
                  fullResponse += chunk;
                  updateMessage(responseId, fullResponse, { isStreaming: true });
                }
                
                updateMessage(responseId, fullResponse, { isStreaming: false });
                setConnectionStatus('Connected');
          
                memoryApi.saveMessage({
                  id: responseId,
                  conversationId,
                  role: 'assistant',
                  content: fullResponse,
                  timestamp: new Date()
                });
          
              } catch (err: any) {
                updateMessage(responseId, `EARTH AI temporarily unavailable. ${err.message}`, { isStreaming: false, isError: true });
                setConnectionStatus('Offline');
              } finally {
                setIsStreaming(false);
              }
            };
            
            callApi();
         }, 50);
      }
    };

    const handleEdit = (e: any) => {
      const id = e.detail?.id;
      const content = e.detail?.content;
      if (id && content && !isStreaming) {
        const index = messages.findIndex(m => m.id === id);
        if (index !== -1) {
          // Keep messages up to the one before this edited message
          setMessages(messages.slice(0, index));
          // Put text in the input
          setInput(content);
          // Focus input
          setTimeout(() => {
            textareaRef.current?.focus();
          }, 0);
        }
      }
    };

    const handleDelete = (e: any) => {
      const id = e.detail?.id;
      if (id && !isStreaming) {
         setMessages(messages.filter(m => m.id !== id));
         memoryApi.deleteMessage(conversationId, id).catch(console.error);
      }
    };
    
    window.addEventListener('earth:retry', handleRetry);
    window.addEventListener('earth:send', handleRemoteSend);
    window.addEventListener('earth:edit', handleEdit);
    window.addEventListener('earth:delete', handleDelete);
    return () => {
      window.removeEventListener('earth:retry', handleRetry);
      window.removeEventListener('earth:send', handleRemoteSend);
      window.removeEventListener('earth:edit', handleEdit);
      window.removeEventListener('earth:delete', handleDelete);
    };
  }, [messages, isStreaming, conversationId, setInput, addMessage, updateMessage, setIsStreaming, setConnectionStatus, setInterimResult, setMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
      haptic(15);
    }
  };

  const handleSend = async () => {
    let finalInput = input + (interimResult ? (input ? ' ' : '') + interimResult : '');
    
    if (attachment) {
      finalInput = `[Attached file: ${attachment.name}]\n` + finalInput;
    }

    if (!finalInput.trim() || isStreaming) return;
    
    if (connectionStatus === 'Offline') {
      alert("You are currently offline. EARTH OS cannot transmit to the satellite network.");
      haptic([10, 50, 10]);
      return;
    }
    
    haptic(15);
    
    if (messages.length === 0) {
      updateSession(conversationId, { title: finalInput.substring(0, 50) + (finalInput.length > 50 ? '...' : ''), updatedAt: Date.now() });
    } else {
      updateSession(conversationId, { updatedAt: Date.now() });
    }

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: finalInput.trim(),
      timestamp: new Date()
    };

    addMessage(userMsg);
    memoryApi.saveMessage({
      ...userMsg,
      conversationId
    });
    
    setInput('');
    setAttachment(null);
    setInterimResult('');
    setIsStreaming(true);
    setConnectionStatus('Thinking...');

    const responseId = (Date.now() + 1).toString();
    addMessage({
      id: responseId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    });

    try {
      const apiMessages: { role: 'user' | 'assistant' | 'system', content: string }[] = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      // Network Optimization: Send brief prompt if bandwidth is low or dataSaver is on
      if (settings.dataSaver || connectionStatus === 'Poor Connection' || ((navigator as any).connection?.effectiveType && ['2g', 'slow-2g'].includes((navigator as any).connection.effectiveType))) {
        apiMessages.push({
          role: 'system',
          content: 'The user is on a very slow internet connection or data saver is on. Provide a highly concise, minimal bandwidth response.'
        });
      }

      const stream = earthApi.streamMessage(apiMessages);
      let fullResponse = '';
      
      for await (const chunk of stream) {
        if (fullResponse === '') setConnectionStatus('Streaming...');
        fullResponse += chunk;
        updateMessage(responseId, fullResponse, { isStreaming: true });
      }
      
      updateMessage(responseId, fullResponse, { isStreaming: false });
      setConnectionStatus('Connected');

      memoryApi.saveMessage({
        id: responseId,
        conversationId,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      });

    } catch (e: any) {
      updateMessage(responseId, `EARTH AI temporarily unavailable. ${e.message}`, { isStreaming: false, isError: true });
      setConnectionStatus('Offline');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="w-full relative z-20 flex flex-col items-center">
      <AnimatePresence>
        {connectionStatus === 'Offline' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-300 text-[11px] uppercase tracking-wider font-semibold px-4 py-1.5 rounded-full border border-red-500/30 flex items-center gap-2 backdrop-blur-md whitespace-nowrap z-30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          >
            <WifiOff size={14} /> 
            Network Disconnected - Offline Mode
          </motion.div>
        )}
        
        {(settings.dataSaver || connectionStatus === 'Poor Connection') && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-500/20 text-yellow-300 text-[11px] uppercase tracking-wider font-semibold px-4 py-1.5 rounded-full border border-yellow-500/30 flex items-center gap-2 backdrop-blur-md whitespace-nowrap z-30 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
          >
            <Wifi size={14} /> 
            {settings.dataSaver ? 'Data Saver Active' : 'Low Bandwidth - Network Optimization Active'}
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className={cn(
          "relative flex items-center gap-2 px-2 py-1.5 w-full max-w-[95%] md:max-w-[700px] hardware-accelerated",
          "bg-[#181818]/92 border border-white/5 backdrop-blur-[30px] rounded-[32px] min-h-[56px]",
          "transition-ultra"
        )}
      >
        <button 
          onClick={() => {
            haptic(10);
            fileInputRef.current?.click();
          }}
          className="p-3 text-[#9CA3AF] hover:text-white transition-colors shrink-0 rounded-full hover:bg-white/5 active:scale-95 flex items-center justify-center"
        >
          <Paperclip size={20} className="stroke-[1.5]" />
        </button>

        <div className="flex-1 flex flex-col justify-center min-h-[40px] overflow-hidden">
          {attachment && (
            <div className="flex items-center gap-2 bg-white/10 inline-flex w-fit px-2 py-1 rounded-full mb-1 mt-1 shadow-sm border border-white/5">
              <Paperclip size={12} className="text-white/60" />
              <span className="text-xs text-white/80 max-w-[150px] truncate">{attachment.name}</span>
              <button 
                onClick={() => setAttachment(null)}
                className="text-white/40 hover:text-white/80 p-0.5 rounded-full hover:bg-white/10 transition-colors"
                title="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input + (interimResult ? (input ? ' ' : '') + interimResult : '')}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message EARTHAI..."
            className="w-full bg-transparent text-white placeholder-[#9CA3AF] resize-none outline-none py-2 max-h-[150px] font-medium text-[16px] leading-relaxed transition-ultra hardware-accelerated flex items-center"
            rows={1}
            disabled={isStreaming}
          />
        </div>

        <div className="flex items-center shrink-0 pr-1">
          <AnimatePresence mode="popLayout">
            {isStreaming ? (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="w-12 h-12 flex items-center justify-center shrink-0"
              >
                <div className="flex gap-1 items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" />
                </div>
              </motion.div>
            ) : !(input.trim() || interimResult.trim()) ? (
              <motion.button 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={toggleVoiceMode}
                className={cn(
                  "w-12 h-12 rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0 relative",
                  isVoiceMode ? "text-accent-400 bg-white/5" : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
                )}
              >
                {isVoiceMode && (
                  <span className="absolute inset-0 rounded-full bg-accent-500/20 animate-ping opacity-75"></span>
                )}
                <Mic size={22} className="relative z-10 stroke-[2]" />
              </motion.button>
            ) : (
              <motion.button 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={handleSend}
                className="w-10 h-10 bg-white text-black hover:bg-gray-200 transition-all rounded-full hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 mr-1"
              >
                <ArrowUp size={20} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <div className="text-center mt-2 pb-1 opacity-50 scale-90 w-full">
        <span className="text-[10px] text-[#555] tracking-wide font-medium px-2 block truncate">
          <a href="https://www.instagram.com/bmrinternational.inc?igsh=cW5tN2liZnNuNnFk" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">BMR.inc</a>
          {' • '}
          <a href="https://www.instagram.com/earthai.space?igsh=bDV3Y2JtNHMydXpm" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">Earthai</a>
          {' • '}
          <a href="https://www.instagram.com/__rexzz_?igsh=dmZ0MWR5NGt2azBn" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">2026</a>
        </span>
      </div>
    </div>
  );
}
