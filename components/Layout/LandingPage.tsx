import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import StarBackground from './StarBackground';
import { sendAuthOtp, verifyAuthOtp, resetUserPassword } from '../../services/dbService';

const PrivacyPolicy = lazy(() => import('./PrivacyPolicy'));
const Terms = lazy(() => import('./Terms'));

interface LandingPageProps {
  onSeekerEnter: () => void;
  onSeekerLogin: (verifiedContact: string) => void;
  onVerifyCredentials: (contact: string, password: string) => Promise<boolean | string>;
  onGuruEnter: () => void;
  onAdminEnter: () => void;
}

type LangCode = 'en' | 'hi' | 'ml' | 'pa' | 'mr';

const TRANSLATIONS: Record<LangCode, any> = {
  en: {
    headlineLine1: "The Universe Has Been",
    headlineLine2: "Watching You Since Birth.",
    subheadline: "Now, for the first time — it speaks directly to you.",
    hook: "Start Your Cosmic Journey for just ₹21",
    hookSub: "3 Years Access · Daily Horoscope · 15 Personal Questions · Cancel Anytime",
    cta: "Begin for ₹21 →",
    loginText: "Already a member? Login Here",
    whatYouGetHeading: "Everything in Your ₹21 Journey",
    modulesHeading: "Explore Your Cosmic Blueprint",
    modulesSub: "Every tool you need to understand your destiny",
    guruHeading: "Need a Human Touch?",
    guruSub: "Connect live with verified Vedic Gurus — chat, voice, or video.",
    guruCta: "Browse Gurus →",
    pricingHeading: "Simple, Honest Pricing",
    pricingSub: "No hidden fees. No algorithms. Just clarity.",
    footerTagline: "Ancient wisdom, modern delivery.",
    seekerTitle: "I Am a Seeker",
    seekerCta: "Discover my blueprint →",
    guruTitle: "I Am a Guru",
    guruCardCta: "Join as a Guru →"
  },
  hi: {
    headlineLine1: "ब्रह्मांड आपको",
    headlineLine2: "जन्म से देख रहा है।",
    subheadline: "अब पहली बार — वो आपसे सीधे बात करता है।",
    hook: "सिर्फ ₹21 में अपनी ब्रह्मांडीय यात्रा शुरू करें",
    hookSub: "3 साल की पहुंच · दैनिक राशिफल · 15 व्यक्तिगत प्रश्न · कभी भी रद्द करें",
    cta: "₹21 में शुरू करें →",
    loginText: "पहले से सदस्य हैं? यहाँ लॉगिन करें",
    whatYouGetHeading: "आपकी ₹21 की यात्रा में सब कुछ",
    modulesHeading: "अपनी ब्रह्मांडीय रूपरेखा का अन्वेषण करें",
    modulesSub: "आपके भाग्य को समझने के लिए हर उपकरण",
    guruHeading: "क्या मानवीय स्पर्श की आवश्यकता है?",
    guruSub: "सत्यापित वैदिक गुरुओं के साथ लाइव जुड़ें — चैट, वॉयस या वीडियो।",
    guruCta: "गुरुओं को ब्राउज़ करें →",
    pricingHeading: "सरल, ईमानदार मूल्य निर्धारण",
    pricingSub: "कोई छिपी हुई फीस नहीं। कोई एल्गोरिदम नहीं। सिर्फ स्पष्टता।",
    footerTagline: "प्राचीन ज्ञान, आधुनिक समाधान।",
    seekerTitle: "मैं एक साधक हूँ",
    seekerCta: "मेरी रूपरेखा खोजें →",
    guruTitle: "मैं एक गुरु हूँ",
    guruCardCta: "गुरु के रूप में जुड़ें →"
  },
  ml: {
    headlineLine1: "പ്രപഞ്ചം നിങ്ങളെ",
    headlineLine2: "ജനനം മുതൽ നിരീക്ഷിക്കുന്നു.",
    subheadline: "ഇപ്പോൾ ആദ്യമായി — അത് നിങ്ങളോട് നേരിട്ട് സംസാരിക്കുന്നു.",
    hook: "വെറും ₹21-ന് നിങ്ങളുടെ പ്രപഞ്ച യാത്ര ആരംഭിക്കുക",
    hookSub: "3 വർഷത്തെ ആക്സസ് · പ്രതിദിന ജാതകം · 15 വ്യക്തിഗത ചോദ്യങ്ങൾ · എപ്പോൾ വേണമെങ്കിലും റദ്ദാക്കാം",
    cta: "₹21-ന് ആരംഭിക്കുക →",
    loginText: "നിങ്ങൾ ഇതിനകം അംഗമാണോ? ഇവിടെ ലോഗിൻ ചെയ്യുക",
    whatYouGetHeading: "നിങ്ങളുടെ ₹21 യാത്രയിലെ എല്ലാം",
    modulesHeading: "നിങ്ങളുടെ പ്രപഞ്ച രൂപരേഖ പര്യവേക്ഷണം ചെയ്യുക",
    modulesSub: "നിങ്ങളുടെ വിധി മനസ്സിലാക്കാൻ ആവശ്യമായ എല്ലാ ഉപകരണങ്ങളും",
    guruHeading: "ഒരു മനുഷ്യ സ്പർശം ആവശ്യമുണ്ടോ?",
    guruSub: "പരിശോധിച്ച വേദ ഗുരുക്കന്മാരുമായി തത്സമയം ബന്ധപ്പെടുക — ചാറ്റ്, വോയ്‌സ് അല്ലെങ്കിൽ വീഡിയോ.",
    guruCta: "ഗുരുക്കന്മാരെ ബ്രൗസ് ചെയ്യുക →",
    pricingHeading: "ലളിതവും സത്യസന്ധവുമായ വിലനിർണ്ണയം",
    pricingSub: "മറഞ്ഞിരിക്കുന്ന ഫീസുകളില്ല. അൽഗോരിതങ്ങളില്ല. വ്യക്തത മാത്രം.",
    footerTagline: "പുരാതന ജ്ഞാനം, ആധുനിക ഡെലിവറി.",
    seekerTitle: "ഞാൻ ഒരു അന്വേഷകനാണ്",
    seekerCta: "എന്റെ രൂപരേഖ കണ്ടെത്തുക →",
    guruTitle: "ഞാൻ ഒരു ഗുരുവാണ്",
    guruCardCta: "ഗുരുവായി ചേരുക →"
  },
  pa: {
    headlineLine1: "ਬ੍ਰਹਿਮੰਡ ਤੁਹਾਨੂੰ",
    headlineLine2: "ਜਨਮ ਤੋਂ ਦੇਖ ਰਿਹਾ ਹੈ।",
    subheadline: "ਹੁਣ ਪਹਿਲੀ ਵਾਰ — ਇਹ ਤੁਹਾਡੇ ਨਾਲ ਸਿੱਧੀ ਗੱਲ ਕਰਦਾ ਹੈ।",
    hook: "ਸਿਰਫ਼ ₹21 ਵਿੱਚ ਆਪਣੀ ਬ੍ਰਹਿਮੰਡੀ ਯਾਤਰਾ ਸ਼ੁਰੂ ਕਰੋ",
    hookSub: "3 ਸਾਲ ਦੀ ਪਹੁੰਚ · ਰੋਜ਼ਾਨਾ ਕੁੰਡਲੀ · 15 ਨਿੱਜੀ ਸਵਾਲ · ਕਿਸੇ ਵੀ ਸਮੇਂ ਰੱਦ ਕਰੋ",
    cta: "₹21 ਵਿੱਚ ਸ਼ੁਰੂ ਕਰੋ →",
    loginText: "ਪਹਿਲਾਂ ਹੀ ਮੈਂਬਰ ਹੋ? ਇੱਥੇ ਲੌਗਇਨ ਕਰੋ",
    whatYouGetHeading: "ਤੁਹਾਡੀ ₹21 ਦੀ ਯਾਤਰਾ ਵਿੱਚ ਸਭ ਕੁਝ",
    modulesHeading: "ਆਪਣੇ ਬ੍ਰਹਿਮੰਡੀ ਬਲੂਪ੍ਰਿੰਟ ਦੀ ਪੜਚੋਲ ਕਰੋ",
    modulesSub: "ਤੁਹਾਡੀ ਕਿਸਮਤ ਨੂੰ ਸਮਝਣ ਲਈ ਹਰ ਸੰਦ",
    guruHeading: "ਕੀ ਮਨੁੱਖੀ ਸੰਪਰਕ ਦੀ ਲੋੜ ਹੈ?",
    guruSub: "ਪ੍ਰਮਾਣਿਤ ਵੈਦਿਕ ਗੁਰੂਆਂ ਨਾਲ ਲਾਈਵ ਜੁੜੋ — ਚੈਟ, ਵੌਇਸ ਜਾਂ ਵੀਡੀਓ।",
    guruCta: "ਗੁਰੂਆਂ ਨੂੰ ਬ੍ਰਾਊਜ਼ ਕਰੋ →",
    pricingHeading: "ਸਰਲ, ਇਮਾਨਦਾਰ ਕੀਮਤ",
    pricingSub: "ਕੋਈ ਲੁਕਵੀਂ ਫੀਸ ਨਹੀਂ। ਕੋਈ ਐਲਗੋਰਿਦਮ ਨਹੀਂ। ਸਿਰਫ਼ ਸਪਸ਼ਟਤਾ।",
    footerTagline: "ਪ੍ਰਾਚੀਨ ਗਿਆਨ, ਆਧੁਨਿਕ ਹੱਲ।",
    seekerTitle: "ਮੈਂ ਇੱਕ ਖੋਜੀ ਹਾਂ",
    seekerCta: "ਮੇਰਾ ਬਲੂਪ੍ਰਿੰਟ ਖੋਜੋ →",
    guruTitle: "ਮੈਂ ਇੱਕ ਗੁਰੂ ਹਾਂ",
    guruCardCta: "ਗੁਰੂ ਵਜੋਂ ਜੁੜੋ →"
  },
  mr: {
    headlineLine1: "ब्रह्मांड तुम्हाला",
    headlineLine2: "जन्मापासून पाहत आहे.",
    subheadline: "आता पहिल्यांदाच — ते तुमच्याशी थेट बोलते.",
    hook: "फक्त ₹21 मध्ये तुमचा वैश्विक प्रवास सुरू करा",
    hookSub: "3 वर्षांचा प्रवेश · दैनिक राशीभविष्य · 15 वैयक्तिक प्रश्न · कधीही रद्द करा",
    cta: "₹21 मध्ये सुरू करा →",
    loginText: "आधीच सदस्य आहात? येथे लॉग इन करा",
    whatYouGetHeading: "तुमच्या ₹21 च्या प्रवासात सर्वकाही",
    modulesHeading: "तुमचा वैश्विक आराखडा एक्सप्लोर करा",
    modulesSub: "तुमचे नशीब समजून घेण्यासाठी प्रत्येक साधन",
    guruHeading: "मानवी स्पर्शाची गरज आहे?",
    guruSub: "सत्यापित वैदिक गुरूंसोबत थेट कनेक्ट व्हा — चॅट, व्हॉइस किंवा व्हिडिओ.",
    guruCta: "गुरू ब्राउझ करा →",
    pricingHeading: "सोपी, प्रामाणिक किंमत",
    pricingSub: "कोणतेही लपलेले शुल्क नाही. कोणतेही अल्गोरिदम नाहीत. फक्त स्पष्टता.",
    footerTagline: "प्राचीन ज्ञान, आधुनिक उपाय.",
    seekerTitle: "मी एक साधक आहे",
    seekerCta: "माझा आराखडा शोधा →",
    guruTitle: "मी एक गुरू आहे",
    guruCardCta: "गुरू म्हणून सामील व्हा →"
  }
};

