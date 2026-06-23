import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { X, Mic, MicOff, Volume2 } from 'lucide-react';
import { EarthCore } from './EarthCore';

export function VoiceModeOverlay() {
  const { isVoiceMode, setIsVoiceMode, messages, settings, isStreaming } = useApp();
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const lastMessageRef = useRef<string | null>(null);

  const audioContextMicRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isSpeakingRef = useRef(false);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    if (!isVoiceMode) return;

    let rafId: number;
    let stream: MediaStream | null = null;
    let isCurrentlySilent = true;
    let silenceStart = Date.now();

    const startRecording = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextMicRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];
            
            setIsListening(false);
            setTranscript('Thinking...');
            
            try {
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                const response = await fetch('/api/stt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ audioData: base64data, mimeType: 'audio/webm' })
                });
                const data = await response.json();
                if (data.text && data.text.trim()) {
                  window.dispatchEvent(new CustomEvent('earth:send', { detail: { text: data.text.trim() } }));
                  setTranscript(data.text.trim());
                  // Do not restart right away, let the assistant reply. We can restart after assistant finishes speaking.
                } else {
                  setTranscript('');
                  // Restart recording if no text and not speaking
                  if (isVoiceMode && !isSpeakingRef.current && !isStreamingRef.current) mediaRecorderRef.current?.start();
                }
              };
            } catch (e) {
               console.error('STT Error', e);
               setTranscript('');
               if (isVoiceMode && !isSpeakingRef.current && !isStreamingRef.current) mediaRecorderRef.current?.start();
            }
          } else {
             if (isVoiceMode && !isSpeakingRef.current && !isStreamingRef.current) mediaRecorderRef.current?.start();
          }
        };

        if (!isSpeakingRef.current && !isStreamingRef.current) {
          mediaRecorder.start();
          setIsListening(true);
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkSilence = () => {
          if (!analyserRef.current || isSpeakingRef.current || isStreamingRef.current) {
             rafId = requestAnimationFrame(checkSilence);
             return;
          }
          
          if (mediaRecorder.state === 'inactive' && !isSpeakingRef.current && !isStreamingRef.current) {
              try { mediaRecorder.start(); setIsListening(true); } catch(e) {}
          }
          
          if (mediaRecorder.state === 'recording') {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const average = sum / dataArray.length;

            if (average > 10) {
              if (isCurrentlySilent) {
                isCurrentlySilent = false;
                setIsListening(true);
                setTranscript('Listening...');
              }
              silenceStart = Date.now();
            } else {
              if (!isCurrentlySilent) {
                if (Date.now() - silenceStart > 1500) {
                  isCurrentlySilent = true;
                  mediaRecorder.stop(); // Triggers transcription
                }
              }
            }
          }

          rafId = requestAnimationFrame(checkSilence);
        };

        checkSilence();

      } catch (e) {
        console.error(e);
        alert('Microphone access denied. Please allow microphone access.');
        setIsVoiceMode(false);
      }
    };

    startRecording();

    return () => {
      cancelAnimationFrame(rafId);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioContextMicRef.current) audioContextMicRef.current.close();
      stopSpeakingRef.current();
    };
  }, [isVoiceMode]);

  // Handle assistant speaking its response chunk by chunk
  const audioQueue = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const processedTextRef = useRef<string>('');
  
  const [liveSubtitle, setLiveSubtitle] = useState('');

  const playNextInQueue = async () => {
    if (audioQueue.current.length === 0) {
      if (!isStreaming) {
        setIsSpeaking(false);
      }
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const textToSpeak = audioQueue.current.shift()!;
    setLiveSubtitle(textToSpeak);

    try {
      // Determine voice personality from settings or use default warm female (Luna/Jenny)
      let voiceId = 'en-US-JennyNeural'; // Luna
      if (settings.assistantVoice === 'Nova') voiceId = 'en-US-AriaNeural';
      else if (settings.assistantVoice === 'Aurora') voiceId = 'en-US-AnaNeural';
      else if (settings.assistantVoice === 'Atlas') voiceId = 'en-US-GuyNeural';
      else if (settings.assistantVoice === 'Echo') voiceId = 'en-US-ChristopherNeural';

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voice: voiceId })
      });
      
      const arrayBuffer = await response.arrayBuffer();
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      currentSourceRef.current = source;
      
      source.onended = () => {
        currentSourceRef.current = null;
        playNextInQueue();
      };
      
      source.start();
    } catch (err) {
      console.error("TTS Error:", err);
      playNextInQueue();
    }
  };

  const stopSpeakingRef = useRef<() => void>(() => {});

  const stopSpeaking = () => {
    audioQueue.current = [];
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    setIsSpeaking(false);
    setLiveSubtitle('');
  };
  stopSpeakingRef.current = stopSpeaking;

  useEffect(() => {
    if (!isVoiceMode) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      if (lastMessageRef.current !== lastMessage.id) {
        // New message started
        lastMessageRef.current = lastMessage.id;
        processedTextRef.current = '';
        audioQueue.current = [];
        stopSpeaking();
      }

      // Check for new sentences
      const content = lastMessage.content;
      const unprocessed = content.substring(processedTextRef.current.length);
      
      // Match sentences (ending with . ! ? followed by space or newline)
      const sentenceMatch = unprocessed.match(/([^.!?]+[.!?]+)(?:\s|\n|$)/);
      if (sentenceMatch) {
        const sentence = sentenceMatch[1].trim();
        if (sentence) {
          audioQueue.current.push(sentence);
          processedTextRef.current += sentenceMatch[0];
          
          if (!isPlayingRef.current) {
            playNextInQueue();
          }
        }
      } else if (!isStreaming && unprocessed.trim()) {
        // Flush remaining text
        audioQueue.current.push(unprocessed.trim());
        processedTextRef.current += unprocessed;
        if (!isPlayingRef.current) {
          playNextInQueue();
        }
      }
    }
  }, [messages, isStreaming, isVoiceMode, settings.assistantVoice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-between py-20"
    >
      <button 
        onClick={() => setIsVoiceMode(false)}
        className="absolute top-8 right-8 p-4 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition text-gray-900 dark:text-white"
      >
        <X size={24} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-8 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-150 transform-gpu">
            <EarthCore state={isSpeaking ? 'speaking' : isStreaming ? 'thinking' : isListening ? 'listening' : 'idle'} />
         </div>

         <div className="z-10 text-center mt-32 h-32">
            <AnimatePresence mode="wait">
              {isSpeaking && (
                 <motion.h2 key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-accent-400 text-2xl font-medium tracking-tight mb-4 flex items-center justify-center gap-2">
                   <Volume2 size={24} /> EARTH Speaking...
                 </motion.h2>
              )}
              {isStreaming && (
                 <motion.h2 key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-900 dark:text-white text-2xl font-medium tracking-tight mb-4">
                   Thinking...
                 </motion.h2>
              )}
              {isListening && !isStreaming && !isSpeaking && (
                 <motion.h2 key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-800 dark:text-white/80 text-2xl font-medium tracking-tight mb-4 flex items-center justify-center gap-2">
                   <Mic size={24} /> Listening...
                 </motion.h2>
              )}
            </AnimatePresence>
            
            <p className="text-gray-600 dark:text-white/60 text-xl font-light">
              {isSpeaking ? liveSubtitle : (transcript || (isListening ? "Speak now" : ""))}
            </p>
         </div>
      </div>

      <div className="pb-10 z-10 flex gap-6">
        <button 
          onClick={() => {
             if (isListening) {
               recognitionRef.current?.stop();
               setIsListening(false);
             } else if (!isSpeaking && !isStreaming) {
               try {
                 recognitionRef.current?.start();
               } catch (e) {
                 console.error(e);
               }
               setIsListening(true);
             }
          }}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${isListening ? 'bg-accent-500/20 text-accent-600 dark:text-accent-400 border border-accent-500/50' : 'bg-black/5 dark:bg-white/10 text-gray-400 dark:text-white/50 border border-black/10 dark:border-white/10'}`}
        >
           {isListening ? (
              <Mic size={32} className="animate-pulse" />
           ) : (
              <MicOff size={32} />
           )}
        </button>
      </div>
    </motion.div>
  );
}
