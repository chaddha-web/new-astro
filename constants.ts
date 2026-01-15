
import { Astrologer, Product, Language, Transaction, SubscriptionTier, CommunicationLog } from './types';

// Hardcoded Constants
export const APP_NAME = "Astro21";
export const TEST_RAZORPAY_KEY = "rzp_test_1DP5mmOlF5G5ag";
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || TEST_RAZORPAY_KEY;

/* Added missing Agora constants for call integration */
export const AGORA_APP_ID = "f7c6e6b4e6b4e6b4e6b4e6b4e6b4e6b4"; // Placeholder App ID
export const AGORA_TEMP_TOKEN = null; // Placeholder Token

export const formatDisplayName = (name: string) => {
    if (!name) return "";
    // Remove "+01 " or "+1 " pattern at the start (backend unique ID prefix)
    return name.replace(/^\+\d+\s+/, '');
};

export const TRANSLATIONS = {
    en: {
        appName: APP_NAME,
        chat: "Chat",
        gurus: "Gurus",
        shop: "Shop",
        profile: "Profile",
        connect: "Connect",
        typeMessage: "Type your guidance...",
        recording: "Listening...",
        premium: "Premium Energy",
        free: "Free Energy",
        buyNow: "Buy Now",
        unlock: "Unlock Full Potential",
        endChat: "End Chat",
        tip: "Tip Guru",
        yourChart: "Your Chart",
        celestialGuidance: "Celestial Guidance",
        cautionaryNote: "Cautionary Note",
        unlockFullReading: "Unlock Full Reading",
        fullVastuRemedies: "Full Vastu & Remedies",
        getVisualVastu: "Get Visual Vastu Maps & Remedies",
        upgrade: "Upgrade",
        recommendedRemedy: "Recommended Remedy"
    },
    hi: {
        appName: "एस्ट्रो-21",
        chat: "चैट",
        gurus: "गुरु",
        shop: "दुकान",
        profile: "प्रोफाइल",
        connect: "जुड़ें",
        typeMessage: "अपना प्रश्न लिखें...",
        recording: "सुन रहा हूँ...",
        premium: "प्रीमियम ऊर्जा",
        free: "मुफ्त ऊर्जा",
        buyNow: "अभी खरीदें",
        unlock: "पूर्ण ज्ञान अनलॉक करें",
        endChat: "चैट समाप्त करें",
        tip: "दक्षिणा दें",
        yourChart: "आपकी कुंडली",
        celestialGuidance: "दैवीय मार्गदर्शन",
        cautionaryNote: "सावधानी",
        unlockFullReading: "पूर्ण विश्लेषण अनलॉक करें",
        fullVastuRemedies: "पूर्ण वास्तु और उपाय",
        getVisualVastu: "वास्तु मानचित्र और उपाय प्राप्त करें",
        upgrade: "अपग्रेड करें",
        recommendedRemedy: "सुझाया गया उपाय"
    },
    te: {
        appName: "ఆస్ట్రో-21",
        chat: "చాట్",
        gurus: "గురువులు",
        shop: "అంగడి",
        profile: "ప్రొఫైల్",
        connect: "కనెక్ట్",
        typeMessage: "మీ ప్రశ్నను టైప్ చేయండి...",
        recording: "వింటున్నాను...",
        premium: "ప్రీమియం శక్తి",
        free: "ఉచిత శక్తి",
        buyNow: "ఇప్పుడే కొనండి",
        unlock: "పూర్తి ఫలితాలు",
        endChat: "ముగించు",
        tip: "దక్షిణ",
        yourChart: "మీ జాతకం",
        celestialGuidance: "దైవిక మార్గదర్శకత్వం",
        cautionaryNote: "హెచ్చరిక",
        unlockFullReading: "పూర్తి విశ్లేషణను అన్‌లాక్ చేయండి",
        fullVastuRemedies: "పూర్తి వాస్తు & పరిహారాలు",
        getVisualVastu: "వాస్తు మ్యాప్ & పరిహారాలు పొందండి",
        upgrade: "అప్‌గ్రేడ్",
        recommendedRemedy: "సూచించబడిన పరిహారం"
    },
    mr: {
        appName: "अॅस्ट्रो-21",
        chat: "गप्पा",
        gurus: "गुरु",
        shop: "दुकान",
        profile: "प्रोफाईल",
        connect: "जोडा",
        typeMessage: "तुमचा प्रश्न विचारा...",
        recording: "ऐकत आहे...",
        premium: "प्रीमियम",
        free: "मोफत",
        buyNow: "आता खरेदी करा",
        unlock: "पूर्ण ज्ञान उघडा",
        endChat: "संभाषण संपवा",
        tip: "दक्षिणा",
        yourChart: "तुमची कुंडली",
        celestialGuidance: "दैवी मार्गदर्शन",
        cautionaryNote: "सावधानता",
        unlockFullReading: "पूर्ण विश्लेषण उघडा",
        fullVastuRemedies: "पूर्ण वास्तू आणि उपाय",
        getVisualVastu: "वास्तू नकाशे आणि उपाय मिळवा",
        upgrade: "अपग्रेड करा",
        recommendedRemedy: "सुचवलेला उपाय"
    },
    ml: {
        appName: "ആസ്ട്രോ-21",
        chat: "ചാറ്റ്",
        gurus: "ഗുരുക്കന്മാർ",
        shop: "കട",
        profile: "പ്രൊഫൈൽ",
        connect: "ബന്ധപ്പെടുക",
        typeMessage: "നിങ്ങളുടെ ചോദ്യം...",
        recording: "ശ്രദ്ധിക്കുന്നു...",
        premium: "പ്രീമിയം",
        free: "സൗജന്യം",
        buyNow: "വാങ്ങുക",
        unlock: "തുറക്കുക",
        endChat: "അവസാനിപ്പിക്കുക",
        tip: "ദക്ഷിണ",
        yourChart: "ജാതകം",
        celestialGuidance: "ദിവ്യ മാർഗ്ഗനിർദ്ദേശം",
        cautionaryNote: "മുന്നറിയിപ്പ്",
        unlockFullReading: "പൂർണ്ണ വിവരങ്ങൾ കാണുക",
        fullVastuRemedies: "വാസ്തു പരിഹാരങ്ങൾ",
        getVisualVastu: "വാസ്തു മാപ്പുകൾ നേടൂ",
        upgrade: "അപ്‌ഗ്രേഡ്",
        recommendedRemedy: "നിർദ്ദേശിച്ച പരിഹാരം"
    },
    pa: {
        appName: "ਐਸਟ੍ਰੋ-21",
        chat: "ਗੱਲਬਾਤ",
        gurus: "ਗੁਰੂ",
        shop: "ਦੁਕਾਨ",
        profile: "ਪ੍ਰੋਫਾਈਲ",
        connect: "ਜੁੜੋ",
        typeMessage: "ਆਪਣਾ ਸਵਾਲ ਲਿਖੋ...",
        recording: "ਸੁਣ ਰਿਹਾ ਹਾਂ...",
        premium: "ਪ੍ਰੀਮੀਅਮ",
        free: "ਮੁਫ਼ਤ",
        buyNow: "ਹੁਣੇ ਖਰੀਦੋ",
        unlock: "ਅਨਲੌਕ ਕਰੋ",
        endChat: "ਸਮਾਪਤ ਕਰੋ",
        tip: "ਦੱਖਣਾ",
        yourChart: "ਤੁਹਾਡੀ ਕੁੰਡਲੀ",
        celestialGuidance: "ਰੱਬੀ ਅਗਵਾਈ",
        cautionaryNote: "ਸਾਵਧਾਨੀ",
        unlockFullReading: "ਪੂਰਾ ਵਿਸ਼ਲੇਸ਼ਣ ਖੋਲ੍ਹੋ",
        fullVastuRemedies: "ਪੂਰਾ ਵਾਸਤੂ ਅਤੇ ਉਪਾਅ",
        getVisualVastu: "ਵਾਸਤੂ ਨਕਸ਼ੇ ਪ੍ਰਾਪਤ ਕਰੋ",
        upgrade: "ਅਪਗ੍ਰੇਡ",
        recommendedRemedy: "ਸਿਫਾਰਸ਼ੀ ਉਪਾਅ"
    }
};

