
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, MessageType, Product, Language, Astrologer } from '../../types';
import { TRANSLATIONS, formatDisplayName } from '../../constants';
import ProductCard from '../Shop/ProductCard';

interface MessageBubbleProps {
  message: Message;
  onUnlock: (messageId: string) => void;
  onPay?: (amount: number) => void;
  onAcceptCall?: (messageId: string, type: 'voice' | 'video') => void;
  onSubscribe?: () => void;
  onBuyProduct?: (product: Product) => void;
  userHasPremium: boolean;
  userName: string;
  language: Language;
  astrologers?: Astrologer[]; 
}

// Helper to render text without raw markdown symbols but with styling
const FormattedText: React.FC<{ text: string; isDrastic?: boolean }> = ({ text, isDrastic }) => {
  const lines = text.split('\n');
  
  const renderLines = () => {
    const output = [];
    let asciiBuffer: string[] = [];

    const flushAscii = (keyPrefix: string) => {
        if (asciiBuffer.length > 0) {
            output.push(
                <div key={`${keyPrefix}-blueprint`} className="my-6 relative animate-in fade-in">
                    <div className="absolute -top-3 left-4 bg-mystic-900 px-2 text-[10px] uppercase tracking-widest text-gold-400 font-bold z-10 border border-gold-500/50 rounded shadow-sm">
                        Vastu Purusha Mandala
                    </div>
                    <div className="bg-[#0c162d] border-2 border-gold-500/20 rounded-lg p-6 font-mono text-xs md:text-sm text-blue-200 overflow-x-auto shadow-2xl relative bg-[url('https://www.transparenttextures.com/patterns/blueprint.png')]">
                        <pre className="leading-tight whitespace-pre font-bold text-center tracking-widest text-gold-100 mix-blend-screen drop-shadow-md">
                            {asciiBuffer.join('\n')}
                        </pre>
                        {/* Decorative Corners */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold-500/50"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gold-500/50"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gold-500/50"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold-500/50"></div>
                    </div>
                </div>
            );
            asciiBuffer = [];
        }
    };

    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushAscii(`empty-${idx}`);
            return;
        }

        // Check if line is part of a map/grid
        // Enhanced check for Vastu diagrams (+---+, |   |, etc)
        const isMapLine = /^[+|]/.test(trimmed) || (trimmed.includes('---') && trimmed.includes('+'));

        if (isMapLine) {
            asciiBuffer.push(line);
            return;
        } else {
            flushAscii(`pre-${idx}`);
        }

        // --- CLEAN MARKDOWN SYMBOLS FOR DISPLAY ---
        // Strip ###, ---, and > characters
        let cleanContent = trimmed
            .replace(/^#+\s*/, '') // Remove headers (### )
            .replace(/^---+\s*/, '') // Remove dividers (---)
            .replace(/^>\s*/, ''); // Remove blockquotes (>)

        // Remove artifacts like just "###" or "***" on a line
        if (cleanContent.replace(/[*#\-\s]/g, '').length === 0) return;

        const isBullet = cleanContent.startsWith('* ') || cleanContent.startsWith('- ');
        if (isBullet) cleanContent = cleanContent.substring(2);

        // Parse internal bolding (**text**)
        const parts = cleanContent.split(/(\*\*.*?\*\*)/g);
        
        const renderedContent = parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-gold-400 font-bold tracking-wide">{part.slice(2, -2)}</strong>;
          }
          return <span key={i}>{part}</span>;
        });

        output.push(
          <div key={idx} className={`flex ${isBullet ? 'gap-2 ml-2' : ''} ${isDrastic ? 'text-gold-300 italic font-medium' : ''}`}>
            {isBullet && <span className="text-gold-500 mt-1.5 text-[10px]">✦</span>}
            <p className={`leading-relaxed text-base ${isBullet ? 'flex-1' : ''}`}>
              {renderedContent}
            </p>
          </div>
        );
    });

    flushAscii('final');
    return output;
  };
  
  return (
    <div className="space-y-4">
      {renderLines()}
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onUnlock, onPay, onAcceptCall, onSubscribe, onBuyProduct, userHasPremium, userName, language, astrologers = [] }) => {
  const isUser = message.sender === Sender.USER;
  const isAstro = message.sender === Sender.ASTROLOGER;
  const isAI = message.sender === Sender.AI;
  
  // Safe translation lookup
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Typing Effect State
  const [displayedGist, setDisplayedGist] = useState("");
  const typingIntervalRef = useRef<any>(null);

  // Parse Gist vs Deep Dive
  let fullGist = message.text;
  let deepDive = "";
  
  if (isAI && message.text.includes("Deep Dive:")) {
    const parts = message.text.split(/Deep Dive:/i);
    if (parts.length > 1) {
      fullGist = parts[0].trim();
      deepDive = parts[1].trim();
    }
  }

  // --- TYPING EFFECT LOGIC ---
  useEffect(() => {
      // Check if message is "fresh" (within last 60 seconds) AND from AI/Astro
      const isFresh = (new Date().getTime() - message.timestamp.getTime()) < 60000;
      
      // If it's a User message or old message, show instantly
      if (isUser || !isFresh || message.type !== MessageType.TEXT) {
          setDisplayedGist(fullGist);
          return;
      }

      // If already displayed fully, skip
      if (displayedGist === fullGist) return;

      // Start Typing Animation
      setDisplayedGist(""); // Reset to empty to start animation
      const chunks = fullGist.split(/(\s+)/); // Split by whitespace to preserve spaces/newlines
      let currentIndex = 0;

      // Slower speed for "Readable One by One" feel (50ms)
      typingIntervalRef.current = setInterval(() => {
          if (currentIndex < chunks.length) {
              setDisplayedGist(prev => prev + chunks[currentIndex]);
              currentIndex++;
          } else {
              if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
          }
      }, 50); 

      return () => {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      };
  }, [message.id]); // Only re-run if message ID changes (new message)

  // Load voices robustly
  useEffect(() => {
    const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) {
            setAvailableVoices(v);
        }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleReveal = () => {
    onUnlock(message.id);
    setIsRevealed(true);
  };

  const handleSpeak = () => {
    window.speechSynthesis.cancel();

    if (isSpeaking) {
        setIsSpeaking(false);
        return;
    }

    const textToSpeak = isRevealed ? `${fullGist}. ${deepDive}` : fullGist;
    
    // Clean text for speech
    const cleanText = textToSpeak
        .replace(/\*/g, '') 
        .replace(/-/g, ' ') 
        .replace(/\+/g, ' ') 
        .replace(/\|/g, ' ') 
        .replace(/#/g, '')
        .replace(/>/g, '')
        .replace(/[\u{1F600}-\u{1F64F}]/gu, "") 
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") 
        .replace(/Deep Dive:/gi, "")
        .replace(/\n/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // --- DYNAMIC VOICE SELECTION ---
    let preferredVoice: SpeechSynthesisVoice | undefined = undefined;
    let langCode = 'en-US';

    switch(language) {
        case 'hi':
            langCode = 'hi-IN';
            preferredVoice = availableVoices.find(v => v.lang === 'hi-IN' || v.name.includes('Hindi'));
            break;
        case 'te':
            langCode = 'te-IN';
            preferredVoice = availableVoices.find(v => v.lang === 'te-IN' || v.name.includes('Telugu'));
            break;
        case 'mr':
            langCode = 'mr-IN';
            preferredVoice = availableVoices.find(v => v.lang === 'mr-IN' || v.name.includes('Marathi'));
            break;
        case 'ml':
            langCode = 'ml-IN';
            preferredVoice = availableVoices.find(v => v.lang === 'ml-IN' || v.name.includes('Malayalam'));
            break;
        case 'pa':
            langCode = 'pa-IN';
            // Punjabi voices are rare on some devices, fallback to Hindi if needed but try exact match first
            preferredVoice = availableVoices.find(v => v.lang === 'pa-IN' || v.name.includes('Punjabi'));
            break;
        default: // English
            langCode = 'en-IN';
            preferredVoice = availableVoices.find(v => v.name.includes("Google English India")) ||
                             availableVoices.find(v => v.lang === 'en-IN') ||
                             availableVoices.find(v => v.lang.startsWith('en'));
            break;
    }

    // Fallback if specific regional voice not found: Use any Google India voice or default English
    if (!preferredVoice && language !== 'en') {
        console.warn(`Voice for ${language} not found, falling back to English/India`);
        preferredVoice = availableVoices.find(v => v.lang === 'en-IN') || availableVoices[0];
    }

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    utterance.lang = langCode;
    utterance.rate = 0.9; 
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') {
            setIsSpeaking(false);
            return;
        }
        console.warn("TTS Playback Error:", e.error);
        setIsSpeaking(false);
    };
    
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    }, 50);
  };

  const astrologer = isAstro 
    ? astrologers.find(a => a.id === message.astrologerId) 
    : null;

  const isUnlocked = !message.isLocked || isRevealed || userHasPremium;

  // Render Special Message Types
  const renderSpecialContent = () => {
    if (message.type === MessageType.CALL_OFFER) {
        const isEnded = message.metadata?.callStatus === 'ended';
        return (
            <div className="relative w-72 rounded-3xl border border-gold-500/40 bg-mystic-950 overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.15)] mt-2">
                {!isEnded && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gold-500/10 blur-[50px] pointer-events-none animate-pulse-slow"></div>
                )}
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-full text-center py-4 border-b border-white/5">
                         <p className="text-gold-400 font-serif text-[10px] font-bold tracking-[0.2em] uppercase">
                            {astrologer?.name || 'PANDIT ARJUN MISHRA'}
                         </p>
                    </div>
                    <div className="p-5 w-full flex flex-col items-center gap-4">
                         <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border ${isEnded ? 'border-mystic-700 bg-mystic-800 text-mystic-500' : 'border-green-500/20 bg-mystic-800 text-white shadow-inner animate-pulse'}`}>
                            {message.metadata?.callType === 'video' ? '📹' : '📞'}
                         </div>
                         <div className="text-center">
                            <h4 className={`font-bold text-xl leading-tight ${isEnded ? 'text-mystic-300' : 'text-white'}`}>
                                {isEnded ? 'Call Ended' : `Incoming ${message.metadata?.callType} Call`}
                            </h4>
                            <p className={`${isEnded ? 'text-mystic-500 font-mono' : 'text-indigo-400'} text-xs mt-1.5`}>
                                {isEnded ? message.metadata?.durationText : 'Guru is inviting you to join'}
                            </p>
                         </div>
                        {!isEnded ? (
                             <button 
                                onClick={() => onAcceptCall && onAcceptCall(message.id, message.metadata?.callType || 'voice')}
                                className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-95 text-sm"
                            >
                                Accept Call
                            </button>
                        ) : (
                             <div className="w-full mt-2 py-3 bg-white/5 rounded-2xl text-[10px] text-mystic-500 font-mono text-center uppercase tracking-widest">
                                Session Completed
                             </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    if (message.type === MessageType.PAYMENT_REQUEST) {
        return (
            <div className="bg-mystic-900/80 rounded-lg p-4 border border-gold-500/50 flex flex-col items-center gap-3 text-center">
                <div className="text-2xl">🕉️</div>
                <div>
                    <p className="text-sm font-bold text-gold-400">Dakshina Request</p>
                    <p className="text-xs text-mystic-300">Please offer dakshina to continue.</p>
                </div>
                <p className="text-xl font-bold text-white">₹{message.metadata?.amount}</p>
                <button 
                    onClick={() => onPay && onPay(message.metadata?.amount || 101)}
                    className="bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-mystic-950 text-sm font-bold px-6 py-2 rounded-full shadow-lg transition-all hover:scale-105"
                >
                    Pay Now
                </button>
            </div>
        );
    }
    if (message.type === MessageType.AUDIO && message.attachmentUrl) {
        return (
            <div className="bg-mystic-900/50 p-3 rounded-lg border border-white/10 min-w-[200px]">
                <p className="text-xs text-mystic-400 mb-2 flex items-center gap-1">🎤 Voice Note</p>
                <audio controls src={message.attachmentUrl} className="w-full h-8" />
            </div>
        );
    }
    if (message.type === MessageType.IMAGE && message.attachmentUrl) {
        return (
            <div className="rounded-lg overflow-hidden border border-white/10 my-1">
                <img src={message.attachmentUrl} alt="Attachment" className="max-w-full h-auto max-h-64 object-cover" />
            </div>
        );
    }
    if (message.type === MessageType.VIDEO && message.attachmentUrl) {
        return (
             <div className="rounded-lg overflow-hidden border border-white/10 my-1">
                <video controls src={message.attachmentUrl} className="max-w-full h-auto max-h-64" />
            </div>
        );
    }
    return null;
  };

  return (
    <div className={`flex w-full mb-6 items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      
      <div className="shrink-0 w-10 h-10 rounded-full shadow-lg border border-white/20 overflow-hidden relative group cursor-pointer">
        {isUser ? (
             <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-900 flex items-center justify-center text-white font-bold text-sm">
                {formatDisplayName(userName).charAt(0).toUpperCase()}
             </div>
        ) : isAstro ? (
            <img src={astrologer?.imageUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80'} alt="Astro" className="w-full h-full object-cover" />
        ) : message.sender === Sender.SYSTEM ? (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs">⚙️</div>
        ) : (
            <div className="w-full h-full bg-mystic-900 flex items-center justify-center text-lg">
                🔮
            </div>
        )}
      </div>

      <div className="flex flex-col max-w-[90%] md:max-w-[85%] gap-2">
        <div 
            className={`relative rounded-2xl backdrop-blur-md shadow-lg border transition-all duration-300 ${
            isUser 
                ? 'bg-mystic-600/80 text-white rounded-br-none border-white/10 p-5' 
                : isAstro
                    ? 'bg-gradient-to-r from-mystic-800 to-mystic-900 text-mystic-50 rounded-bl-none border-gold-500/50 p-5'
                    : message.sender === Sender.SYSTEM
                        ? 'bg-gray-900/80 text-gray-300 text-xs border-gray-700 p-5'
                        : 'bg-mystic-800/95 text-mystic-100 rounded-bl-none border-white/10 pt-5 px-5 pb-2'
            }`}
        >
            {isAstro && (
                <div className="text-[10px] text-gold-400 font-serif uppercase tracking-widest mb-1">
                    {astrologer?.name || 'Astrologer'}
                </div>
            )}

            <div className="text-sm md:text-base font-sans">
            {message.type && message.type !== MessageType.TEXT ? (
                renderSpecialContent()
            ) : isUser || isAstro || message.sender === Sender.SYSTEM ? (
                <div className="whitespace-pre-wrap">{message.text}</div>
            ) : (
                <>
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-mystic-400 uppercase tracking-widest mb-3 flex items-center gap-2 opacity-70">
                        <span>✨</span> {t.celestialGuidance}
                    </h4>
                    
                    {/* Render with Typing Effect */}
                    <div className="text-mystic-100 min-h-[20px]">
                        {(() => {
                            const textToRender = displayedGist;
                            const lines = textToRender.split('\n');
                            
                            const warningIndex = lines.findIndex(l => 
                                /^(?:4\.|5\.|Warning:|Caution:|Cautionary Note|The Warning|Cliffhanger|### Warning|चेतावनी|सावधान|హెచ్చరిక|सावधानता|മുന്നറിയിപ്പ്|ਸਾਵਧਾਨੀ)/i.test(l.trim())
                            );

                            let mainContent = textToRender;
                            let warningContent = null;

                            if (warningIndex !== -1) {
                                mainContent = lines.slice(0, warningIndex).join('\n');
                                const potentialWarning = lines.slice(warningIndex).join('\n');
                                warningContent = potentialWarning;
                            }

                            return (
                                <>
                                    <FormattedText text={mainContent} />
                                    {warningContent && warningContent.trim().length > 10 && (
                                        <div className="mt-6 pt-4 border-t border-white/5 bg-red-900/10 -mx-2 px-4 py-2 rounded animate-in fade-in slide-in-from-bottom-2">
                                            <p className="text-xs text-red-300 uppercase font-bold mb-1 tracking-widest">{t.cautionaryNote}</p>
                                            <FormattedText text={warningContent} isDrastic={true} />
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
                
                {/* DEEP DIVE SECTION */}
                {/* Shows if Gist is fully typed. */}
                {(deepDive && displayedGist === fullGist) && (
                    <div className={`relative transition-all duration-700 ${!isUnlocked ? 'mt-4 pt-4 border-t border-white/10' : 'mt-2'}`}>
                    
                    {/* STANDARD BLURRED / UNLOCKED VIEW */}
                    <div className={`transition-all duration-1000 ${!isUnlocked ? 'filter blur-md select-none h-20 overflow-hidden opacity-50' : 'opacity-100'}`}>
                        {isUnlocked && <div className="h-4 border-t border-white/5 w-10 mb-4 opacity-50"></div>}
                        <FormattedText text={deepDive} />
                    </div>

                    {!isUnlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-mystic-900/90 rounded-b-xl z-10">
                        <p className="text-gold-200 text-xs mb-3 font-medium animate-pulse text-center px-4">
                            {t.getVisualVastu}
                        </p>
                        <button 
                            onClick={handleReveal}
                            className="group bg-gradient-to-r from-gold-600 to-gold-400 text-mystic-900 font-bold py-2 px-6 rounded-full shadow-lg hover:shadow-gold-500/20 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 text-sm"
                        >
                            <span>{t.unlockFullReading}</span>
                        </button>
                        </div>
                    )}
                    </div>
                )}
                </>
            )}
            </div>
            
            <div className="mt-3 flex items-center justify-between">
                {!isUser && message.type !== MessageType.PAYMENT_REQUEST && message.type !== MessageType.CALL_OFFER && displayedGist === fullGist && (
                    <button 
                        onClick={handleSpeak}
                        className={`p-1.5 rounded-full transition-colors ${isSpeaking ? 'bg-gold-500 text-mystic-900 animate-pulse' : 'text-mystic-500 hover:text-gold-400 hover:bg-white/5'}`}
                        title="Read Aloud"
                    >
                        {isSpeaking ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        )}
                    </button>
                )}

                <div className="text-[10px] text-white/40 uppercase tracking-widest font-serif flex items-center gap-1 ml-auto">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isUser && <span>✓</span>}
                </div>
            </div>

            {/* Standard Upsell (Hidden if user has premium) */}
            {!userHasPremium && isAI && displayedGist === fullGist && (
                <div 
                    onClick={onSubscribe}
                    className="mt-4 -mx-5 -mb-2 bg-gradient-to-r from-mystic-900 to-mystic-950 border-t border-gold-500/20 py-3 px-5 rounded-b-2xl flex items-center justify-between cursor-pointer hover:bg-mystic-900 transition-colors group border-b border-white/5 animate-in slide-in-from-top-2"
                >
                    <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-500/10 flex items-center justify-center text-lg border border-gold-500/30 group-hover:scale-110 transition-transform">
                        🔓
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold text-gold-400 uppercase tracking-wider group-hover:text-gold-300">{t.unlock}</p>
                        <p className="text-[10px] text-mystic-400">{t.getVisualVastu}</p>
                    </div>
                    </div>
                    <div className="text-xs font-bold text-mystic-300 group-hover:text-white flex items-center gap-1">
                        {t.upgrade} <span className="text-gold-500">→</span>
                    </div>
                </div>
            )}
        </div>

        {message.suggestedProducts && message.suggestedProducts.length > 0 && displayedGist === fullGist && (
            <div className="animate-in slide-in-from-left-4 fade-in duration-500 mt-1">
                <div className="bg-gradient-to-r from-gold-900/40 to-mystic-900/40 border border-gold-500/30 rounded-xl p-3 max-w-xs">
                    <p className="text-xs text-gold-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                        <span>🏷️</span> {t.recommendedRemedy}
                    </p>
                    {message.suggestedProducts.map(product => (
                        <div key={product.id} className="mb-2 last:mb-0">
                            <ProductCard product={product} onBuy={() => onBuyProduct && onBuyProduct(product)} isCompact={true} />
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
