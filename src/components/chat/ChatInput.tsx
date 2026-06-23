import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, ArrowUp, Wifi, WifiOff, X, Square, Globe, Plus, AudioLines } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { earthApi } from '../../services/earthApi';
import { memoryApi } from '../../services/memory';
import { useHaptics } from '../../hooks/useHaptics';

export function ChatInput() {
  const { updateSession, addMessage, updateMessage, messages, setMessages, conversationId, setIsStreaming, isStreaming, isVoiceMode, setIsVoiceMode, connectionStatus, setConnectionStatus, settings, currentModel, isIncognito, setIsTyping } = useApp();
  const haptic = useHaptics();
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [interimResult, setInterimResult] = useState('');
  
  useEffect(() => {
    setIsTyping(input.trim().length > 0 || interimResult.trim().length > 0);
  }, [input, interimResult, setIsTyping]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userInitiatedFocus = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(isStreaming);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setConnectionStatus('Connected');
      haptic(10);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = 4;
    const gap = 3;
    const totalBars = Math.floor(canvas.width / (barWidth + gap));
    const step = Math.floor(bufferLength / totalBars);

    for (let i = 0; i < totalBars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
      }
      const average = sum / step;
      
      // Map average (0-255) to bar height
      const rawHeight = (average / 255) * canvas.height;
      const barHeight = Math.max(4, rawHeight * 1.5); // Minimum height of 4px

      const x = i * (barWidth + gap);
      const y = (canvas.height - barHeight) / 2; // Center vertically

      ctx.fillStyle = '#ffffff'; // White color as requested
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    requestRef.current = requestAnimationFrame(drawWaveform);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setIsRecording(true);
      haptic(15);
      
      // Start drawing
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(drawWaveform);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.start();

    } catch (err: any) {
      console.error("Microphone access denied:", err);
      // We don't want to alert object if it is an object
      const errMsg = err.message || "Permission denied";
      alert(`Microphone access denied: ${errMsg}. Please check your browser permissions.`);
      setIsRecording(false);
      stopAudioTracks();
    }
  };

  const stopAudioTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    setInterimResult('');
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopAudioTracks();
    setIsRecording(false);
    haptic(10);
  };

  const stopRecordingKeepText = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stopAudioTracks();
        setIsRecording(false);
        setIsStreaming(true); // Temporary visual feedback
        
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            const response = await fetch('/api/stt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64data, mimeType: 'audio/webm' })
            });
            const data = await response.json();
            if (data.text) {
              setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + data.text);
            }
            setIsStreaming(false);
          };
        } catch (err) {
          console.error("STT Error", err);
          setIsStreaming(false);
        }
      };
      mediaRecorderRef.current.stop();
      haptic(10);
    } else {
      stopAudioTracks();
      setIsRecording(false);
      haptic(10);
    }
  };

  const sendRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stopAudioTracks();
        setIsRecording(false);
        setIsStreaming(true); // show thinking indicator while transcribing
        
        try {
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            const response = await fetch('/api/stt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64data, mimeType: 'audio/webm' })
            });
            const data = await response.json();
            const textToSend = input + (data.text ? (input ? ' ' : '') + data.text : '');
            setIsStreaming(false);
            if (textToSend.trim()) {
              handleSend(textToSend);
            }
          };
        } catch (err) {
          console.error("STT Error", err);
          setIsStreaming(false);
        }
      };
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      stopAudioTracks();
      handleSend(input);
    }
  };

  useEffect(() => {
    return () => {
      stopAudioTracks();
    };
  }, []);

  const toggleVoiceMode = () => {
    if (!settings.voiceEnabled) {
      alert("Voice input is disabled in Settings.");
      haptic([10, 50, 10]);
      return;
    }
    haptic(10);
    setIsVoiceMode(true);
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

          abortControllerRef.current = new AbortController();

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
            
            const stream = earthApi.streamMessage(apiMessages, currentModel, abortControllerRef.current.signal, useWebSearch);
            let fullResponse = '';
            
            for await (const chunk of stream) {
              if (fullResponse === '') setConnectionStatus('Streaming...');
              fullResponse += chunk;
              updateMessage(responseId, fullResponse, { isStreaming: true });
            }
            
            updateMessage(responseId, fullResponse, { isStreaming: false });
            setConnectionStatus('Connected');
      
            if (!isIncognito) {
              memoryApi.saveMessage({
                id: responseId,
                conversationId,
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date()
              });
            }
          } catch (err: any) {
             if (err.name === 'AbortError') {
               updateMessage(responseId, (prev) => prev + '', { isStreaming: false });
               setConnectionStatus('Connected');
               return;
             }
             updateMessage(responseId, `EARTH AI temporarily unavailable. ${err.message}`, { isStreaming: false, isError: true });
             setConnectionStatus('Offline');
          } finally {
             if (!abortControllerRef.current?.signal.aborted) {
               setIsStreaming(false);
             }
          }
        };
        runRetry();
      }
    };
    
    // Add custom event listener for sending auto-replies/suggestions
    const handleRemoteSend = (e: any) => {
      const text = e.detail?.text;
      if (text) {
         if (isStreaming && abortControllerRef.current) {
            // Abort current stream if any
            abortControllerRef.current.abort();
         }
         setInput(text);
         // Small timeout to allow state to update before sending
         setTimeout(() => {
            const finalInput = text;
            if (!isIncognito) {
              if (messages.length === 0) {
                updateSession(conversationId, { title: finalInput.substring(0, 50), updatedAt: Date.now() });
              } else {
                updateSession(conversationId, { updatedAt: Date.now() });
              }
            }
            
            const userMsg = {
              id: Date.now().toString(),
              role: 'user' as const,
              content: finalInput,
              timestamp: new Date()
            };

            addMessage(userMsg);
            if (!isIncognito) {
              memoryApi.saveMessage({
                ...userMsg,
                conversationId
              });
            }
            
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
              abortControllerRef.current = new AbortController();
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

                const stream = earthApi.streamMessage(apiMessages, currentModel, abortControllerRef.current.signal, useWebSearch);
                let fullResponse = '';
                
                for await (const chunk of stream) {
                  if (fullResponse === '') setConnectionStatus('Streaming...');
                  fullResponse += chunk;
                  updateMessage(responseId, fullResponse, { isStreaming: true });
                }
                
                updateMessage(responseId, fullResponse, { isStreaming: false });
                setConnectionStatus('Connected');
          
                if (!isIncognito) {
                  memoryApi.saveMessage({
                    id: responseId,
                    conversationId,
                    role: 'assistant',
                    content: fullResponse,
                    timestamp: new Date()
                  });
                }
          
              } catch (err: any) {
                if (err.name === 'AbortError') {
                  updateMessage(responseId, (prev) => prev + '', { isStreaming: false });
                  setConnectionStatus('Connected');
                  return;
                }
                updateMessage(responseId, `EARTH AI temporarily unavailable. ${err.message}`, { isStreaming: false, isError: true });
                setConnectionStatus('Offline');
              } finally {
                if (!abortControllerRef.current?.signal.aborted) {
                  setIsStreaming(false);
                }
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
            if (!userInitiatedFocus.current) return;
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

  const handleSend = async (overrideInput?: string) => {
    let finalInput = overrideInput !== undefined ? overrideInput : input + (interimResult ? (input ? ' ' : '') + interimResult : '');
    let fileContent = '';

    if (attachment) {
      // Basic text extraction for text files
      if (attachment.type.startsWith('text/') || attachment.type === 'application/json' || attachment.name.endsWith('.csv') || attachment.name.endsWith('.md')) {
        try {
          const text = await attachment.text();
          fileContent = `\n\n--- [Attached File: ${attachment.name}] ---\n${text.substring(0, 15000)}\n--- [End of File] ---\n\n`;
        } catch (err) {
          console.error("Failed to read file", err);
        }
      } else {
        fileContent = `\n[User attached a file: ${attachment.name}]\n`;
      }
    }

    if (!finalInput.trim() && !fileContent && !attachment) return;
    if (isStreaming) return;
    
    finalInput = finalInput + fileContent;
    
    if (connectionStatus === 'Offline') {
      alert("You are currently offline. EARTH OS cannot transmit to the satellite network.");
      haptic([10, 50, 10]);
      return;
    }
    
    haptic(15);
    
    if (!isIncognito) {
      if (messages.length <= 1) {
        updateSession(conversationId, { title: finalInput.substring(0, 50).replace(/\[.*?\]\s*/g, '') + (finalInput.length > 50 ? '...' : ''), updatedAt: Date.now() });
      } else {
        updateSession(conversationId, { updatedAt: Date.now() });
      }
    }

    if (useWebSearch) {
       finalInput = `[SYSTEM NOTE: The user requested LIVE WEB SEARCH. Please prioritize current facts and use tools to search the live web if applicable.]\n` + finalInput;
    }

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: finalInput.trim() || `[Sent attached file: ${attachment?.name}]`,
      timestamp: new Date(),
      attachments: attachment ? [attachment.name] : []
    };

    addMessage(userMsg);
    if (!isIncognito) {
      memoryApi.saveMessage({
        ...userMsg,
        conversationId
      });
    }
    
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
      abortControllerRef.current = new AbortController();
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

      const stream = earthApi.streamMessage(apiMessages, currentModel, abortControllerRef.current.signal, useWebSearch);
      let fullResponse = '';
      
      for await (const chunk of stream) {
        if (fullResponse === '') setConnectionStatus('Streaming...');
        fullResponse += chunk;
        updateMessage(responseId, fullResponse, { isStreaming: true });
      }
      
      updateMessage(responseId, fullResponse, { isStreaming: false });
      setConnectionStatus('Connected');

      if (!isIncognito) {
        memoryApi.saveMessage({
          id: responseId,
          conversationId,
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date()
        });
      }

    } catch (e: any) {
      if (e.name === 'AbortError') {
        updateMessage(responseId, (prev) => prev + '', { isStreaming: false });
        setConnectionStatus('Connected');
        return;
      }
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
          "bg-[#18181A] border-transparent dark:bg-[#18181A]/80 backdrop-blur-[25px] dark:backdrop-blur-[30px] rounded-[32px] min-h-[56px] shadow-sm",
          "transition-ultra"
        )}
      >
        {!isRecording && (
          <button 
            onClick={() => {
              haptic(10);
              fileInputRef.current?.click();
            }}
            className="p-3 text-white transition-colors shrink-0 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center ml-1"
          >
            <Plus size={24} className="stroke-[1.5]" />
          </button>
        )}

        <div className="flex-1 flex flex-col justify-center min-h-[40px] overflow-hidden">
          {isRecording ? (
            <div className="flex items-center w-full h-[40px] px-2">
              <button
                onClick={cancelRecording}
                className="text-white/60 hover:text-white p-2 rounded-full mr-2 transition-colors active:scale-95"
              >
                <X size={20} />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="h-[30px] w-full max-w-[200px]"
                  width={200}
                  height={30}
                />
              </div>
            </div>
          ) : (
            <>
              {attachment && (
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/10 inline-flex w-fit px-2 py-1 rounded-full mb-1 mt-1 shadow-sm border border-black/5 dark:border-white/5">
                  <Paperclip size={12} className="text-gray-500 dark:text-white/60" />
                  <span className="text-xs text-gray-700 dark:text-white/80 max-w-[150px] truncate">{attachment.name}</span>
                  <button 
                    onClick={() => setAttachment(null)}
                    className="text-gray-500 hover:text-black dark:text-white/40 dark:hover:text-white/80 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                onPointerDown={() => { userInitiatedFocus.current = true; }}
                onFocus={() => { userInitiatedFocus.current = true; }}
                onBlur={() => { userInitiatedFocus.current = false; }}
                value={input + (interimResult ? (input ? ' ' : '') + interimResult : '')}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isIncognito ? "Temporary chat" : "Message..."}
                className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none py-2 max-h-[150px] font-medium text-[16px] leading-relaxed transition-ultra hardware-accelerated flex items-center px-2"
                rows={1}
                disabled={isStreaming}
              />
            </>
          )}
        </div>

        <div className="flex items-center shrink-0 pr-1 gap-1">
          <AnimatePresence mode="popLayout">
            {isRecording ? (
              <div className="flex items-center gap-2 mr-1">
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={stopRecordingKeepText}
                  className="w-10 h-10 bg-white/10 text-white hover:bg-white/20 transition-all rounded-full hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
                >
                  <Square size={16} fill="currentColor" strokeWidth={0} />
                </motion.button>
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={sendRecording}
                  className="w-10 h-10 bg-white text-black hover:bg-gray-200 transition-all rounded-full hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
                >
                  <ArrowUp size={20} strokeWidth={2.5} />
                </motion.button>
              </div>
            ) : isStreaming ? (
              <motion.button 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={stopStreaming}
                className="w-10 h-10 bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-all rounded-full hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 mr-1"
                title="Stop App"
              >
                <Square size={16} fill="currentColor" strokeWidth={0} />
              </motion.button>
            ) : !(input.trim() || interimResult.trim()) ? (
              <div className="flex items-center">
                <motion.button 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={startRecording}
                  className={cn(
                    "w-10 h-10 rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0 relative mr-1 text-white hover:bg-white/10"
                  )}
                >
                  <Mic size={22} className="relative z-10 stroke-[1.5]" />
                </motion.button>
                <div className="w-[1px] h-5 bg-white/10 mx-0.5"></div>
                <motion.button 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={toggleVoiceMode}
                  className={cn(
                    "w-10 h-10 rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0 relative ml-1 mr-1",
                    isVoiceMode ? "bg-[#1E88E5]/80 text-white" : "bg-[#1E88E5] text-white hover:bg-[#1E88E5]/90"
                  )}
                >
                  {isVoiceMode && (
                    <span className="absolute inset-0 rounded-full bg-[#1E88E5]/20 animate-ping opacity-75"></span>
                  )}
                  <AudioLines size={20} className="relative z-10 stroke-[2]" />
                </motion.button>
              </div>
            ) : (
              <motion.button 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={handleSend}
                className="w-10 h-10 bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-all rounded-full hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 mr-1"
              >
                <ArrowUp size={20} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <div className="text-center mt-2 pb-1 opacity-80 w-full">
        <span className="text-[11px] text-gray-500 dark:text-[#777] tracking-wide font-medium px-2 block truncate">
          <a href="https://www.instagram.com/bmrinternational.inc?igsh=cW5tN2liZnNuNnFk" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white/60 transition-colors">BMR.inc</a>
          {' • '}
          <a href="https://www.instagram.com/earthai.space?igsh=bDV3Y2JtNHMydXpm" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white/60 transition-colors">Earthai</a>
          {' • '}
          <a href="https://www.instagram.com/__rexzz_?igsh=dmZ0MWR5NGt2azBn" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white/60 transition-colors">2026</a>
        </span>
      </div>
    </div>
  );
}