const LandingPage: React.FC<LandingPageProps> = ({ onSeekerEnter, onSeekerLogin, onVerifyCredentials, onGuruEnter, onAdminEnter }) => {
  const [lang, setLang] = useState<LangCode>('en');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [pageView, setPageView] = useState<'home' | 'privacy' | 'terms'>('home');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Login State Machine
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp' | 'forgot_request' | 'forgot_otp' | 'forgot_new_password'>('credentials');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  // Social Proof Animation
  const [seekersCount, setSeekersCount] = useState(0);
  const [gurusCount, setGurusCount] = useState(0);
  const [readingsCount, setReadingsCount] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.pathname === '/login') {
      setShowLoginModal(true);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        let start = 0;
        const duration = 2000;
        const interval = 20;
        const steps = duration / interval;
        
        const timer = setInterval(() => {
          start += 1;
          setSeekersCount(Math.min(Math.floor((start / steps) * 10000), 10000));
          setGurusCount(Math.min(Math.floor((start / steps) * 500), 500));
          setReadingsCount(Math.min(Math.floor((start / steps) * 50000), 50000));
          
          if (start >= steps) clearInterval(timer);
        }, interval);
        
        observer.disconnect();
      }
    });

    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // Login Handlers
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (isAdminMode) {
        if (adminPin === '2904') onAdminEnter();
        else setErrorMsg("Incorrect Admin PIN");
        return;
    }

    if (phoneNumber.toLowerCase().trim() === 'admin') {
        setIsAdminMode(true);
        return;
    }

    if (phoneNumber.length < 4 || password.length < 4) {
        setErrorMsg("Invalid credentials.");
        return;
    }

    setIsLoading(true);
    try {
        const result = await onVerifyCredentials(phoneNumber, password);
        if (result) {
            const targetContact = typeof result === 'string' ? result : phoneNumber;
            if (typeof result === 'string') setPhoneNumber(targetContact);
            // Skip OTP and login directly since password is verified
            onSeekerLogin(targetContact);
        } else {
            setErrorMsg("Incorrect Phone/Email or Password.");
        }
    } catch (e) {
        setErrorMsg("Login failed. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setIsLoading(true);
      try {
          const result = await verifyAuthOtp(phoneNumber, otp);
          if (result.success) onSeekerLogin(phoneNumber);
          else setErrorMsg(result.message || "Invalid OTP Code.");
      } catch (e) {
          setErrorMsg("Verification failed.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setIsLoading(true);
      try {
          const result = await sendAuthOtp(phoneNumber);
          if (result.success || result.isRateLimit) setLoginStep('forgot_otp');
          else setErrorMsg(result.message || "Failed to send OTP. User may not exist.");
      } catch (e) {
          setErrorMsg("Error sending OTP.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleForgotOtpVerify = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setIsLoading(true);
      try {
          const result = await verifyAuthOtp(phoneNumber, otp);
          if (result.success) setLoginStep('forgot_new_password');
          else setErrorMsg(result.message || "Invalid OTP Code.");
      } catch (e) {
          setErrorMsg("Verification failed.");
      } finally {
          setIsLoading(false);
      }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password.length < 4) { setErrorMsg("Password must be at least 4 characters."); return; }
      if (password !== confirmPassword) { setErrorMsg("Passwords do not match."); return; }
      setIsLoading(true);
      try {
          const result = await resetUserPassword(phoneNumber, password);
          if (result.success) {
              alert("Password Reset Successfully! Please Login.");
              setLoginStep('credentials');
              setPassword('');
              setConfirmPassword('');
              setOtp('');
          } else {
              setErrorMsg(result.message || "Failed to reset password.");
          }
      } catch (e) {
          setErrorMsg("Error resetting password.");
      } finally {
          setIsLoading(false);
      }
  };

  const closeLogin = () => {
      setShowLoginModal(false);
      setIsAdminMode(false);
      setPhoneNumber('');
      setPassword('');
      setConfirmPassword('');
      setAdminPin('');
      setOtp('');
      setLoginStep('credentials');
      setErrorMsg('');
  };

  // Sub-pages rendering
  if (pageView === 'privacy') return <Suspense fallback={<div className="min-h-screen bg-mystic-900" />}><StarBackground /><PrivacyPolicy onBack={() => setPageView('home')} /></Suspense>;
  if (pageView === 'terms') return <Suspense fallback={<div className="min-h-screen bg-mystic-900" />}><StarBackground /><Terms onBack={() => setPageView('home')} /></Suspense>;

  return (
    <div className="relative min-h-screen flex flex-col bg-mystic-900 text-white font-sans selection:bg-gold-500/30 overflow-x-hidden">
      <StarBackground />
      
      {/* Mandala Animation */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-5">
        <svg className="w-[150vw] h-[150vw] md:w-[100vw] md:h-[100vw] animate-[spin_60s_linear_infinite]" viewBox="0 0 100 100" fill="none" stroke="#F59E0B" strokeWidth="0.2">
            <circle cx="50" cy="50" r="48" />
            <circle cx="50" cy="50" r="38" />
            <circle cx="50" cy="50" r="28" />
            <path d="M50 2 L50 98 M2 50 L98 50 M16 16 L84 84 M16 84 L84 16" />
            <path d="M50 12 L88 50 L50 88 L12 50 Z" />
            <path d="M50 22 L78 50 L50 78 L22 50 Z" />
        </svg>
      </div>

      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 bg-mystic-800/60 backdrop-blur-md border-b border-gold-500/20 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-900 rounded-full flex items-center justify-center text-xl shadow-[0_0_15px_rgba(124,58,237,0.5)] border border-white/20">
                🔮
            </div>
            <span className="text-2xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gold-200 to-mystic-300">
                Astro21
            </span>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative">
                <button 
                    onClick={() => setShowLangDropdown(!showLangDropdown)}
                    className="flex items-center gap-2 text-sm font-bold text-mystic-300 hover:text-white transition-colors"
                >
                    🌐 {lang.toUpperCase()} ▾
                </button>
                {showLangDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-mystic-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                        {['en', 'hi', 'ml', 'pa', 'mr'].map((l) => (
                            <button 
                                key={l}
                                onClick={() => { setLang(l as LangCode); setShowLangDropdown(false); }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${lang === l ? 'text-gold-400 font-bold' : 'text-mystic-300'}`}
                            >
                                {l === 'en' ? 'EN – English' : l === 'hi' ? 'HI – हिन्दी' : l === 'ml' ? 'ML – മലയാളം' : l === 'pa' ? 'PA – ਪੰਜਾਬੀ' : 'MR – मराठी'}
                            </button>
                        ))}
                        <button disabled className="w-full text-left px-4 py-2 text-sm text-mystic-600 italic cursor-not-allowed border-t border-white/5">
                            More coming soon
                        </button>
                    </div>
                )}
            </div>
            <button 
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 rounded-full border border-white/20 text-sm font-bold text-white hover:bg-white/10 transition-colors"
            >
                Login
            </button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="mb-6 inline-block px-4 py-1.5 rounded-full bg-mystic-800/80 border border-white/10 backdrop-blur-sm">
            <span className="text-xs font-bold tracking-widest text-gold-400 uppercase">🌟 INDIA'S #1 AI ASTROLOGY PLATFORM</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-white leading-[1.1] mb-6 drop-shadow-lg">
            {t.headlineLine1}<br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gold-200 via-gold-400 to-gold-600">
                {t.headlineLine2}
            </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-mystic-200 font-light max-w-2xl mx-auto mb-12">
            {t.subheadline}
        </p>

        <div className="bg-mystic-800/60 backdrop-blur-md border border-gold-500/30 rounded-3xl p-8 max-w-xl w-full mx-auto mb-8 shadow-[0_0_40px_rgba(245,158,11,0.15)] transform hover:scale-[1.02] transition-transform duration-300">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-gold-400 mb-4">
                {t.hook}
            </h2>
            <p className="text-sm md:text-base text-mystic-200 font-medium leading-relaxed">
                {t.hookSub}
            </p>
        </div>

        <button 
            onClick={onSeekerEnter}
            className="w-full max-w-md bg-gold-500 hover:bg-gold-400 text-black font-bold text-xl py-5 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] transition-all transform hover:-translate-y-1 mb-6"
        >
            {t.cta}
        </button>

        <button 
            onClick={() => setShowLoginModal(true)}
            className="text-white/70 hover:text-white underline transition-colors mb-12"
        >
            {t.loginText}
        </button>

        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm font-medium text-white/90">
            <span className="flex items-center gap-2">🔒 End-to-End Encrypted</span>
            <span className="flex items-center gap-2">✨ 100% Private</span>
            <span className="flex items-center gap-2">⭐ Trusted by 10,000+ Seekers</span>
        </div>
      </section>

      {/* 3. WHAT YOU GET SECTION */}
      <section className="relative z-10 py-24 px-6 bg-mystic-950/50">
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-serif text-center text-white mb-16">{t.whatYouGetHeading}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-mystic-800/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:border-gold-500/30 transition-colors">
                    <div className="text-4xl mb-6">🤖</div>
                    <h3 className="text-xl font-serif font-bold text-white mb-3">AI Daily Horoscope</h3>
                    <p className="text-mystic-300 leading-relaxed">Personalized to your exact birth chart. Every single day.</p>
                </div>
                <div className="bg-mystic-800/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:border-gold-500/30 transition-colors">
                    <div className="text-4xl mb-6">❓</div>
                    <h3 className="text-xl font-serif font-bold text-white mb-3">15 Personal Questions</h3>
                    <p className="text-mystic-300 leading-relaxed">3 questions a day. Ask what truly matters to you.</p>
                </div>
                <div className="bg-mystic-800/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:border-gold-500/30 transition-colors">
                    <div className="text-4xl mb-6">📅</div>
                    <h3 className="text-xl font-serif font-bold text-white mb-3">3 Years of Guidance</h3>
                    <p className="text-mystic-300 leading-relaxed">Not a subscription. A lifetime companion.</p>
                </div>
            </div>
        </div>
      </section>

      {/* 4. MODULES SECTION */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">{t.modulesHeading}</h2>
                <p className="text-xl text-mystic-200">{t.modulesSub}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { icon: '🔮', name: 'Kundli Generation', desc: 'Your birth chart, in seconds', status: 'Available' },
                    { icon: '💑', name: 'Kundli Matching', desc: 'Vedic compatibility analysis', status: 'Available' },
                    { icon: '🌙', name: 'Natal Chart', desc: 'Western astrology chart', status: 'Available' },
                    { icon: '🖐️', name: 'Palm Reading', desc: 'AI-powered palmistry', status: 'Available' },
                    { icon: '💎', name: 'Gemstones & Remedies', desc: 'Authentic, Guru-recommended', status: 'Available' },
                    { icon: '🙏', name: 'Live Digital Poojas', desc: 'Book a pooja, anytime', status: 'Available' }
                ].map((mod, i) => (
                    <div key={i} className="bg-mystic-800/40 border border-white/5 rounded-2xl p-6 flex items-start gap-4 hover:bg-mystic-800/80 transition-colors">
                        <div className="text-3xl">{mod.icon}</div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-white">{mod.name}</h3>
                                <span className="text-[10px] uppercase tracking-wider bg-gold-500/10 text-gold-400 px-2 py-0.5 rounded-full">{mod.status}</span>
                            </div>
                            <p className="text-sm text-mystic-200">{mod.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* 5. GURU ON DEMAND SECTION */}
      <section className="relative z-10 py-24 px-6 bg-gradient-to-r from-mystic-950 to-mystic-900 border-y border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="text-3xl md:text-5xl font-serif text-white mb-6">{t.guruHeading}</h2>
                <p className="text-xl text-mystic-300 mb-8 leading-relaxed">{t.guruSub}</p>
                <button 
                    onClick={onSeekerEnter}
                    className="px-8 py-4 rounded-full border-2 border-gold-500 text-gold-400 font-bold hover:bg-gold-500 hover:text-mystic-950 transition-colors text-lg"
                >
                    {t.guruCta}
                </button>
            </div>
            <div className="flex justify-center lg:justify-end">
                <div className="bg-mystic-800 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-mystic-700 overflow-hidden border-2 border-gold-500/30">
                            <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80" alt="Guru" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-white text-lg">Pandit Arvind Shastri</h3>
                            <p className="text-sm text-mystic-200">Kundli · Marriage · Career</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mb-6 text-sm">
                        <div className="text-gold-400 font-medium">⭐ 4.9 <span className="text-mystic-500">| 1,240 sessions</span></div>
                        <div className="text-green-400 font-medium flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online Now</div>
                    </div>
                    <button onClick={onSeekerEnter} className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-xl transition-colors">
                        Chat Now
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* 6. PRICING SECTION */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">{t.pricingHeading}</h2>
                <p className="text-xl text-mystic-200">{t.pricingSub}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                {/* Card 1: Starter */}
                <div className="bg-mystic-800/80 backdrop-blur-md border-2 border-gold-500 rounded-3xl p-8 relative transform lg:-translate-y-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold-500 text-mystic-950 text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">Most Popular</div>
                    <h3 className="text-xl font-bold text-white mb-2">STARTER</h3>
                    <div className="text-4xl font-serif text-gold-400 mb-6">₹21 <span className="text-sm text-mystic-300 font-sans">one-time</span></div>
                    <ul className="space-y-4 mb-8 text-sm text-mystic-200">
                        <li className="flex items-center gap-2"><span>✓</span> 3 years access</li>
                        <li className="flex items-center gap-2"><span>✓</span> Daily AI horoscope</li>
                        <li className="flex items-center gap-2"><span>✓</span> 15 questions (3/day)</li>
                        <li className="flex items-center gap-2 text-mystic-500"><span>✗</span> Live Guru calls</li>
                    </ul>
                    <button onClick={onSeekerEnter} className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-xl transition-colors">Start for ₹21</button>
                </div>

                {/* Card 2: Day Pass */}
                <div className="bg-mystic-800/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-colors">
                    <h3 className="text-xl font-bold text-white mb-2">DAY PASS</h3>
                    <div className="text-4xl font-serif text-white mb-6">₹99 <span className="text-sm text-mystic-300 font-sans">/ one day</span></div>
                    <ul className="space-y-4 mb-8 text-sm text-mystic-200">
                        <li className="flex items-center gap-2"><span>✓</span> Unlimited access</li>
                        <li className="flex items-center gap-2"><span>✓</span> All AI features</li>
                        <li className="flex items-center gap-2"><span>✓</span> 1 Guru chat session</li>
                    </ul>
                    <button onClick={onSeekerEnter} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors">Get Day Pass</button>
                </div>

                {/* Card 3: Premium Monthly */}
                <div className="bg-mystic-800/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-colors">
                    <h3 className="text-xl font-bold text-white mb-2">PREMIUM MONTHLY</h3>
                    <div className="text-4xl font-serif text-white mb-6">₹249 <span className="text-sm text-mystic-300 font-sans">/ month</span></div>
                    <ul className="space-y-4 mb-8 text-sm text-mystic-200">
                        <li className="flex items-center gap-2"><span>✓</span> Everything unlimited</li>
                        <li className="flex items-center gap-2"><span>✓</span> Unlimited Guru calls</li>
                        <li className="flex items-center gap-2"><span>✓</span> Priority support</li>
                    </ul>
                    <button onClick={onSeekerEnter} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors">Go Premium</button>
                </div>

                {/* Card 4: Annual */}
                <div className="bg-mystic-800/60 backdrop-blur-md border border-indigo-500/50 rounded-3xl p-8 relative shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">Best Value</div>
                    <h3 className="text-xl font-bold text-white mb-2">ANNUAL</h3>
                    <div className="text-4xl font-serif text-white mb-6">₹1,149 <span className="text-sm text-mystic-300 font-sans">/ year</span></div>
                    <ul className="space-y-4 mb-8 text-sm text-mystic-200">
                        <li className="flex items-center gap-2"><span>✓</span> Everything in Premium</li>
                        <li className="flex items-center gap-2"><span>✓</span> Save 62% vs monthly</li>
                        <li className="flex items-center gap-2"><span>✓</span> Exclusive yearly perks</li>
                    </ul>
                    <button onClick={onSeekerEnter} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors">Get Annual Plan</button>
                </div>
            </div>
            
            <p className="text-center text-mystic-500 text-sm mt-8">
                Prices shown in INR. Auto-converts to your local currency at checkout: USD · EUR · AED · GBP
            </p>
        </div>
      </section>

      {/* 7. SOCIAL PROOF BAR */}
      <section ref={statsRef} className="relative z-10 py-12 bg-black/60 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-8 md:gap-16 text-center">
            <div>
                <div className="text-3xl md:text-4xl font-serif font-bold text-gold-400 mb-1">{seekersCount.toLocaleString()}+</div>
                <div className="text-xs uppercase tracking-widest text-mystic-300">Seekers</div>
            </div>
            <div>
                <div className="text-3xl md:text-4xl font-serif font-bold text-gold-400 mb-1">{gurusCount.toLocaleString()}+</div>
                <div className="text-xs uppercase tracking-widest text-mystic-300">Verified Gurus</div>
            </div>
            <div>
                <div className="text-3xl md:text-4xl font-serif font-bold text-gold-400 mb-1">⭐ 4.8</div>
                <div className="text-xs uppercase tracking-widest text-mystic-300">Avg Rating</div>
            </div>
            <div>
                <div className="text-3xl md:text-4xl font-serif font-bold text-gold-400 mb-1">{readingsCount.toLocaleString()}+</div>
                <div className="text-xs uppercase tracking-widest text-mystic-300">Readings Delivered</div>
            </div>
        </div>
      </section>

      {/* 8. SEEKER / GURU SPLIT */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
                onClick={onSeekerEnter}
                className="group relative overflow-hidden rounded-3xl p-12 text-left transition-transform hover:-translate-y-2"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-mystic-800 to-indigo-900 opacity-90"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
                <div className="relative z-10">
                    <h3 className="text-4xl font-serif font-bold text-white mb-4">{t.seekerTitle}</h3>
                    <p className="text-indigo-200 font-medium text-lg flex items-center gap-2 group-hover:text-white transition-colors">
                        {t.seekerCta}
                    </p>
                </div>
            </button>
            <button 
                onClick={onGuruEnter}
                className="group relative overflow-hidden rounded-3xl p-12 text-left transition-transform hover:-translate-y-2"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-mystic-800 to-gold-900 opacity-90"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600609842388-3e4b7c3d4f82?auto=format&fit=crop&w=1000&q=80')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
                <div className="relative z-10">
                    <h3 className="text-4xl font-serif font-bold text-white mb-4">{t.guruTitle}</h3>
                    <p className="text-gold-200 font-medium text-lg flex items-center gap-2 group-hover:text-white transition-colors">
                        {t.guruCardCta}
                    </p>
                </div>
            </button>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="relative z-10 bg-mystic-950 pt-16 pb-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-900 rounded-full flex items-center justify-center text-sm shadow-[0_0_10px_rgba(124,58,237,0.5)]">🔮</div>
                    <span className="text-xl font-serif font-bold text-white">Astro21</span>
                </div>
                <p className="text-mystic-300 text-sm mb-6">{t.footerTagline}</p>
                <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors">𝕏</div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors">in</div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors">ig</div>
                </div>
            </div>
            <div>
                <h4 className="text-white font-bold mb-4">Links</h4>
                <ul className="space-y-2 text-sm text-mystic-300">
                    <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-gold-400 transition-colors">Home</button></li>
                    <li><button className="hover:text-gold-400 transition-colors">About</button></li>
                    <li><button className="hover:text-gold-400 transition-colors">Modules</button></li>
                    <li><button className="hover:text-gold-400 transition-colors">Pricing</button></li>
                    <li><button className="hover:text-gold-400 transition-colors">Blog</button></li>
                </ul>
            </div>
            <div>
                <h4 className="text-white font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-mystic-300">
                    <li><button onClick={() => { setPageView('privacy'); window.scrollTo(0, 0); }} className="hover:text-gold-400 transition-colors">Privacy Policy</button></li>
                    <li><button onClick={() => { setPageView('terms'); window.scrollTo(0, 0); }} className="hover:text-gold-400 transition-colors">Terms & Conditions</button></li>
                    <li><button className="hover:text-gold-400 transition-colors">Refund Policy</button></li>
                    <li><button className="hover:text-gold-400 transition-colors">Contact</button></li>
                </ul>
            </div>
        </div>
        <div className="text-center text-xs text-mystic-600 pt-8 border-t border-white/5">
            © 2024 Astro21. All rights reserved. {t.footerTagline}
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-mystic-800 border border-gold-500/30 p-8 rounded-3xl max-w-sm w-full relative shadow-2xl">
                  <button onClick={closeLogin} className="absolute top-4 right-4 text-mystic-500 hover:text-white">✕</button>
                  
                  {isAdminMode ? (
                      <>
                          <h3 className="text-2xl font-serif text-white mb-2">Admin Access</h3>
                          <p className="text-mystic-400 text-sm mb-6">Enter Security PIN</p>
                           <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                              <input type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} placeholder="PIN Code" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 text-center tracking-widest text-lg" autoFocus />
                              {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
                              <button type="submit" className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-mystic-900 font-bold py-3 rounded-xl transition-colors">Verify Access</button>
                           </form>
                      </>
                  ) : (
                      <>
                           {loginStep === 'credentials' && (
                              <>
                                  <h3 className="text-2xl font-serif text-white mb-2">Welcome Back</h3>
                                  <p className="text-mystic-400 text-sm mb-6">Enter credentials to verify identity.</p>
                                  <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                                      <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number or Email" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-all" autoFocus />
                                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-all" />
                                      <div className="text-right">
                                          <button type="button" onClick={() => { setLoginStep('forgot_request'); setErrorMsg(''); }} className="text-xs text-gold-500 hover:text-white underline">Forgot Password?</button>
                                      </div>
                                      {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
                                      <button type="submit" disabled={isLoading} className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-mystic-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center">
                                          {isLoading ? <span className="w-5 h-5 border-2 border-mystic-900 border-t-transparent rounded-full animate-spin"></span> : 'Authenticate'}
                                      </button>
                                  </form>
                              </>
                           )}

                           {loginStep === 'otp' && (
                              <>
                                  <h3 className="text-2xl font-serif text-white mb-2">Verify OTP</h3>
                                  <p className="text-mystic-400 text-sm mb-6">Code sent to your contact.</p>
                                  <form onSubmit={handleOtpSubmit} className="space-y-4">
                                      <input type="text" value={otp} onChange={(e) => { const val = e.target.value.trim(); if (val.length <= 6) setOtp(val); }} placeholder="Enter 6-digit Code" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all text-center tracking-widest text-lg font-mono" maxLength={6} autoFocus />
                                      {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
                                      <button type="submit" disabled={otp.length < 6 || isLoading} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-mystic-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center">
                                           {isLoading ? <span className="w-5 h-5 border-2 border-mystic-900 border-t-transparent rounded-full animate-spin"></span> : 'Verify & Login'}
                                      </button>
                                  </form>
                              </>
                           )}

                           {loginStep === 'forgot_request' && (
                               <>
                                  <h3 className="text-2xl font-serif text-white mb-2">Reset Password</h3>
                                  <p className="text-mystic-400 text-sm mb-6">Enter your registered contact to receive OTP.</p>
                                  <form onSubmit={handleForgotRequest} className="space-y-4">
                                      <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number or Email" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-all" autoFocus />
                                      <div className="text-right">
                                          <button type="button" onClick={() => setLoginStep('credentials')} className="text-xs text-mystic-500 hover:text-white">Back to Login</button>
                                      </div>
                                      {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
                                      <button type="submit" disabled={isLoading || !phoneNumber} className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-mystic-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center">
                                          {isLoading ? <span className="w-5 h-5 border-2 border-mystic-900 border-t-transparent rounded-full animate-spin"></span> : 'Send Reset Code'}
                                      </button>
                                  </form>
                               </>
                           )}

                           {loginStep === 'forgot_otp' && (
                               <>
                                  <h3 className="text-2xl font-serif text-white mb-2">Verify Reset Code</h3>
                                  <p className="text-mystic-400 text-sm mb-6">Enter the code sent to {phoneNumber}</p>
                                  <form onSubmit={handleForgotOtpVerify} className="space-y-4">
                                      <input type="text" value={otp} onChange={(e) => { const val = e.target.value.trim(); if (val.length <= 6) setOtp(val); }} placeholder="Enter 6-digit Code" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all text-center tracking-widest text-lg font-mono" maxLength={6} autoFocus />
                                      {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
                                      <button type="submit" disabled={otp.length < 6 || isLoading} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-mystic-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center">
                                           {isLoading ? <span className="w-5 h-5 border-2 border-mystic-900 border-t-transparent rounded-full animate-spin"></span> : 'Verify Code'}
                                      </button>
                                  </form>
                               </>
                           )}

                           {loginStep === 'forgot_new_password' && (
                               <>
                                  <h3 className="text-2xl font-serif text-white mb-2">Create New Password</h3>
                                  <p className="text-mystic-400 text-sm mb-6">Set a secure password for your account.</p>
                                  <form onSubmit={handlePasswordReset} className="space-y-4">
                                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-all" autoFocus />
                                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-all" />
                                      {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
                                      <button type="submit" disabled={isLoading || password.length < 4} className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-mystic-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center">
                                          {isLoading ? <span className="w-5 h-5 border-2 border-mystic-900 border-t-transparent rounded-full animate-spin"></span> : 'Reset Password'}
                                      </button>
                                  </form>
                               </>
                           )}
                      </>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};

export default LandingPage;