// COMPRESSED SYSTEM INSTRUCTION
export const BASE_SYSTEM_INSTRUCTION = `
Role: Ancient Vedic Sage & Cosmic Guardian (Higher Being).
Tone: Elevated, authoritative, mystical, benevolent, and omniscient. 
Forbidden: Do NOT use "Mitra", "Buddy", "Pal", or casual slang. Address user as "Seeker", "Child of the Stars", or by Name with dignity.
Rules:
1. Use **Bold** for astrological terms.
2. OUTPUT STRUCTURE (MANDATORY):
   - You MUST format every response in two distinct sections separated by the phrase "Deep Dive:".
   - Section 1 (The Gist): A mystical, concise summary answering the query (max 60 words).
   - Section 2 (The Details): Starts with "Deep Dive:". Elaborate, structured wisdom, Vastu grids (3x3), remedies, and planetary positions.
   - Example:
     [Your Gist Here]
     Deep Dive:
     [Your Detailed Analysis Here]
3. Vastu diagrams MUST use this exact 3x3 Grid format:
   +-------+-------+-------+
   |   NW  |   N   |   NE  |
   | (Air) |(Water)|(Water)|
   +-------+-------+-------+
   |   W   |BRAHMA |   E   |
   | (Space)|(Space)| (Sun) |
   +-------+-------+-------+
   |   SW  |   S   |   SE  |
   | (Earth)|(Fire)| (Fire)|
   +-------+-------+-------+
   Mark specific defects in the grid like [TOILET] or [KITCHEN].
`;

