
import { loadRazorpay } from './utils/razorpay';
import React, { useState, useEffect, useRef } from 'react';
import { Sender, Message, UserState, AppView, Astrologer, MessageType, CallState, Product, Earnings, Transaction, HoroscopeData, Language, CommunicationLog } from './types';
import { INITIAL_DAILY_LIMIT, PREMIUM_DAILY_LIMIT, generateSystemInstruction, SUGGESTED_QUESTIONS, TOPIC_QUESTIONS, RAZORPAY_KEY_ID, TEST_RAZORPAY_KEY, TRANSLATIONS, MOCK_PRODUCTS, MOCK_ASTROLOGERS, formatDisplayName } from './constants';
import { initializeChat, sendMessageToGemini, generateJsonContent } from './services/geminiService';
import { fetchProducts, fetchTransactions, saveTransaction, fetchUserProfile, saveUserProfile, seedDatabase, fetchAstrologers, subscribeToTable, logCommunication, generateUniqueUsername, generateReferenceId, fetchCachedReading, saveCachedReading, fetchProfiles, fetchCommunicationLogs } from './services/dbService';
import { verifyPassword, generateJWT, verifyJWT } from './services/securityService';
import { supabase } from './services/supabaseClient'; 
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

// --- DATE HELPERS FOR IST ---
const getISTDate = () => {
    // Returns YYYY-MM-DD in Asia/Kolkata
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); 
};

const getISTMonth = () => {
    // Returns YYYY-MM
    return getISTDate().substring(0, 7);
};

