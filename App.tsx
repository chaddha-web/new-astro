
import React, { useState, useEffect, useRef } from 'react';
import { Sender, Message, UserState, AppView, Astrologer, MessageType, CallState, Product, Earnings, Transaction, HoroscopeData, Language, CommunicationLog } from './types';
import { INITIAL_DAILY_LIMIT, PREMIUM_DAILY_LIMIT, generateSystemInstruction, SUGGESTED_QUESTIONS, TOPIC_QUESTIONS, RAZORPAY_KEY_ID, TEST_RAZORPAY_KEY, TRANSLATIONS, MOCK_PRODUCTS, MOCK_ASTROLOGERS, formatDisplayName } from './constants';
import { initializeChat, sendMessageToGemini, generateJsonContent } from './services/geminiService';
import { fetchProducts, fetchTransactions, saveTransaction, fetchUserProfile, saveUserProfile, seedDatabase, fetchAstrologers, subscribeToTable, logCommunication, generateUniqueUsername, generateReferenceId, fetchCachedReading, saveCachedReading, fetchProfiles, fetchCommunicationLogs } from './services/dbService';
import { verifyPassword, generateJWT, verifyJWT } from './services/securityService';
import { supabase } from './services/supabaseClient'; // Imported for safety check
import StarBackground from './components/Layout/StarBackground';
import MessageBubble from './components/Chat/MessageBubble';
import ThinkingBubble from './components/Chat/ThinkingBubble';
import AstroCard from './components/Marketplace/AstroCard';
import AstrologerDashboard from './components/Astrologer/AstrologerDashboard';
import CallInterface from './components/Call/CallInterface';
import RatingModal from './components/Chat/RatingModal';
import Shop from './components/Shop/Shop';
import NatalChart from './components/Astrology/NatalChart';
import LandingPage from './components/Layout/LandingPage';
import UserOnboarding, { OnboardingData } from './components/Layout/UserOnboarding';
import ProfileModal from './components/Profile/ProfileModal';
import AdminDashboard from './components/Admin/AdminDashboard';
import Sidebar from './components/Layout/Sidebar';
import HistoryModal from './components/Profile/HistoryModal';
import HoroscopeView from './components/Horoscope/HoroscopeView';
import FullScreenLoader from './components/Layout/FullScreenLoader';
import { Type, Schema } from '@google/genai';

const generateId = () => Math.random().toString(36).substr(2, 9);