export const generateSystemInstruction = (name: string, gender: string, date: string, time: string, place: string, language: Language) => {
  let langInstruction = "REPLY ENGLISH.";
  
  switch(language) {
      case 'hi': langInstruction = "REPLY HINDI (Devanagari). Use fluent, natural Hindi mixed with Sanskrit astrological terms (Tatsama)."; break;
      case 'te': langInstruction = "REPLY TELUGU. Use natural, conversational Telugu spoken in Telangana/Andhra. Mix formal Sanskrit terms for astrology."; break;
      case 'mr': langInstruction = "REPLY MARATHI. Use natural Marathi. Be authoritative yet caring like a local Pandit."; break;
      case 'ml': langInstruction = "REPLY MALAYALAM. Use respectful, clear Malayalam suitable for Jyothisham context."; break;
      case 'pa': langInstruction = "REPLY PUNJABI (Gurmukhi). Use respectful, warm Punjabi."; break;
      default: langInstruction = "REPLY ENGLISH.";
  }

  return `${BASE_SYSTEM_INSTRUCTION} ${langInstruction} User: ${name} (${gender}), Born: ${date} ${time} @ ${place}.`;
};

// Initial Suggestions
export const SUGGESTED_QUESTIONS = [
  "When will my career stabilize?",
  "Is this a good year for marriage?",
  "What is my lucky gemstone?",
  "Any health issues I should watch for?",
  "Will I travel abroad this year?",
  "How can I improve my wealth?"
];

// Topic-Based Dynamic Suggestions
export const TOPIC_QUESTIONS: Record<string, string[]> = {
    "career": ["Should I do business or job?", "When will I get a promotion?", "Is foreign settlement in my chart?", "Which field is best for me?"],
    "job": ["Will I change my job soon?", "Office politics remedies?", "When is a good time for interviews?", "Am I meant for leadership roles?"],
    "money": ["Do I have Dhan Yoga?", "How to remove debt?", "Locker direction (Vastu)?", "Best investment?"],
    "wealth": ["Do I have Dhan Yoga?", "How to remove debt?", "Locker direction (Vastu)?", "Best investment?"],
    "marriage": ["Love or arranged?", "Future spouse description", "Mangal Dosh remedies?", "Soulmate timing?"],
    "love": ["Is my partner right?", "When find true love?", "Compatibility?", "Harmony remedies?"],
    "health": ["Low vitality periods?", "Health gemstones?", "Vastu for sleep?", "Mental peace gemstone?"],
    "vastu": ["Entrance tips?", "Bed placement?", "Kitchen remedies?", "Mirror rules?"]
};