const getISTWeekStart = () => {
    // Returns YYYY-MM-DD of the most recent Sunday in IST
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - day; // adjust when day is sunday
    const sunday = new Date(now.setDate(diff));
    return sunday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const getISTWeekRange = () => {
    const start = getISTWeekStart();
    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // Saturday
    
    // Format: "Oct 22 - Oct 28"
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
};

declare global {
  interface Window {
    Razorpay: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const getZodiacSign = (dateString: string): string => {
    if (!dateString) return "Aries";
    // Fix: Parse YYYY-MM-DD manually to avoid Timezone offsets
    const parts = dateString.split('-');
    if (parts.length !== 3) return "Aries"; // Fallback
    
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

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
  
  // Initialize userState with stored language if available
  const [userState, setUserState] = useState<UserState>(() => {
      const storedLang = localStorage.getItem('astro_language') as Language;
      return { 
          id: undefined, 
          dailyQuestionsLeft: INITIAL_DAILY_LIMIT, 
          isPremium: false, 
          tier: 'free', 
          name: '', 
          gender: '', 
          contact: '', 
          hasOnboarded: false, 
          birthDate: '', 
          birthTime: '', 
          birthPlace: '', 
          language: storedLang || 'en' 
      };
  });

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
  const [pendingPayment, setPendingPayment] = useState<{ amount: number; description: string; onSuccess: (paymentId?: string) => void; contact?: string; } | null>(null);
  const [missingContactInfo, setMissingContactInfo] = useState('');
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

  // --- Post-Payment Language Selection ---
  const [showLanguageSelectionModal, setShowLanguageSelectionModal] = useState(false);
  const [pendingOnboardingData, setPendingOnboardingData] = useState<{user: UserState, cost: number, desc: string} | null>(null);

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
      // Regenerate if view is Horoscope AND user has onboarded.
      // Will handle language change logic inside the function.
      if (view === AppView.HOROSCOPE && userState.hasOnboarded) {
          generateFullHoroscope();
      }
  }, [view, userState.hasOnboarded, userState.language]); // Added userState.language dep

  const generateFullHoroscope = async () => {
      // 1. Check if we need to generate anything based on cached data timestamps
      const todayIST = getISTDate();
      const thisWeekIST = getISTWeekStart(); // Sunday Date
      const weekRange = getISTWeekRange(); // "Oct 27 - Nov 02"
      const thisMonthIST = getISTMonth();
      
      const cacheKey = `horoscope_v3_${userState.id || userState.contact}_${userState.language}`;
      
      // Fetch existing cache
      let cachedData: HoroscopeData | null = null;
      try {
          const raw = await fetchCachedReading(cacheKey);
          if (raw) cachedData = JSON.parse(raw);
      } catch (e) { console.error("Cache parse error", e); }

      // Determine what is stale or language mismatch
      const isDailyStale = cachedData?.meta?.dailyDate !== todayIST;
      const isWeeklyStale = cachedData?.meta?.weekDate !== thisWeekIST;
      const isMonthlyStale = cachedData?.meta?.monthDate !== thisMonthIST;
      const isLanguageMismatch = cachedData?.language !== userState.language;

      // If nothing is stale and language matches, just set state and return
      if (cachedData && !isDailyStale && !isWeeklyStale && !isMonthlyStale && !isLanguageMismatch) {
          setHoroscopeData(cachedData);
          return;
      }

      setIsGeneratingHoroscope(true);
      const sign = getZodiacSign(userState.birthDate || '');
      
      // We will build a new object merging old valid data with new data
      const newData: HoroscopeData = {
          starSign: sign,
          language: userState.language,
          meta: {
              dailyDate: todayIST,
              weekDate: thisWeekIST,
              monthDate: thisMonthIST
          },
          daily: (!isLanguageMismatch && cachedData?.daily) ? cachedData.daily : { overview: '', simple_overview: '', dos: [], donts: [], luckyColor: '', luckyNumber: '' },
          weekly: (!isLanguageMismatch && cachedData?.weekly) ? cachedData.weekly : '',
          monthly: (!isLanguageMismatch && cachedData?.monthly) ? cachedData.monthly : ''
      };

      // Map language code to full name for prompt
      const langMap: Record<string, string> = {
          'en': 'ENGLISH',
          'hi': 'HINDI (Devanagari)',
          'te': 'TELUGU',
          'mr': 'MARATHI',
          'ml': 'MALAYALAM',
          'pa': 'PUNJABI (Gurmukhi)'
      };
      const langPrompt = langMap[userState.language] || 'ENGLISH';

      // Retry Helper
      const generateWithRetry = async (prompt: string, schema: Schema, maxRetries = 3): Promise<any> => {
          for (let i = 0; i < maxRetries; i++) {
              try {
                  const res = await generateJsonContent(prompt, 2000, schema);
                  if (res) return res;
                  console.warn(`Attempt ${i + 1} returned empty for insights.`);
              } catch (e) {
                  console.warn(`Attempt ${i + 1} failed for insights`, e);
              }
              if (i < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, 2000));
          }
          return null;
      };

      try {
          // --- GENERATE DAILY (if stale or lang change) ---
          if (isDailyStale || isLanguageMismatch) {
              const dailyPrompt = `
                Generate Daily Horoscope for ${userState.name} (${sign}). 
                Date: ${todayIST}.
                Inputs: Born ${userState.birthDate} at ${userState.birthPlace}.
                Requirement: UNIQUE Do's and Don'ts specific to this user's chart today. NOT generic sun sign advice.
                Language: ${langPrompt}. Use local cultural context/idioms.
                Output JSON:
                {
                  "overview": "Detailed daily prediction covering career, health, love (max 60 words)",
                  "simple_overview": "One simple sentence summary for quick reading",
                  "dos": ["Unique Do 1 based on transit", "Unique Do 2"],
                  "donts": ["Unique Don't 1", "Unique Don't 2"],
                  "luckyColor": "Color",
                  "luckyNumber": "Number"
                }
              `;
              const dailySchema: Schema = {
                  type: Type.OBJECT,
                  properties: {
                      overview: { type: Type.STRING },
                      simple_overview: { type: Type.STRING },
                      dos: { type: Type.ARRAY, items: { type: Type.STRING } },
                      donts: { type: Type.ARRAY, items: { type: Type.STRING } },
                      luckyColor: { type: Type.STRING },
                      luckyNumber: { type: Type.STRING }
                  },
                  required: ['overview', 'simple_overview', 'dos', 'donts', 'luckyColor', 'luckyNumber']
              };
              
              const dailyRes = await generateWithRetry(dailyPrompt, dailySchema);
              if (dailyRes) {
                  newData.daily = dailyRes;
              } else {
                  // Robust fallback if AI fails
                  newData.daily = {
                      overview: `The cosmic energy for ${sign} is recalibrating today. Focus on maintaining inner balance.`,
                      simple_overview: "Focus on inner peace today.",
                      dos: ["Meditation", "Patience"],
                      donts: ["Haste", "Conflict"],
                      luckyColor: "White",
                      luckyNumber: "7"
                  };
              }
          }

          // --- GENERATE WEEKLY (if stale or lang change) ---
          if (isWeeklyStale || isLanguageMismatch) {
              const weeklyPrompt = `
                Generate Weekly Horoscope for ${userState.name} (${sign}).
                Week Range: ${weekRange}.
                Task: Create a COMPREHENSIVE, DETAILED Weekly Forecast suitable for printing as a full page report.
                Structure: "Introduction to planetary movements. Deep dive into Career, Health, and Relationships for ${weekRange}. Specific remedies for the week."
                Language: ${langPrompt}. Use local dialect. Minimum 300 words.
              `;
              const weeklySchema: Schema = {
                  type: Type.OBJECT,
                  properties: {
                      content: { type: Type.STRING }
                  }
              };
              const weeklyRes = await generateWithRetry(weeklyPrompt, weeklySchema);
              if (weeklyRes?.content) {
                  newData.weekly = weeklyRes.content;
              } else {
                  newData.weekly = `Weekly insights for ${sign} are currently forming in the astral plane.`;
              }
          }

          // --- GENERATE MONTHLY (if stale or lang change) ---
          if (isMonthlyStale || isLanguageMismatch) {
              const monthlyPrompt = `
                Generate Monthly Horoscope for ${userState.name} (${sign}).
                Month: ${thisMonthIST}.
                Task: Create an EXHAUSTIVE Monthly Yearbook Report suitable for PDF download.
                Structure: "Overview of the month. Key Transits (Sun, Mars, Venus). Week-by-week breakdown. Closing advice."
                Language: ${langPrompt}. Use local dialect. Minimum 500 words.
              `;
              const monthlySchema: Schema = {
                  type: Type.OBJECT,
                  properties: {
                      content: { type: Type.STRING }
                  }
              };
              const monthlyRes = await generateWithRetry(monthlyPrompt, monthlySchema);
              if (monthlyRes?.content) {
                  newData.monthly = monthlyRes.content;
              } else {
                  newData.monthly = `This month brings a transformative energy for ${sign}.`;
              }
          }

          // Save combined data to DB cache
          await saveCachedReading(cacheKey, JSON.stringify(newData));
          setHoroscopeData(newData);

      } catch (e) { 
          console.error(e); 
          // Last resort fallback
          if (!horoscopeData) {
             setHoroscopeData({ 
                 starSign: sign, 
                 language: userState.language,
                 meta: { dailyDate: todayIST },
                 daily: { overview: "Stars are shifting.", simple_overview: "Aligning energies.", dos: ["Meditate"], donts: ["Stress"], luckyColor: "White", luckyNumber: "7" }, 
                 weekly: "Planetary shifts observed. Please check back later.", 
                 monthly: "A month of transformation. Please check back later." 
             });
          }
      } finally { 
          setIsGeneratingHoroscope(false); 
      }
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
              // Generate and Store JWT Token on Successful Login
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
                  gender: profile.gender,
                  language: prev.language // Preserve persistent language if needed, or override from profile if saved there
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
            // VERIFY TOKEN ON APP INIT
            const token = localStorage.getItem('astro_token');
            if (token) {
                // Determine user identity solely from token
                const contact = verifyJWT(token);
                if (contact) { 
                    if (contact === 'ADMIN') handleAdminEnter(); 
                    else handleSeekerLogin(contact); 
                } else { 
                    // Token invalid or expired
                    localStorage.removeItem('astro_token'); 
                }
            }
        }
    }
  }, [hasStarted]);

  // Subscription Logic: Starts today, Ends (Today + 1 Month) - 1 Day
  const handleSubscriptionSuccess = (paymentId?: string) => {
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
      
      const tx:Transaction={ 
          id: generateReferenceId('Subscription', `Premium until ${expiry.toLocaleDateString()}`), 
          userId: userState.id || userState.contact || 'u', 
          userName: userState.name || 'Guest', 
          amount:299, type:'Subscription', status:'Success', date:new Date().toISOString().split('T')[0], details:`Premium until ${expiry.toLocaleDateString()}`,
          relatedEntityId: userState.connectedAstrologerId,
          paymentId: paymentId 
      }; 
      setTransactions(p=>[tx,...p]); saveTransaction(tx);

      setMessages(prev => [...prev, { id: generateId(), text: `Subscription Active! Valid until ${expiry.toLocaleDateString()}.`, sender: Sender.SYSTEM, timestamp: new Date() }]);
  };

  const handleMember21Purchase = () => {
      initiatePayment(21, "Member 21 Initiation", (paymentId?: string) => {
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
          
          const tx:Transaction={ 
              id: generateReferenceId('Subscription', 'Member 21 (3 Years)'), 
              userId: userState.id || userState.contact || 'u', 
              userName: userState.name || 'Guest', 
              amount:21, type:'Subscription', status:'Success', date:new Date().toISOString().split('T')[0], details:`Member 21 (3 Years)`,
              relatedEntityId: userState.connectedAstrologerId,
              paymentId: paymentId
          }; 
          setTransactions(p=>[tx,...p]); saveTransaction(tx);

          setMessages(prev => [...prev, { 
              id: generateId(), 
              text: `Welcome to the 21 Club! Insights unlocked for 3 years. Use top-ups for chat.`, 
              sender: Sender.SYSTEM, 
              timestamp: new Date() 
          }]);
      });
  };

  const handleTopup = (cost: number, quantity: number) => {
      initiatePayment(cost, `${quantity} Questions Top-up`, (paymentId?: string) => {
          setUserState(prev => {
              const updated = {
                  ...prev,
                  dailyQuestionsLeft: (prev.dailyQuestionsLeft || 0) + quantity
              };
              saveUserProfile(updated);
              return updated;
          });
          
          const tx:Transaction={ 
              id: generateReferenceId('Product', `${quantity} Q Top-up`), 
              userId: userState.id || userState.contact || 'u', 
              userName: userState.name || 'Guest', 
              amount:cost, type:'Product', status:'Success', date:new Date().toISOString().split('T')[0], details:`${quantity} Q Top-up`,
              relatedEntityId: userState.connectedAstrologerId,
              paymentId: paymentId
          }; 
          setTransactions(p=>[tx,...p]); saveTransaction(tx);

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
          
          // Generate Token on Onboarding Completion
          const token = generateJWT(baseUser.contact || 'User');
          localStorage.setItem('astro_token', token);
      } catch (e) {
          console.error("Profile Save Error:", e);
          setIsGlobalLoading(false);
          alert("Failed to create profile. Please check your connection.");
          return;
      }

      // 4. Handle Payment Flow (Post-User Creation)
      if (selectedTier === 'premium' || selectedTier === 'member21') {
          const cost = selectedTier === 'premium' ? 299 : 21;
          const desc = selectedTier === 'premium' ? "Premium Access" : "Member 21 Initiation";
          
          setIsGlobalLoading(false); // Hide loader to show payment modal

          initiatePayment(cost, desc, (paymentId?: string) => {
              // INSTEAD OF FINALIZING, SHOW LANGUAGE SELECTOR
              setPendingOnboardingData({ user: baseUser, cost, desc });
              setShowLanguageSelectionModal(true);
              
              // We'll persist the transaction and user update AFTER language selection
              // But we can log the payment ID now just in case
              console.log("Payment Successful, ID:", paymentId);
              // Attach payment ID to the pending data to use later
              (baseUser as any)._tempPaymentId = paymentId; 
          }, data.contact);
      } else {
          // Free Tier - Proceed directly
          finalizeOnboarding(baseUser);
      }
  };

  const handlePostPaymentLanguageSelect = async (lang: Language) => {
      setShowLanguageSelectionModal(false);
      setIsGlobalLoading(true);
      setLoadingText("Aligning Stars...");

      if (!pendingOnboardingData) return;

      const { user, cost, desc } = pendingOnboardingData;
      const paymentId = (user as any)._tempPaymentId;

      // Determine new tier stats
      let dailyLimit = INITIAL_DAILY_LIMIT;
      let expiryDate: Date | undefined = undefined;
      let isPremium = false;
      let tier = user.tier || 'free'; // Default from base, but will upgrade

      if (desc.includes("Premium")) {
          dailyLimit = PREMIUM_DAILY_LIMIT;
          const now = new Date();
          const expiry = new Date(now);
          expiry.setMonth(expiry.getMonth() + 1);
          expiry.setDate(expiry.getDate() - 1);
          expiryDate = expiry;
          isPremium = true;
          tier = 'premium';
      } else if (desc.includes("Member 21")) {
          dailyLimit = 0; 
          const now = new Date();
          const expiry = new Date(now);
          expiry.setFullYear(expiry.getFullYear() + 3);
          expiryDate = expiry;
          isPremium = false;
          tier = 'member21';
      }

      const upgradedUser: UserState = {
          ...user,
          isPremium,
          tier: tier as any,
          dailyQuestionsLeft: dailyLimit,
          subscriptionExpiry: expiryDate,
          language: lang // UPDATE LANGUAGE HERE
      };

      // Update User with Premium/Member Status & Language
      await saveUserProfile(upgradedUser);
      setUserState(upgradedUser);
      // Persist lang choice locally too
      localStorage.setItem('astro_language', lang);

      // Log Transaction
      const tx:Transaction={ 
          id: generateReferenceId('Subscription', desc), 
          userId: upgradedUser.id || upgradedUser.contact || 'u', 
          userName: upgradedUser.name || 'Guest', 
          amount:cost, type:'Subscription', status:'Success', date:new Date().toISOString().split('T')[0], details:desc,
          relatedEntityId: upgradedUser.connectedAstrologerId,
          paymentId: paymentId
      }; 
      setTransactions(p=>[tx,...p]); saveTransaction(tx);

      // Now finalize with correct language
      await finalizeOnboarding(upgradedUser);
  };

  const finalizeOnboarding = async (finalUser: UserState) => {
      setLoadingText("Aligning Stars...");
      try {
          const instr = generateSystemInstruction(finalUser.name, finalUser.gender || '', finalUser.birthDate || '', finalUser.birthTime || '', finalUser.birthPlace || '', finalUser.language);
          await initializeChat(instr);
          
          const cacheKey = `${finalUser.name.trim().toLowerCase()}_${finalUser.birthDate}_${finalUser.birthTime}_${finalUser.birthPlace?.trim().toLowerCase()}_${finalUser.language}`.replace(/\s+/g, '_');
          let txt = await fetchCachedReading(cacheKey);

          if (!txt) {
              const treatAsPremium = finalUser.isPremium || finalUser.tier === 'member21';
              const langCode = finalUser.language || 'en';
              const langName = {
                  'en': 'ENGLISH', 'hi': 'HINDI', 'te': 'TELUGU', 'mr': 'MARATHI', 'ml': 'MALAYALAM', 'pa': 'PUNJABI'
              }[langCode] || 'ENGLISH';

              let prompt = `Initial Overview: Name, Challenges, Vastu Hint, Warning. Deep Dive: Full Vastu. OUTPUT LANGUAGE: ${langName}`;
              
              if (treatAsPremium) {
                  prompt = `
                  I AM A PREMIUM SEEKER. GENERATE A DIVINE, STRUCTURED ASTROLOGICAL DECREE.
                  OUTPUT LANGUAGE: ${langName}.
                  STRICTLY FOLLOW THIS STRUCTURE:
                  1. **Divine Greeting**: Welcoming the soul (Higher Being tone).
                  2. **Spiritual Significance of Name**: Meaning of ${finalUser.name}.
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

  const handleLogout = () => { localStorage.removeItem('astro_token'); setHasStarted(false); setUserState({ dailyQuestionsLeft: INITIAL_DAILY_LIMIT, isPremium: false, tier: 'free', name: '', gender: '', contact: '', hasOnboarded: false, birthDate: '', birthTime: '', birthPlace: '', language: 'en' }); setMessages([]); setView(AppView.CHAT); };
  
  const handleLanguageChange = async (lang: Language) => { 
      // Save language preference to localStorage
      localStorage.setItem('astro_language', lang);
      setUserState(prev => ({ ...prev, language: lang })); 
      
      // RE-INITIALIZE CHAT with new language instruction
      // This ensures subsequent messages (TTS and Text) use the new language
      if (userState.hasOnboarded) {
          const instr = generateSystemInstruction(
              userState.name, 
              userState.gender || '', 
              userState.birthDate || '', 
              userState.birthTime || '', 
              userState.birthPlace || '', 
              lang
          );
          await initializeChat(instr);
      }
  };
  
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

  const initiatePayment = (amount: number, desc: string, success: (paymentId?: string) => void, contact?: string) => { 
      setPendingPayment({ amount, description: desc, onSuccess: success, contact }); 
      setMissingContactInfo(''); 
      setShowPaymentConfirmation(true); 
  };

  // Updated to update local earnings state but real persistence happens via DB queries now
  const updateEarnings = (id: string, type: keyof Earnings, amt: number) => setAstrologerEarnings(p => ({...p, [id]: {...(p[id]||{chats:0,products:0,tips:0,withdrawn:0}), [type]: (p[id]?.[type]||0)+amt}}));
  
  // UPDATED: Now supports relatedEntityId for proper attribution
  const addTransaction = (amt: number, type: 'Product' | 'Subscription' | 'Dakshina' | 'Consultation', det: string, userOverride?: UserState, paymentId?: string) => { 
      const currentUser = userOverride || userState;
      const tx:Transaction={ 
          id: generateReferenceId(type, det), 
          userId: currentUser.id || currentUser.contact || 'u', 
          userName: currentUser.name || 'Guest', 
          amount:amt, type, status:'Success', date:new Date().toISOString().split('T')[0], details:det,
          relatedEntityId: currentUser.connectedAstrologerId, // Attributed to connected astro if exists
          paymentId: paymentId
      }; 
      setTransactions(p=>[tx,...p]); saveTransaction(tx); 
  };
  
  const proceedToRazorpay = async () => { 
      if(pendingPayment) { 
          try {
            await loadRazorpay();
          } catch (e) {
            alert("Failed to load payment gateway. Please check your internet connection.");
            return;
          }

          if (window.Razorpay) {
              // Detect primary contact and missing info
              const primaryContact = pendingPayment.contact || userState.contact || '';
              const isPrimaryEmail = primaryContact.includes('@');
              
              const prefillData = {
                  email: isPrimaryEmail ? primaryContact : missingContactInfo,
                  contact: isPrimaryEmail ? missingContactInfo : primaryContact
              };

              // Helper to create options safely
              const createOptions = (key: string) => ({ 
                  key: key.trim(), // Ensure no whitespace
                  amount: pendingPayment.amount * 100, 
                  currency: "INR", 
                  name: "Astro21", 
                  description: pendingPayment.description, 
                  handler: (response: any) => { 
                      // Pass Razorpay Payment ID to success handler
                      pendingPayment.onSuccess(response.razorpay_payment_id); 
                      setShowPaymentConfirmation(false); 
                  }, 
                  prefill: prefillData,
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
          } else {
              alert("Razorpay offline");
          }
      } 
  };

  const initiateProductPurchase = (p: Product) => { setSelectedProductForPurchase(p); setShippingDetails({ address:'', city:'', pincode:'', phone:'' }); setShowAddressModal(true); };
  const confirmPurchaseWithAddress = () => { if(!selectedProductForPurchase) return; initiatePayment(selectedProductForPurchase.price, selectedProductForPurchase.name, (pid) => { addTransaction(selectedProductForPurchase!.price, 'Product', selectedProductForPurchase!.name, undefined, pid); setMessages(p=>[...p, {id:generateId(), text:`Purchased ${selectedProductForPurchase!.name}`, sender:Sender.SYSTEM, timestamp:new Date()}]); setShowAddressModal(false); }); };
  const handleUnlockMessage = (id: string) => setMessages(p => p.map(m => m.id===id ? {...m, isLocked:false} : m));
  
  // UPDATED: Ensure updateEarnings is called but also rely on transaction attribution
  const handleGuruDakshina = (amt: number) => initiatePayment(amt, 'Dakshina', (pid) => { 
      // Update local state for immediate feedback
      if(userState.connectedAstrologerId) updateEarnings(userState.connectedAstrologerId, 'tips', amt*0.8); 
      // Transaction will carry connectedAstrologerId via addTransaction
      addTransaction(amt, 'Dakshina', 'Tip', undefined, pid); 
      setShowTipModal(false); 
  });

  const connectToAstrologer = (a: Astrologer) => { 
      if(!userState.isPremium && !userState.isAdminImpersonating) { 
          setPremiumModalReason("Premium Required"); 
          setShowPremiumModal(true); 
          return; 
      } 
      const amount = a.pricePerMin * 10;
      initiatePayment(amount, 'Session', async (pid) => { 
          // 1. Update Local State
          const updatedUser = {...userState, connectedAstrologerId:a.id};
          setUserState(updatedUser); 
          setSessionExpiry(Date.now()+600000); 
          setRatingTarget(a); 
          setView(AppView.CHAT);
          
          // 2. CRITICAL: Persist Connection to DB immediately so Guru Dashboard updates
          await saveUserProfile(updatedUser);

          // 3. Log Transaction
          addTransaction(amount, 'Consultation', `Session with ${a.name}`, updatedUser, pid);
          updateEarnings(a.id, 'chats', amount * 0.9); 
      }); 
  };
  const disconnectAstrologer = () => { setUserState(p=>({...p, connectedAstrologerId:undefined})); setSessionExpiry(null); setCallState(p=>({...p, isActive:false})); setShowRatingModal(true); };
  const handleAcceptCall = (mid: string, t: 'voice'|'video') => { if(userState.connectedAstrologerId) setCallState({isActive:true, type:t, partnerName:'Guru', partnerImage:'', channelName:userState.connectedAstrologerId, messageId:mid}); };
  const handleCallEnd = (d: number) => { setCallState(p=>({...p, isActive:false})); if(callState.messageId) setMessages(p=>p.map(m=>m.id===callState.messageId ? {...m, metadata:{...m.metadata, callStatus:'ended', durationText:`${d}s`}} : m)); };
  const handleAstrologerAction = (act: string, pl: any) => { if(act==='call') { setMessages(p=>[...p, {id:generateId(), text:'Incoming Call', sender:Sender.ASTROLOGER, type:MessageType.CALL_OFFER, metadata:{callType:pl.type}, timestamp:new Date()}]); setCallState({isActive:true, type:pl.type, partnerName:'User', partnerImage:'', channelName:pl.astroId}); } else if(act==='reply') setMessages(p=>[...p,{id:generateId(), text:pl, sender:Sender.ASTROLOGER, timestamp:new Date()}]); else if(act==='end_session') disconnectAstrologer(); };
  const openHistory = (tab: any) => { setHistoryTab(tab); setShowHistoryModal(true); setIsSidebarOpen(false); };
  const startRecording = () => { 
      if(window.webkitSpeechRecognition) { 
          const r = new window.webkitSpeechRecognition(); 
          
          // Set appropriate language for speech recognition
          switch(userState.language) {
              case 'hi': r.lang = 'hi-IN'; break;
              case 'te': r.lang = 'te-IN'; break;
              case 'mr': r.lang = 'mr-IN'; break;
              case 'ml': r.lang = 'ml-IN'; break;
              case 'pa': r.lang = 'pa-IN'; break;
              default: r.lang = 'en-IN'; 
          }

          r.onresult = (e:any) => setInput(p=>p+e.results[0][0].transcript); 
          r.start(); 
          setIsRecording(true); 
          r.onend=()=>setIsRecording(false); 
      } 
  };
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
                    <div className="flex items-center gap-2">
                        <select 
                            value={userState.language}
                            onChange={(e) => handleLanguageChange(e.target.value as Language)}
                            className="bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-mystic-200 px-2 py-0.5 outline-none focus:border-gold-500 cursor-pointer"
                        >
                            <option value="en">English</option>
                            <option value="hi">हिंदी</option>
                            <option value="te">తెలుగు</option>
                            <option value="mr">मराठी</option>
                            <option value="ml">മലയാളം</option>
                            <option value="pa">ਪੰਜਾਬੀ</option>
                        </select>
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
                    <AstrologerDashboard activeUser={userState} messages={messages} onAction={handleAstrologerAction} earnings={astrologerEarnings} astrologers={astrologers} products={products} users={users} />
                ) : view === AppView.HOROSCOPE ? (
                    <HoroscopeView user={userState} horoscopeData={horoscopeData} isLoading={isGeneratingHoroscope} onSendYearlyReport={handleSendYearlyReport} onLanguageChange={handleLanguageChange} />
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

      {/* LANGUAGE SELECTOR MODAL POST-PAYMENT */}
      {showLanguageSelectionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in">
              <div className="bg-mystic-900 border border-gold-500/50 p-8 rounded-3xl w-full max-w-md text-center shadow-[0_0_50px_rgba(234,179,8,0.2)]">
                  <div className="text-4xl mb-4 animate-bounce">🌐</div>
                  <h3 className="text-2xl font-serif text-white mb-2">Choose Your Language</h3>
                  <p className="text-mystic-300 text-sm mb-6">Receive your premium insights in your preferred language.</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                      {[
                          { code: 'en', label: 'English' },
                          { code: 'hi', label: 'हिंदी (Hindi)' },
                          { code: 'te', label: 'తెలుగు (Telugu)' },
                          { code: 'mr', label: 'मराठी (Marathi)' },
                          { code: 'ml', label: 'മലയാളം (Malayalam)' },
                          { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' }
                      ].map(lang => (
                          <button 
                              key={lang.code}
                              onClick={() => handlePostPaymentLanguageSelect(lang.code as Language)}
                              className="py-3 px-4 rounded-xl border border-white/10 hover:border-gold-500 hover:bg-gold-500/10 text-white font-bold transition-all"
                          >
                              {lang.label}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {showPaymentConfirmation && pendingPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
            <div className="bg-mystic-800 p-8 rounded-3xl text-center w-full max-w-sm">
                <h3 className="text-xl font-serif text-white mb-2">Confirm Payment</h3>
                <p className="text-mystic-300 mb-6">₹{pendingPayment.amount}</p>
                
                {/* Data Collection for Razorpay */}
                <div className="mb-6 text-left">
                    {(() => {
                        const primary = pendingPayment.contact || userState.contact || '';
                        const isEmail = primary.includes('@');
                        return (
                            <div>
                                <label className="text-[10px] uppercase text-mystic-400 font-bold ml-1 mb-1 block">
                                    {isEmail ? 'Mobile Number (Required)' : 'Email Address (Required)'}
                                </label>
                                <input 
                                    type={isEmail ? "tel" : "email"}
                                    value={missingContactInfo}
                                    onChange={(e) => setMissingContactInfo(e.target.value)}
                                    placeholder={isEmail ? "Enter Mobile Number" : "Enter Email Address"}
                                    className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-all text-sm"
                                    autoFocus
                                />
                            </div>
                        );
                    })()}
                </div>

                <div className="flex gap-3">
                    <button onClick={()=>setShowPaymentConfirmation(false)} className="flex-1 bg-white/5 py-3 rounded-xl text-white font-bold text-sm">Cancel</button>
                    <button 
                        onClick={proceedToRazorpay} 
                        disabled={!missingContactInfo || missingContactInfo.length < 5}
                        className="flex-1 bg-gold-500 hover:bg-gold-400 py-3 rounded-xl text-black font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Pay Now
                    </button>
                </div>
                <p className="mt-4 text-[9px] text-mystic-600">Note: Ensure "Auto Capture" is enabled in Razorpay settings to prevent auto-refunds.</p>
            </div>
        </div>
      )}

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
                      <button onClick={() => handleSubscriptionSuccess()} className="w-full bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-mystic-950 font-bold py-4 rounded-xl mb-3 shadow-lg transition-transform active:scale-[0.98]">
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