declare global {
  interface Window {
    Razorpay: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const getZodiacSign = (dateString: string): string => {
    if (!dateString) return "Aries";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
    return "Capricorn";
};

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [view, setView] = useState<AppView>(AppView.CHAT);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true); 
  const [loadingText, setLoadingText] = useState("Initializing Universe...");
  const [isAiThinking, setIsAiThinking] = useState(false); 
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userState, setUserState] = useState<UserState>({ id: undefined, dailyQuestionsLeft: INITIAL_DAILY_LIMIT, isPremium: false, tier: 'free', name: '', gender: '', contact: '', hasOnboarded: false, birthDate: '', birthTime: '', birthPlace: '', language: 'en' });
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(SUGGESTED_QUESTIONS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS); 
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [astrologers, setAstrologers] = useState<Astrologer[]>(MOCK_ASTROLOGERS);
  const [users, setUsers] = useState<any[]>([]);
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [astrologerEarnings, setAstrologerEarnings] = useState<Record<string, Earnings>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<'all' | 'calls' | 'purchases'>('all');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalReason, setPremiumModalReason] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState<string>('');
  const [showChartModal, setShowChartModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({ address: '', city: '', pincode: '', phone: '' });
  const [selectedProductForPurchase, setSelectedProductForPurchase] = useState<Product | null>(null);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ amount: number; description: string; onSuccess: () => void; contact?: string; } | null>(null);
  const [callState, setCallState] = useState<CallState>({ isActive: false, type: 'voice', partnerName: '', partnerImage: '', channelName: '' });
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<Astrologer | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [horoscopeData, setHoroscopeData] = useState<HoroscopeData | undefined>(undefined);
  const [isGeneratingHoroscope, setIsGeneratingHoroscope] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentLang = userState.language || 'en';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en; 

  const refreshData = async () => {
        setIsGlobalLoading(true);
        setLoadingText("Aligning Cosmic Energies...");
        try {
            // Check URL parameters for manual seeding
            const params = new URLSearchParams(window.location.search);
            const shouldSeed = params.get('seed') === 'true';
            
            if (shouldSeed) {
              console.log("Manual seeding triggered via URL...");
              await seedDatabase();
            } else {
              await seedDatabase();
            }
            
            const [dbProducts, dbTransactions, dbAstrologers, dbUsers, dbLogs] = await Promise.all([
                fetchProducts(), 
                fetchTransactions(), 
                fetchAstrologers(),
                fetchProfiles(),
                fetchCommunicationLogs()
            ]);
            
            // Set state regardless of empty or not to ensure UI is in sync with DB
            if (dbProducts) setProducts(dbProducts);
            if (dbTransactions) setTransactions(dbTransactions);
            if (dbAstrologers) setAstrologers(dbAstrologers);
            if (dbUsers) setUsers(dbUsers);
            if (dbLogs) setCommLogs(dbLogs);
            
        } catch (e) { console.error(e); } finally { setTimeout(() => setIsGlobalLoading(false), 800); }
  };

  useEffect(() => {
    refreshData();
    const subProducts = subscribeToTable('products', () => fetchProducts().then(setProducts));
    const subTransactions = subscribeToTable('transactions', () => fetchTransactions().then(setTransactions));
    const subAstrologers = subscribeToTable('astrologers', () => fetchAstrologers().then(setAstrologers));
    const subUsers = subscribeToTable('profiles', () => fetchProfiles().then(setUsers));
    const subLogs = subscribeToTable('communications', () => fetchCommunicationLogs().then(setCommLogs));

    return () => { 
        subProducts?.unsubscribe(); 
        subTransactions?.unsubscribe(); 
        subAstrologers?.unsubscribe(); 
        subUsers?.unsubscribe();
        subLogs?.unsubscribe();
    };
  }, []);

  useEffect(() => {
      if (view === AppView.HOROSCOPE && !horoscopeData && userState.hasOnboarded) {
          generateFullHoroscope();
      }
  }, [view, userState.hasOnboarded]);

  const generateFullHoroscope = async () => {
      setIsGeneratingHoroscope(true);
      const sign = getZodiacSign(userState.birthDate || '');
      
      const prompt = `
        Vedic Horoscope for ${userState.name} (${sign}). 
        Provide structure with Daily, Weekly, and Monthly insights.
        Constraints: ${userState.isPremium || userState.tier === 'member21' ? 'Detailed content.' : 'BE VERY CONCISE (GIST ONLY).'} Language: ${userState.language === 'hi' ? 'HINDI' : 'ENGLISH'}.
      `;

      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          daily: {
            type: Type.OBJECT,
            properties: {
              overview: { type: Type.STRING },
              dos: { type: Type.ARRAY, items: { type: Type.STRING } },
              donts: { type: Type.ARRAY, items: { type: Type.STRING } },
              luckyColor: { type: Type.STRING },
              luckyNumber: { type: Type.STRING }
            },
            required: ['overview', 'dos', 'donts', 'luckyColor', 'luckyNumber']
          },
          weekly: { type: Type.STRING },
          monthly: { type: Type.STRING },
          starSign: { type: Type.STRING }
        },
        required: ['daily', 'weekly', 'monthly', 'starSign']
      };

      try {
          const data = await generateJsonContent(prompt, (userState.isPremium || userState.tier === 'member21') ? 4000 : 2000, schema);
          if (data && data.daily) { setHoroscopeData(data); } 
          else { setHoroscopeData({ starSign: sign, daily: { overview: "Stars are shifting.", dos: ["Meditate"], donts: ["Stress"], luckyColor: "White", luckyNumber: "7" }, weekly: "Good week ahead.", monthly: "Plan carefully." }); }
      } catch (e) { console.error(e); } finally { setIsGeneratingHoroscope(false); }
  };

  const handleSendYearlyReport = () => {
      if(!userState.isPremium && userState.tier !== 'member21') { setPremiumModalReason("Yearly Reports are for Members only."); setShowPremiumModal(true); return; }
      logCommunication('email', userState.contact || 'User', 'outbound', 'sent', 'Yearly Report 2024');
      alert(`Yearly Report has been emailed to ${userState.contact}!`);
  };

  useEffect(() => {
      if (userState.isAdminImpersonating) return;
      const saveToDb = async () => { if (userState.hasOnboarded && userState.contact && userState.contact !== 'ADMIN') await saveUserProfile(userState, undefined, messages); };
      const timer = setTimeout(saveToDb, 2000); 
      return () => clearTimeout(timer);
  }, [userState, messages]);

  useEffect(() => {
    if (!sessionExpiry || !userState.connectedAstrologerId) { setTimeLeft(''); return; }
    const interval = setInterval(() => {
        const diff = sessionExpiry - Date.now();
        if (diff <= 0) { clearInterval(interval); disconnectAstrologer(); setMessages(prev => [...prev, { id: generateId(), text: "System: Your 10-minute session has ended.", sender: Sender.SYSTEM, timestamp: new Date() }]); }
        else { const mins = Math.floor(diff / 60000); const secs = Math.floor((diff % 60000) / 1000); setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`); }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiry, userState.connectedAstrologerId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isAiThinking, view]);

  const updateDynamicSuggestions = (lastInput: string) => {
      const askedQuestions = new Set(messages.filter(m => m.sender === Sender.USER).map(m => m.text));
      askedQuestions.add(lastInput);
      const lowerInput = lastInput.toLowerCase();
      let newPool: string[] = [];
      Object.keys(TOPIC_QUESTIONS).forEach(keyword => { if (lowerInput.includes(keyword)) { newPool = [...newPool, ...TOPIC_QUESTIONS[keyword]]; } });
      if (newPool.length === 0) { newPool = [...SUGGESTED_QUESTIONS]; }
      const filteredPool = newPool.filter(q => !askedQuestions.has(q));
      setCurrentSuggestions(filteredPool.sort(() => 0.5 - Math.random()).slice(0, 4));
  };

  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isAiThinking) return;
    
    updateDynamicSuggestions(textToSend);
    if (userState.connectedAstrologerId) { setMessages(prev => [...prev, { id: generateId(), text: textToSend, sender: Sender.USER, timestamp: new Date() }]); setInput(''); return; }
    if (userState.dailyQuestionsLeft <= 0 && !userState.isAdminImpersonating) { setPremiumModalReason('Daily question limit reached.'); setShowPremiumModal(true); return; }
    
    setMessages(prev => [...prev, { id: generateId(), text: textToSend, sender: Sender.USER, timestamp: new Date() }]); 
    setInput(''); 
    setIsAiThinking(true);
    
    try {
      let apiPrompt = textToSend;
      const isPremiumUser = userState.isPremium || !!userState.isAdminImpersonating || userState.tier === 'member21';
      
      if (isPremiumUser) {
         apiPrompt = `${textToSend} (Be direct, precise, and to the point. Avoid generic fillers.)`;
      }
      
      const responseText = await sendMessageToGemini(apiPrompt, isPremiumUser);
      
      const hasDeepDive = responseText.includes("Deep Dive:");
      const shouldLock = hasDeepDive && !isPremiumUser;
      
      const lowerResponse = responseText.toLowerCase();
      const suggestedProducts = products.filter(p => {
          const nameWords = p.name.toLowerCase().split(' ');
          const cat = p.category.toLowerCase();
          return lowerResponse.includes(cat) || nameWords.some(w => w.length > 4 && lowerResponse.includes(w));
      }).slice(0, 1);

      setMessages(prev => [...prev, { 
        id: generateId(), 
        text: responseText, 
        sender: Sender.AI, 
        timestamp: new Date(), 
        isLocked: shouldLock, 
        metadata: shouldLock ? { status: 'locked' } : undefined,
        suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined 
      }]);

      if (!userState.isAdminImpersonating) setUserState(prev => ({ ...prev, dailyQuestionsLeft: prev.dailyQuestionsLeft - 1 }));
    } catch (error) { setMessages(prev => [...prev, { id: generateId(), text: "Clouded connection.", sender: Sender.AI, timestamp: new Date() }]); } 
    finally { setIsAiThinking(false); }
  };

  const handleSeekerEnter = () => setHasStarted(true);
  const handleAdminEnter = async () => { 
      setHasStarted(true); 
      setUserState(prev => ({ ...prev, hasOnboarded: true, name: 'Administrator', contact: 'ADMIN', isPremium: true, tier: 'premium', id: 'admin-uuid' }));
      const token = generateJWT('ADMIN');
      localStorage.setItem('astro_token', token);
      await logCommunication('system', 'ADMIN', 'internal', 'completed', 'Admin Session Started');
      setView(AppView.ADMIN_DASHBOARD); 
  };
  
  const handleImpersonateUser = async (targetUser: any) => {
      setIsGlobalLoading(true);
      setLoadingText(`Logging in as ${targetUser.name}...`);
      try {
          const { profile, chatHistory } = await fetchUserProfile(targetUser.contact);
          if (profile) {
              setUserState({ ...profile, id: profile.id, hasOnboarded: true, contact: profile.contact, name: profile.name, isPremium: profile.isPremium, tier: profile.tier, dailyQuestionsLeft: profile.dailyQuestionsLeft, birthDate: profile.birthDate, birthTime: profile.birthTime, birthPlace: profile.birthPlace, subscriptionExpiry: profile.subscriptionExpiry, language: 'en', isAdminImpersonating: true });
              const instr = generateSystemInstruction(profile.name, profile.gender, profile.birthDate, profile.birthTime, profile.birthPlace, 'en');
              initializeChat(instr).then(() => { if(chatHistory.length > 0) setMessages(chatHistory); else setMessages([{ id:generateId(), text:`[ADMIN MODE] ${profile.name}`, sender:Sender.SYSTEM, timestamp:new Date() }]); });
              setView(AppView.CHAT);
          }
      } catch (e) { alert("Failed to impersonate."); } finally { setIsGlobalLoading(false); }
  };

  const handleExitImpersonation = () => { setView(AppView.ADMIN_DASHBOARD); setUserState(prev => ({ ...prev, isAdminImpersonating: false, name: 'Administrator', contact: 'ADMIN', id: 'admin-uuid' })); };

  const handleSeekerLogin = async (contact: string) => {
      setHasStarted(true); 
      setIsGlobalLoading(true);
      setLoadingText("Retrieving destiny...");
      try {
          const { profile, chatHistory } = await fetchUserProfile([contact.trim()]);
          if (profile) {
              const token = generateJWT(profile.contact);
              localStorage.setItem('astro_token', token);
              
              // Check Subscription Expiry on Login
              let isPremium = profile.isPremium;
              let dailyQuestionsLeft = profile.dailyQuestionsLeft;
              let tier = profile.tier || 'free';
              
              if (profile.subscriptionExpiry) {
                  if (new Date() > new Date(profile.subscriptionExpiry)) {
                      isPremium = false;
                      tier = 'free';
                      dailyQuestionsLeft = INITIAL_DAILY_LIMIT;
                      // Update DB about expiry
                      saveUserProfile({ ...profile, isPremium: false, tier: 'free', dailyQuestionsLeft: INITIAL_DAILY_LIMIT });
                  }
              }

              setUserState(prev => ({ 
                  ...prev, 
                  id: profile.id, 
                  hasOnboarded: true, 
                  contact: profile.contact, 
                  name: profile.name, 
                  isPremium: isPremium, 
                  tier: tier,
                  dailyQuestionsLeft: dailyQuestionsLeft, 
                  birthDate: profile.birthDate, 
                  birthTime: profile.birthTime, 
                  birthPlace: profile.birthPlace, 
                  subscriptionExpiry: profile.subscriptionExpiry,
                  gender: profile.gender // Ensure gender is also carried over
              }));
              
              const instr = generateSystemInstruction(profile.name, profile.gender || '', profile.birthDate || '', profile.birthTime || '', profile.birthPlace || '', 'en');
              initializeChat(instr).then(() => { if(chatHistory.length>0) setMessages([...chatHistory, { id:generateId(), text:"Welcome back.", sender:Sender.SYSTEM, timestamp:new Date() }]); else setMessages([{ id:generateId(), text:`Welcome back, ${formatDisplayName(profile.name)}.`, sender:Sender.AI, timestamp:new Date() }]); });
          } else { setHasStarted(false); }
      } catch(e) { setHasStarted(false); } finally { setIsGlobalLoading(false); }
  };

  useEffect(() => {
    if (!hasStarted) {
        const params = new URLSearchParams(window.location.search);
        const userParam = params.get('user');

        if (userParam) {
            handleSeekerLogin(userParam);
        } else {
            const token = localStorage.getItem('astro_token');
            if (token) {
                const contact = verifyJWT(token);
                if (contact) { if (contact === 'ADMIN') handleAdminEnter(); else handleSeekerLogin(contact); }
                else { localStorage.removeItem('astro_token'); }
            }
        }
    }
  }, [hasStarted]);

  // Subscription Logic: Starts today, Ends (Today + 1 Month) - 1 Day
  const handleSubscriptionSuccess = () => {
      const now = new Date();
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + 1);
      expiry.setDate(expiry.getDate() - 1); // "Started on 2nd, ends on 1st"

      setUserState(prev => {
          const updated: UserState = {
              ...prev,
              isPremium: true,
              tier: 'premium',
              dailyQuestionsLeft: PREMIUM_DAILY_LIMIT,
              subscriptionExpiry: expiry
          };
          saveUserProfile(updated); // Sync new expiry to DB immediately
          return updated;
      });
      setShowPremiumModal(false);
      addTransaction(299, 'Subscription', `Premium until ${expiry.toLocaleDateString()}`);
      setMessages(prev => [...prev, { id: generateId(), text: `Subscription Active! Valid until ${expiry.toLocaleDateString()}.`, sender: Sender.SYSTEM, timestamp: new Date() }]);
  };

  const handleMember21Purchase = () => {
      initiatePayment(21, "Member 21 Initiation", () => {
          const now = new Date();
          const expiry = new Date(now);
          expiry.setFullYear(expiry.getFullYear() + 3); // 3 Years

          setUserState(prev => {
              const updated: UserState = {
                  ...prev,
                  isPremium: false, // Explicitly false so premium chat limits apply
                  tier: 'member21', // Custom tier
                  dailyQuestionsLeft: 0, // No daily refill, only topups
                  subscriptionExpiry: expiry
              };
              saveUserProfile(updated);
              return updated;
          });
          setShowPremiumModal(false);
          addTransaction(21, 'Subscription', `Member 21 (3 Years)`);
          setMessages(prev => [...prev, { 
              id: generateId(), 
              text: `Welcome to the 21 Club! Insights unlocked for 3 years. Use top-ups for chat.`, 
              sender: Sender.SYSTEM, 
              timestamp: new Date() 
          }]);
      });
  };

  const handleTopup = (cost: number, quantity: number) => {
      initiatePayment(cost, `${quantity} Questions Top-up`, () => {
          setUserState(prev => {
              const updated = {
                  ...prev,
                  dailyQuestionsLeft: (prev.dailyQuestionsLeft || 0) + quantity
              };
              saveUserProfile(updated);
              return updated;
          });
          addTransaction(cost, 'Product', `${quantity} Q Top-up`);
          setShowPremiumModal(false);
          setMessages(prev => [...prev, { 
              id: generateId(), 
              text: `Energy restored! ${quantity} questions added (Valid for 24h).`, 
              sender: Sender.SYSTEM, 
              timestamp: new Date() 
          }]);
      });
  };

  const handleOnboardingSubmit = async (data: OnboardingData, selectedTier: 'free' | 'premium' | 'member21') => {
      setIsGlobalLoading(true);
      setLoadingText("Creating Cosmic Profile...");

      // SAFETY: Ensure we have the AUTH ID if it wasn't passed from Onboarding
      let finalUserId = data.userId;
      if (!finalUserId && supabase) {
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
              finalUserId = authData.user.id;
          }
      }

      // 1. Create Base User State
      const uniqueName = data.name;
      const baseUser: UserState = { 
          ...userState, 
          id: finalUserId, // Critical for Foreign Key constraints
          name: uniqueName, 
          contact: data.contact, 
          gender: data.gender, 
          birthDate: data.date, 
          birthTime: data.time, 
          birthPlace: data.place, 
          isPremium: false, 
          tier: 'free',
          dailyQuestionsLeft: INITIAL_DAILY_LIMIT, 
          hasOnboarded: true,
          language: userState.language || 'en',
          subscriptionExpiry: undefined
      };

      // 2. Save Profile Immediately (Base) BEFORE Payment
      try {
          await saveUserProfile(baseUser, data.password);
          setUserState(baseUser);
          
          const token = generateJWT(baseUser.contact || 'User');
          localStorage.setItem('astro_token', token);
      } catch (e) {
          console.error("Profile Save Error:", e);
          setIsGlobalLoading(false);
          alert("Failed to create profile. Please check your connection.");
          return;
      }

      // 3. Define Finalize Logic (Chat Generation)
      const finalizeOnboarding = async (finalUser: UserState) => {
          setLoadingText("Aligning Stars...");
          try {
              const instr = generateSystemInstruction(uniqueName, data.gender, data.date, data.time, data.place, finalUser.language);
              await initializeChat(instr);
              
              const cacheKey = `${data.name.trim().toLowerCase()}_${data.date}_${data.time}_${data.place.trim().toLowerCase()}`.replace(/\s+/g, '_');
              let txt = await fetchCachedReading(cacheKey);

              if (!txt) {
                  let prompt = "Initial Overview: Name, Challenges, Vastu Hint, Warning. Deep Dive: Full Vastu.";
                  const treatAsPremium = finalUser.isPremium || finalUser.tier === 'member21';
                  
                  if (treatAsPremium) {
                      prompt = `
                      I AM A PREMIUM SEEKER. GENERATE A DIVINE, STRUCTURED ASTROLOGICAL DECREE.
                      STRICTLY FOLLOW THIS STRUCTURE:
                      1. **Divine Greeting**: Welcoming the soul (Higher Being tone).
                      2. **Spiritual Significance of Name**: Meaning of ${uniqueName}.
                      3. **Cosmic Blueprint (Birth Chart)**: Lagna, Moon Sign, Key Yogas (Raj Yogas/Dhan Yogas).
                      4. **Time's Current Flow**: Current Dasha/Period analysis.
                      5. **Immediate Remedy**: One powerful, actionable ritual.
                      6. **Vastu Architecture**: ASCII Map with specific defects.
                      7. **Gemstones & Mantras**: Specific recommendations (mention 'Coral', 'Sapphire', or 'Rudraksha' if applicable to trigger shop).
                      8. **Closing Blessing**.
                      Deep Dive: Detailed planetary nuances.
                      `;
                  }
                  
                  txt = await sendMessageToGemini(prompt, treatAsPremium);
                  if (txt && txt.length > 50) await saveCachedReading(cacheKey, txt);
              }

              const lowerResponse = txt?.toLowerCase() || "";
              const suggestedProducts = products.filter(p => {
                  const nameWords = p.name.toLowerCase().split(' ');
                  const cat = p.category.toLowerCase();
                  return lowerResponse.includes(cat) || nameWords.some(w => w.length > 4 && lowerResponse.includes(w));
              }).slice(0, 1);
              
              const hasDeepDive = txt?.includes("Deep Dive:");
              const shouldLock = hasDeepDive && !finalUser.isPremium && finalUser.tier !== 'member21';

              setMessages([{
                  id: generateId(), 
                  text: txt || "Welcome.", 
                  sender: Sender.AI, 
                  timestamp: new Date(), 
                  isLocked: shouldLock, 
                  metadata: shouldLock ? { status: 'locked' } : undefined,
                  suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined
              }]);
          } catch(e) { console.error(e); } 
          finally { setIsGlobalLoading(false); }
      };

      // 4. Handle Payment Flow (Post-User Creation)
      if (selectedTier === 'premium' || selectedTier === 'member21') {
          const cost = selectedTier === 'premium' ? 299 : 21;
          const desc = selectedTier === 'premium' ? "Premium Access" : "Member 21 Initiation";
          
          setIsGlobalLoading(false); // Hide loader to show payment modal

          initiatePayment(cost, desc, async () => {
              setIsGlobalLoading(true);
              setLoadingText("Upgrading Cosmic Energy...");
              
              let dailyLimit = INITIAL_DAILY_LIMIT;
              let expiryDate: Date | undefined = undefined;
              let isPremium = false;
              
              if (selectedTier === 'premium') {
                  dailyLimit = PREMIUM_DAILY_LIMIT;
                  const now = new Date();
                  const expiry = new Date(now);
                  expiry.setMonth(expiry.getMonth() + 1);
                  expiry.setDate(expiry.getDate() - 1);
                  expiryDate = expiry;
                  isPremium = true;
              } else if (selectedTier === 'member21') {
                  dailyLimit = 0; 
                  const now = new Date();
                  const expiry = new Date(now);
                  expiry.setFullYear(expiry.getFullYear() + 3);
                  expiryDate = expiry;
                  isPremium = false;
              }

              const upgradedUser: UserState = {
                  ...baseUser,
                  isPremium,
                  tier: selectedTier,
                  dailyQuestionsLeft: dailyLimit,
                  subscriptionExpiry: expiryDate
              };

              // Update User with Premium/Member Status
              await saveUserProfile(upgradedUser);
              setUserState(upgradedUser);

              addTransaction(cost, 'Subscription', desc, upgradedUser);
              await finalizeOnboarding(upgradedUser);
          }, data.contact);
      } else {
          // Free Tier - Proceed directly
          await finalizeOnboarding(baseUser);
      }
  };

  const handleLogout = () => { localStorage.removeItem('astro_token'); setHasStarted(false); setUserState({ dailyQuestionsLeft: INITIAL_DAILY_LIMIT, isPremium: false, tier: 'free', name: '', gender: '', contact: '', hasOnboarded: false, birthDate: '', birthTime: '', birthPlace: '', language: 'en' }); setMessages([]); setView(AppView.CHAT); };
  const handleLanguageChange = (lang: Language) => { setUserState(prev => ({ ...prev, language: lang })); setHoroscopeData(undefined); };
  
  // FIXED: Expanded credential verification to try common phone formats
  const verifyUserCredentials = async (c: string, p: string): Promise<boolean | string> => { 
      const variations = [c, c.trim()];
      // If input is purely digits, try adding common country codes
      if (/^\d+$/.test(c.trim())) {
          variations.push(`+91${c.trim()}`); 
          variations.push(`+1${c.trim()}`); 
          variations.push(`+44${c.trim()}`);
      }
      
      const { profile } = await fetchUserProfile(variations);
      
      if (profile && profile.password) {
          const isMatch = await verifyPassword(p, profile.password);
          if (isMatch) return profile.contact; // Return the correct contact string
      }
      return false; 
  };

  const initiatePayment = (amount: number, desc: string, success: () => void, contact?: string) => { setPendingPayment({ amount, description: desc, onSuccess: success, contact }); setShowPaymentConfirmation(true); };
  const updateEarnings = (id: string, type: keyof Earnings, amt: number) => setAstrologerEarnings(p => ({...p, [id]: {...(p[id]||{chats:0,products:0,tips:0,withdrawn:0}), [type]: (p[id]?.[type]||0)+amt}}));
  
  const addTransaction = (amt: number, type: 'Product' | 'Subscription' | 'Dakshina' | 'Consultation', det: string, userOverride?: UserState) => { 
      const currentUser = userOverride || userState;
      const tx:Transaction={ 
          id: generateReferenceId(type, det), 
          userId: currentUser.id || currentUser.contact || 'u', 
          userName: currentUser.name || 'Guest', 
          amount:amt, type, status:'Success', date:new Date().toISOString().split('T')[0], details:det 
      }; 
      setTransactions(p=>[tx,...p]); saveTransaction(tx); 
  };
  
  const proceedToRazorpay = () => { 
      if(pendingPayment && window.Razorpay) { 
          // Helper to create options safely
          const createOptions = (key: string) => ({ 
              key: key.trim(), // Ensure no whitespace
              amount: pendingPayment.amount * 100, 
              currency: "INR", 
              name: "ASTRO-VASTU", 
              description: pendingPayment.description, 
              handler: () => { pendingPayment.onSuccess(); setShowPaymentConfirmation(false); }, 
              prefill: { contact: pendingPayment.contact },
              theme: { color: "#DAA520" }
          });
          
          try {
              // Attempt with configured key (Primary)
              // Ensure we fallback to Test if Primary is missing or obviously garbage (empty)
              const primaryKey = RAZORPAY_KEY_ID && RAZORPAY_KEY_ID.length > 5 ? RAZORPAY_KEY_ID : TEST_RAZORPAY_KEY;
              
              const rzp = new window.Razorpay(createOptions(primaryKey));
              rzp.open();
          } catch (e) {
              console.warn("Primary Key Failed, falling back to Test Key");
              try {
                  const rzpTest = new window.Razorpay(createOptions(TEST_RAZORPAY_KEY));
                  rzpTest.open();
              } catch (e2) {
                  alert("Payment Gateway Unavailable. Please try again later.");
              }
          }
      } else alert("Razorpay offline"); 
  };

  const initiateProductPurchase = (p: Product) => { setSelectedProductForPurchase(p); setShippingDetails({ address:'', city:'', pincode:'', phone:'' }); setShowAddressModal(true); };
  const confirmPurchaseWithAddress = () => { if(!selectedProductForPurchase) return; initiatePayment(selectedProductForPurchase.price, selectedProductForPurchase.name, () => { addTransaction(selectedProductForPurchase!.price, 'Product', selectedProductForPurchase!.name); setMessages(p=>[...p, {id:generateId(), text:`Purchased ${selectedProductForPurchase!.name}`, sender:Sender.SYSTEM, timestamp:new Date()}]); setShowAddressModal(false); }); };
  const handleUnlockMessage = (id: string) => setMessages(p => p.map(m => m.id===id ? {...m, isLocked:false} : m));
  const handleGuruDakshina = (amt: number) => initiatePayment(amt, 'Dakshina', () => { if(userState.connectedAstrologerId) updateEarnings(userState.connectedAstrologerId, 'tips', amt*0.8); addTransaction(amt, 'Dakshina', 'Tip'); setShowTipModal(false); });
  const connectToAstrologer = (a: Astrologer) => { if(!userState.isPremium && !userState.isAdminImpersonating) { setPremiumModalReason("Premium Required"); setShowPremiumModal(true); return; } initiatePayment(a.pricePerMin*10, 'Session', () => { setUserState(p=>({...p, connectedAstrologerId:a.id})); setSessionExpiry(Date.now()+600000); setRatingTarget(a); setView(AppView.CHAT); }); };
  const disconnectAstrologer = () => { setUserState(p=>({...p, connectedAstrologerId:undefined})); setSessionExpiry(null); setCallState(p=>({...p, isActive:false})); setShowRatingModal(true); };
  const handleAcceptCall = (mid: string, t: 'voice'|'video') => { if(userState.connectedAstrologerId) setCallState({isActive:true, type:t, partnerName:'Guru', partnerImage:'', channelName:userState.connectedAstrologerId, messageId:mid}); };
  const handleCallEnd = (d: number) => { setCallState(p=>({...p, isActive:false})); if(callState.messageId) setMessages(p=>p.map(m=>m.id===callState.messageId ? {...m, metadata:{...m.metadata, callStatus:'ended', durationText:`${d}s`}} : m)); };
  const handleAstrologerAction = (act: string, pl: any) => { if(act==='call') { setMessages(p=>[...p, {id:generateId(), text:'Incoming Call', sender:Sender.ASTROLOGER, type:MessageType.CALL_OFFER, metadata:{callType:pl.type}, timestamp:new Date()}]); setCallState({isActive:true, type:pl.type, partnerName:'User', partnerImage:'', channelName:pl.astroId}); } else if(act==='reply') setMessages(p=>[...p,{id:generateId(), text:pl, sender:Sender.ASTROLOGER, timestamp:new Date()}]); else if(act==='end_session') disconnectAstrologer(); };
  const openHistory = (tab: any) => { setHistoryTab(tab); setShowHistoryModal(true); setIsSidebarOpen(false); };
  const startRecording = () => { if(window.webkitSpeechRecognition) { const r = new window.webkitSpeechRecognition(); r.onresult = (e:any) => setInput(p=>p+e.results[0][0].transcript); r.start(); setIsRecording(true); r.onend=()=>setIsRecording(false); } };
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const handleViewChange = (newView: AppView) => {
      // Restriction Logic for Member 21
      if (userState.tier === 'member21' && (newView === AppView.MARKETPLACE || newView === AppView.SHOP)) {
          alert("🔒 Feature Restricted for Member 21.\nUpgrade to Premium for Guru Access and Shopping.");
          return;
      }
      setView(newView);
  };

  if (isGlobalLoading) return <FullScreenLoader text={loadingText} />;
  if (!hasStarted) return <LandingPage onSeekerEnter={handleSeekerEnter} onSeekerLogin={handleSeekerLogin} onVerifyCredentials={verifyUserCredentials} onGuruEnter={() => { setHasStarted(true); setUserState(p=>({...p, hasOnboarded:true})); setView(AppView.ASTRO_DASHBOARD); }} onAdminEnter={handleAdminEnter} />;
  if (view === AppView.ADMIN_DASHBOARD) return (
      <div className="relative min-h-screen">
          <StarBackground />
          <div className="relative z-10 h-screen">
            <AdminDashboard 
                products={products} 
                transactions={transactions} 
                astrologers={astrologers} 
                users={users} 
                commLogs={commLogs}
                onUpdateProducts={setProducts} 
                onLogout={handleLogout} 
                onImpersonate={handleImpersonateUser}
                onRefresh={refreshData} 
            />
          </div>
      </div>
  );

  return (
    <div className="relative min-h-screen font-sans text-mystic-100 flex flex-col bg-mystic-900 overflow-hidden">
      <StarBackground />
      {userState.hasOnboarded && <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={userState} onNavigate={(v) => { if(v==='chart') setShowChartModal(true); else if (v === 'upgrade') { setPremiumModalReason('Upgrade Plan'); setShowPremiumModal(true); } else handleViewChange(v as AppView); setIsSidebarOpen(false); }} onOpenProfile={() => { setShowProfileModal(true); setIsSidebarOpen(false); }} onOpenHistory={openHistory} onLogout={handleLogout} onLanguageChange={handleLanguageChange} />}
      {showHistoryModal && <HistoryModal transactions={transactions.filter(t => t.userId === userState.contact || t.userId === userState.id)} onClose={() => setShowHistoryModal(false)} initialTab={historyTab} />}
      {callState.isActive && <CallInterface partnerName={callState.partnerName} partnerImage={callState.partnerImage} callType={callState.type} onEndCall={handleCallEnd} channelName={callState.channelName || 'default'} />}
      {userState.isAdminImpersonating && <button onClick={handleExitImpersonation} className="fixed bottom-24 right-4 z-[60] bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-full shadow-2xl border-2 border-orange-400 animate-bounce">🚪 Exit Admin Mode</button>}

      {userState.hasOnboarded && (
          <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-mystic-900/95 backdrop-blur-2xl transition-all shadow-2xl">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gold-400 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg></button>
                <div className="flex flex-col items-start gap-1">
                    <div className="flex bg-white/5 rounded-full p-0.5 border border-white/10 text-[10px] font-bold">
                        <button onClick={() => handleLanguageChange('en')} className={`px-2 py-0.5 rounded-full transition-all ${userState.language === 'en' ? 'bg-gold-500 text-mystic-900' : 'text-mystic-400'}`}>EN</button>
                        <button onClick={() => handleLanguageChange('hi')} className={`px-2 py-0.5 rounded-full transition-all ${userState.language === 'hi' ? 'bg-gold-500 text-mystic-900' : 'text-mystic-400'}`}>HI</button>
                    </div>
                    <h1 className="text-xl md:text-2xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-mystic-200 truncate">{t.appName}</h1>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {userState.connectedAstrologerId && <div className="text-[10px] text-green-400 font-bold border border-green-500/30 px-2 py-1 rounded-full animate-pulse">LIVE {timeLeft}</div>}
                {userState.connectedAstrologerId && <button onClick={disconnectAstrologer} className="bg-red-900/30 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase">{t.endChat}</button>}
                <div className="hidden md:flex bg-white/5 rounded-full p-1 border border-white/10">
                    {[AppView.CHAT, AppView.HOROSCOPE, AppView.MARKETPLACE, AppView.SHOP].map((v) => (
                        <button key={v} onClick={() => handleViewChange(v)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all relative ${view === v ? 'bg-mystic-100 text-mystic-900' : 'text-mystic-400 hover:text-white'}`}>
                            {userState.tier === 'member21' && (v === AppView.MARKETPLACE || v === AppView.SHOP) && <span className="absolute -top-1 -right-1 text-[8px]">🔒</span>}
                            {v === AppView.HOROSCOPE ? 'Insights' : v === AppView.CHAT ? t.chat : v === AppView.MARKETPLACE ? t.gurus : t.shop}
                        </button>
                    ))}
                </div>
            </div>
          </header>
      )}

      <main className={`relative z-10 flex-1 flex flex-col max-w-5xl w-full mx-auto h-screen ${userState.hasOnboarded ? 'pt-20 md:pt-24' : ''}`}>
        {!userState.hasOnboarded ? (
            <UserOnboarding onSubmit={handleOnboardingSubmit} onGuruLogin={() => { setHasStarted(true); setUserState(p=>({...p, hasOnboarded:true})); setView(AppView.ASTRO_DASHBOARD); }} />
        ) : (
            <>
                {view === AppView.ASTRO_DASHBOARD ? (
                    <AstrologerDashboard activeUser={userState} messages={messages} onAction={handleAstrologerAction} earnings={astrologerEarnings} astrologers={astrologers} products={products} />
                ) : view === AppView.HOROSCOPE ? (
                    <HoroscopeView user={userState} horoscopeData={horoscopeData} isLoading={isGeneratingHoroscope} onSendYearlyReport={handleSendYearlyReport} />
                ) : view === AppView.CHAT ? (
                    <div className="flex flex-col h-full animate-in fade-in duration-500 relative">
                        <div ref={chatContainerRef} onScroll={() => setShowScrollButton(chatContainerRef.current ? chatContainerRef.current.scrollHeight - chatContainerRef.current.scrollTop - chatContainerRef.current.clientHeight > 100 : false)} className="flex-1 overflow-y-auto scrollbar-hide pr-2 pb-48 pt-4 px-4 md:px-0 scroll-smooth">
                            {messages.map((msg) => <MessageBubble key={msg.id} message={msg} onUnlock={handleUnlockMessage} onPay={(a) => handleGuruDakshina(a)} onAcceptCall={handleAcceptCall} onSubscribe={() => { setPremiumModalReason(''); setShowPremiumModal(true); }} onBuyProduct={initiateProductPurchase} userHasPremium={userState.isPremium || !!userState.isAdminImpersonating || userState.tier === 'member21'} userName={userState.name} language={userState.language || 'en'} astrologers={astrologers} />)}
                            {isAiThinking && <ThinkingBubble />}
                            <div ref={messagesEndRef} />
                        </div>
                        {showScrollButton && <button onClick={scrollToBottom} className="fixed bottom-36 right-6 md:right-[calc(50%-20px)] md:left-auto md:translate-x-full z-40 bg-mystic-800 p-3 rounded-full border border-gold-500/30 shadow-lg text-gold-400 hover:bg-mystic-700 transition-all animate-bounce">↓</button>}
                        <div className="fixed bottom-0 left-0 w-full z-40 pointer-events-none">
                            <div className="max-w-5xl mx-auto relative px-4 pb-6 pt-4 bg-gradient-to-t from-mystic-900 via-mystic-900 to-transparent pointer-events-auto">
                                {!isAiThinking && !userState.connectedAstrologerId && (
                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1">{currentSuggestions.map((q, i) => (<button key={i} onClick={() => handleSendMessage(q)} disabled={isAiThinking} className="whitespace-nowrap px-3 py-1.5 bg-mystic-800/80 hover:bg-gold-500/20 border border-mystic-600 rounded-full text-xs text-mystic-200 disabled:opacity-50 transition-colors">✨ {q}</button>))}</div>
                                )}
                                <div className="relative flex items-center bg-mystic-800/80 backdrop-blur-xl border border-mystic-600/30 rounded-full p-2 shadow-2xl gap-2">
                                    {(userState.dailyQuestionsLeft <= 0 && !userState.connectedAstrologerId && !userState.isAdminImpersonating) ? (
                                        <button 
                                            onClick={() => { 
                                                setPremiumModalReason('Recharge to continue chatting.'); 
                                                setShowPremiumModal(true); 
                                            }}
                                            className="flex-1 flex items-center justify-between bg-mystic-800/80 border border-red-500/30 rounded-full p-2 pl-4 cursor-pointer hover:bg-mystic-800 transition-all group w-full"
                                        >
                                           <span className="text-gray-400 text-sm font-medium">Daily limit reached...</span>
                                           <span className="bg-gold-500 text-mystic-900 font-bold text-xs px-4 py-2 rounded-full group-hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/20">
                                              Recharge / Upgrade
                                           </span>
                                        </button>
                                    ) : (
                                        <>
                                            <button onMouseDown={startRecording} className={`p-2 transition-all rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-mystic-400 hover:text-white'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={userState.connectedAstrologerId ? "Message Guru..." : t.typeMessage} disabled={isAiThinking} className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-mystic-400 px-2 py-2 font-sans text-lg outline-none disabled:opacity-50" />
                                            <button onClick={() => handleSendMessage()} disabled={!input.trim() || isAiThinking} className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-105"><svg className="w-6 h-6 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : view === AppView.MARKETPLACE ? (
                    <div className="flex-1 overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-right-4 duration-300 p-4 md:p-0">
                        <div className="text-center mb-8 mt-4"><h2 className="text-3xl font-serif text-white mb-2">{t.gurus}</h2><p className="text-mystic-300">Consult verified astrologers.</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">{astrologers.map(astro => (<AstroCard key={astro.id} astrologer={astro} onConnect={connectToAstrologer} connectedAstrologerId={userState.connectedAstrologerId}/>))}</div>
                    </div>
                ) : ( <Shop products={products} onBuy={initiateProductPurchase} /> )}
            </>
        )}
      </main>

      {showPaymentConfirmation && pendingPayment && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"><div className="bg-mystic-800 p-8 rounded-3xl text-center"><h3 className="text-xl font-serif text-white mb-2">Confirm Payment</h3><p className="text-mystic-300 mb-6">₹{pendingPayment.amount}</p><div className="flex gap-3"><button onClick={()=>setShowPaymentConfirmation(false)} className="flex-1 bg-white/5 py-3 rounded-xl text-white">Cancel</button><button onClick={proceedToRazorpay} className="flex-1 bg-gold-500 py-3 rounded-xl text-black font-bold">Pay Now</button></div></div></div>}
      {showChartModal && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90"><div className="bg-mystic-900 border border-gold-500/50 p-6 rounded-3xl w-full max-w-lg relative"><button onClick={()=>setShowChartModal(false)} className="absolute top-4 right-4 text-white">✕</button><NatalChart name={userState.name} date={userState.birthDate||''} time={userState.birthTime||''} place={userState.birthPlace||''} allowDownload={true} isPremium={userState.isPremium} onUnlock={()=>{setShowChartModal(false);setShowPremiumModal(true)}}/></div></div>}
      {showProfileModal && <ProfileModal user={userState} onSave={(u)=>setUserState(p=>({...p,...u}))} onClose={()=>setShowProfileModal(false)}/>}
      {showTipModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><div className="bg-mystic-800 p-6 rounded-2xl w-full max-w-xs text-center"><h3 className="text-gold-400 mb-4">Support Guru</h3><input type="number" value={tipAmount} onChange={e=>setTipAmount(e.target.value)} className="w-full bg-mystic-900 p-2 mb-4 text-white text-center"/><button onClick={()=>{const a=Number(tipAmount); if(a>0) handleGuruDakshina(a)}} className="w-full bg-gold-500 text-black font-bold py-2 rounded">Send</button><button onClick={()=>setShowTipModal(false)} className="mt-3 text-xs text-gray-400">Cancel</button></div></div>}
      {showAddressModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"><div className="bg-mystic-800 p-6 rounded-3xl w-full max-w-md"><h4 className="font-bold text-white mb-4">Shipping</h4><input value={shippingDetails.address} onChange={e=>setShippingDetails({...shippingDetails, address:e.target.value})} placeholder="Address" className="w-full bg-mystic-900 p-3 mb-2 text-white rounded"/><input value={shippingDetails.city} onChange={e=>setShippingDetails({...shippingDetails, city:e.target.value})} placeholder="City" className="w-full bg-mystic-900 p-3 mb-2 text-white rounded"/><button onClick={confirmPurchaseWithAddress} className="w-full bg-gold-500 text-black font-bold py-3 rounded mt-4">Proceed</button><button onClick={()=>setShowAddressModal(false)} className="w-full mt-2 text-gray-400">Cancel</button></div></div>}
      {showRatingModal && ratingTarget && <RatingModal guruName={ratingTarget.name} guruImage={ratingTarget.imageUrl} onSubmit={()=>setShowRatingModal(false)} onSkip={()=>setShowRatingModal(false)}/>}
      
      {showPremiumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-mystic-900 border border-gold-500/30 p-6 md:p-8 rounded-3xl w-full max-w-md relative shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
                  <button onClick={()=>setShowPremiumModal(false)} className="absolute top-4 right-4 text-mystic-500 hover:text-white transition-colors">✕</button>
                  
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-gold-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                          ⚡
                      </div>
                      <h3 className="text-2xl font-serif text-white mb-2">Recharge Energy</h3>
                      <p className="text-gold-400 text-sm">{premiumModalReason || "Your daily cosmic questions are exhausted."}</p>
                  </div>

                  {/* Top-up Packs */}
                  <div className="space-y-3 mb-6">
                      <p className="text-[10px] text-mystic-500 uppercase tracking-widest font-bold mb-2 text-center">Instant Top-ups (Valid 24h)</p>
                      
                      {/* 1 for 99 */}
                      <button 
                          onClick={() => handleTopup(99, 1)}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-gold-500/50 p-3 rounded-xl flex justify-between items-center transition-all group"
                      >
                          <div className="text-left">
                              <p className="font-bold text-white group-hover:text-gold-400">1 Question</p>
                              <p className="text-[10px] text-mystic-400">Quick Answer</p>
                          </div>
                          <div className="text-right">
                              <p className="font-mono font-bold text-white">₹99</p>
                          </div>
                      </button>

                      {/* 5 for 259 */}
                      <button 
                          onClick={() => handleTopup(259, 5)}
                          className="w-full bg-gradient-to-r from-mystic-800 to-mystic-700 border border-gold-500/50 hover:border-gold-500 p-3 rounded-xl flex justify-between items-center transition-all relative overflow-hidden group shadow-lg shadow-gold-500/10"
                      >
                          <div className="absolute top-0 left-0 bg-gold-500 text-mystic-900 text-[8px] font-bold px-2 py-0.5 rounded-br">BEST DEAL</div>
                          <div className="text-left ml-2">
                              <p className="font-bold text-white group-hover:text-gold-300">5 Questions</p>
                              <p className="text-[10px] text-mystic-400">₹51.8 / question</p>
                          </div>
                          <div className="text-right">
                              <p className="font-mono font-bold text-gold-400 text-lg">₹259</p>
                              <p className="text-[10px] text-green-400 line-through">₹495</p>
                          </div>
                      </button>

                      {/* 10 for 789 */}
                      <button 
                          onClick={() => handleTopup(789, 10)}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-gold-500/50 p-3 rounded-xl flex justify-between items-center transition-all group"
                      >
                          <div className="text-left">
                              <p className="font-bold text-white group-hover:text-gold-400">10 Questions</p>
                              <p className="text-[10px] text-mystic-400">Deep Analysis Pack</p>
                          </div>
                          <div className="text-right">
                              <p className="font-mono font-bold text-white">₹789</p>
                          </div>
                      </button>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                      <p className="text-[10px] text-mystic-500 uppercase tracking-widest font-bold mb-3 text-center">Membership Options</p>
                      
                      {/* Premium */}
                      <button onClick={handleSubscriptionSuccess} className="w-full bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-mystic-950 font-bold py-4 rounded-xl mb-3 shadow-lg transition-transform active:scale-[0.98]">
                          Subscribe Premium (₹299/mo)
                          <span className="block text-[9px] font-medium opacity-80 mt-1">10 Qs/Day + All Features</span>
                      </button>

                      {/* Member 21 */}
                      {userState.tier === 'member21' ? (
                          <div className="w-full bg-gradient-to-r from-indigo-900/40 to-mystic-800 border border-indigo-500/50 p-4 rounded-xl mb-2 flex items-center justify-between shadow-lg">
                              <div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-green-400 font-bold text-lg">✓</span>
                                      <span className="text-white font-bold text-sm">Member 21 Active</span>
                                  </div>
                                  <p className="text-[10px] text-indigo-300">Plan active until {userState.subscriptionExpiry?.getFullYear()}</p>
                              </div>
                              <div className="text-right">
                                   <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 uppercase tracking-widest font-bold">Current Tier</span>
                              </div>
                          </div>
                      ) : (
                          <button 
                              onClick={handleMember21Purchase}
                              className="w-full bg-indigo-900/50 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-100 font-bold py-3 rounded-xl mb-2 flex items-center justify-between px-4 group transition-colors"
                          >
                              <div className="text-left">
                                  <div className="flex items-center gap-2">
                                      <span>become a 21member</span>
                                      <span className="bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded">3 Years</span>
                                  </div>
                                  <span className="block text-[9px] text-indigo-300 mt-1">Initial Reading + Full Insights Only</span>
                              </div>
                              <div className="text-right">
                                  <span className="text-xl font-bold font-mono">₹21</span>
                              </div>
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