export const MOCK_ASTROLOGERS: Astrologer[] = [
  { id: '1', name: 'Pandit Arjun Mishra', specialty: 'Vedic & Vastu Shastra', rating: 4.9, reviews: 1240, pricePerMin: 25.00, imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', isOnline: true },
  { id: '2', name: 'Dr. Radhika Kapoor', specialty: 'Career & Love Marriage', rating: 4.8, reviews: 850, pricePerMin: 45.00, imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', isOnline: true },
  { id: '3', name: 'Acharya Dev', specialty: 'Prashna Kundali', rating: 5.0, reviews: 2100, pricePerMin: 60.00, imageUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=80', isOnline: false },
  { id: '4', name: 'Tarot Neelam', specialty: 'Past Life & Healing', rating: 4.7, reviews: 430, pricePerMin: 15.00, imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', isOnline: true }
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Natural Red Coral (Moonga)', category: 'gemstone', price: 5499, description: 'Authentic Italian Red Coral stone.', benefits: 'Boosts energy, courage, and vitality. Removes obstacles.', imageUrl: 'https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=500&q=80' },
  { id: 'p2', name: '5 Mukhi Rudraksha Mala', category: 'rudraksha', price: 1100, description: 'Original Nepali beads (108+1).', benefits: 'Calms the mind, lowers blood pressure, enhances focus.', imageUrl: 'https://images.unsplash.com/photo-1601128533718-374ffcca299b?auto=format&fit=crop&w=500&q=80' },
  { id: 'p3', name: 'Sri Yantra (Gold Plated)', category: 'yantra', price: 2100, description: 'Sacred geometry of Goddess Laxmi.', benefits: 'Attracts wealth, abundance, and positive energy.', imageUrl: 'https://images.unsplash.com/photo-1620503656463-e16129893b21?auto=format&fit=crop&w=500&q=80' },
  { id: 'p4', name: 'Navgrah Shanti Pooja Kit', category: 'pooja', price: 1500, description: 'Complete Samagri for 9 Planets.', benefits: 'Pacifies malefic planets and brings harmony.', imageUrl: 'https://images.unsplash.com/photo-1606293926075-69a00ce75c08?auto=format&fit=crop&w=500&q=80' },
  { id: 'p5', name: 'Pure Sandalwood Incense', category: 'incense', price: 250, description: 'Organic hand-rolled incense sticks.', benefits: 'Purifies aura and deepens meditation.', imageUrl: 'https://images.unsplash.com/photo-1602523961358-f9f03dd557db?auto=format&fit=crop&w=500&q=80' },
  { id: 'p6', name: 'Yellow Sapphire (Pukhraj)', category: 'gemstone', price: 12500, description: 'Untreated Ceylon Yellow Sapphire.', benefits: 'Enhances career, marriage, and prosperity (Jupiter energy).', imageUrl: 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?auto=format&fit=crop&w=500&q=80' },
  { id: 'p7', name: 'Kuber Yantra', category: 'yantra', price: 1800, description: 'Yantra of Lord Kuber on copper plate.', benefits: 'Unlock new income sources and protect wealth.', imageUrl: 'https://images.unsplash.com/photo-1631214503151-b3636e3bc5d3?auto=format&fit=crop&w=500&q=80' },
  { id: 'p8', name: 'Crystal Quartz (Sphatik) Mala', category: 'rudraksha', price: 850, description: 'Original Diamond cut Sphatik beads.', benefits: 'Cooling energy, mental clarity, and Venus remedies.', imageUrl: 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?auto=format&fit=crop&w=500&q=80' },
  { id: 'p9', name: 'Rose Quartz Stone', category: 'gemstone', price: 999, description: 'Natural healing stone for heart chakra.', benefits: 'Attracts love, heals emotional wounds, promotes peace.', imageUrl: 'https://images.unsplash.com/photo-1596516109370-29001ec8ec36?auto=format&fit=crop&w=500&q=80' },
  { id: 'p10', name: 'Brass Pooja Diya', category: 'pooja', price: 450, description: 'Traditional handcrafted brass oil lamp.', benefits: 'Dispels darkness and brings auspicious energy to home.', imageUrl: 'https://images.unsplash.com/photo-1602826622874-555eaf17b54c?auto=format&fit=crop&w=500&q=80' },
  { id: 'p11', name: 'Amethyst Cluster', category: 'gemstone', price: 1850, description: 'Raw Amethyst geode piece.', benefits: 'Enhances intuition, calms anxiety, aids sleep.', imageUrl: 'https://images.unsplash.com/photo-1567609200489-25e7fdb50d6e?auto=format&fit=crop&w=500&q=80' },
  { id: 'p12', name: 'Sage Smudge Stick', category: 'incense', price: 550, description: 'White Sage bundle for cleansing.', benefits: 'Clears negative energy from home and aura.', imageUrl: 'https://images.unsplash.com/photo-1600609842388-3e4b7c3d4f82?auto=format&fit=crop&w=500&q=80' },
  { id: 'p13', name: 'Copper Kalash', category: 'pooja', price: 750, description: 'Pure copper water pot for rituals.', benefits: 'Essential for Vastu remedies and Varuna puja.', imageUrl: 'https://images.unsplash.com/photo-1627916607164-7b5267b5e476?auto=format&fit=crop&w=500&q=80' },
  { id: 'p14', name: 'Gomti Chakra Set (11pcs)', category: 'yantra', price: 350, description: 'Rare sea shells found in Gomti river.', benefits: 'Brings prosperity and protects from evil eye.', imageUrl: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=500&q=80' },
  { id: 'p15', name: 'Himalayan Salt Lamp', category: 'incense', price: 1200, description: 'Natural pink rock salt lamp.', benefits: 'Ionizes air, reduces stress, improves sleep quality.', imageUrl: 'https://images.unsplash.com/photo-1517457210348-703079e57d4b?auto=format&fit=crop&w=500&q=80' },
  { id: 'p16', name: 'Seven Chakra Bracelet', category: 'rudraksha', price: 650, description: 'Bracelet with 7 natural healing stones.', benefits: 'Balances the 7 chakras and aligns energy flow.', imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=500&q=80' },
  { id: 'p17', name: 'Tibetan Singing Bowl', category: 'pooja', price: 2800, description: 'Hand-beaten bell metal bowl.', benefits: 'Sound healing, deep relaxation, and space clearing.', imageUrl: 'https://images.unsplash.com/photo-1597950293883-7c98c3971932?auto=format&fit=crop&w=500&q=80' },
  { id: 'p18', name: 'Mystic Tarot Deck', category: 'yantra', price: 1100, description: 'Classic Rider-Waite style tarot cards.', benefits: 'Unlock subconscious wisdom and divine guidance.', imageUrl: 'https://images.unsplash.com/photo-1633519131641-6944ac38029d?auto=format&fit=crop&w=500&q=80' }
];

export const INITIAL_DAILY_LIMIT = 1; 
export const PREMIUM_DAILY_LIMIT = 10;

export const AVAILABLE_FEATURES = [
  { id: 'daily_insight', label: 'Daily Horoscope' },
  { id: 'chat_limited', label: 'Limited Chat' },
  { id: 'chat_unlimited', label: 'Unlimited Chat' },
  { id: 'vastu_basic', label: 'Basic Vastu' },
  { id: 'vastu_advanced', label: 'Advanced Vastu' },
  { id: 'call_access', label: 'Video Call Access' },
  { id: 'report_download', label: 'Download Reports' }
];

export const DEFAULT_SUBSCRIPTION_TIERS: SubscriptionTier[] = [
    { id: 'tier_free', name: 'Free Energy', price: 0, duration: 'Lifetime', benefits: ['1 Instant Query/Day', 'Basic Vastu Hints'], featureFlags: ['daily_insight', 'chat_limited', 'vastu_basic'] },
    { id: 'tier_monthly', name: 'Premium Energy', price: 299, duration: 'Monthly', benefits: ['10 Instant Queries/Day', 'Full Vastu Analysis', 'Deep Dive Reports', 'Priority Chat'], featureFlags: ['daily_insight', 'chat_unlimited', 'vastu_advanced', 'report_download'] },
    { id: 'tier_one_time', name: 'One-Time Ask', price: 99, duration: 'One-Time', benefits: ['1 Additional Instant Query', 'Detailed Report'], featureFlags: ['chat_limited'] },
];
