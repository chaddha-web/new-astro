
export enum Sender {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
  ASTROLOGER = 'astrologer'
}

export enum MessageType {
  TEXT = 'text',
  CALL_OFFER = 'call_offer',
  PAYMENT_REQUEST = 'payment_request',
  SYSTEM_NOTIF = 'system_notif',
  AUDIO = 'audio',
  IMAGE = 'image',
  VIDEO = 'video'
}

export type Language = 'en' | 'hi' | 'te' | 'mr' | 'ml' | 'pa';

export interface Product {
  id: string;
  name: string;
  category: 'gemstone' | 'rudraksha' | 'pooja' | 'yantra' | 'incense';
  price: number;
  description: string;
  benefits: string;
  imageUrl: string;
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  type?: MessageType; 
  timestamp: Date;
  isGist?: boolean; 
  isLocked?: boolean;
  fullContent?: string;
  astrologerId?: string;
  suggestedProducts?: Product[];
  attachmentUrl?: string; 
  metadata?: {
    amount?: number;
    callType?: 'voice' | 'video';
    duration?: number; 
    callStatus?: 'ended' | 'missed' | 'active'; 
    durationText?: string; 
    status?: string;
  };
}

export interface Astrologer {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  pricePerMin: number;
  imageUrl: string;
  isOnline: boolean;
}

export interface Earnings {
  chats: number;
  products: number;
  tips: number;
  withdrawn: number;
}

export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export interface PayoutRecord {
  id: string;
  amount: number;
  date: string;
  status: 'Processing' | 'Completed' | 'Failed';
  referenceId: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'Product' | 'Subscription' | 'Dakshina' | 'Consultation';
  status: 'Success' | 'Failed';
  date: string;
  details: string;
  relatedEntityId?: string; // ID of Astrologer or Product for attribution
  paymentId?: string; // Razorpay Payment ID
}

export interface CommunicationLog {
  id: string;
  type: 'email' | 'sms' | 'call_voice' | 'call_video' | 'system';
  recipient: string; 
  direction: 'outbound' | 'inbound' | 'internal';
  status: 'sent' | 'delivered' | 'failed' | 'completed' | 'missed' | 'logged';
  timestamp: string;
  details?: string; 
}

export interface UsageLog {
  id?: string;
  user_id: string;
  feature: 'chat' | 'horoscope' | 'analysis';
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  timestamp?: string;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  duration: string; 
  benefits: string[]; 
  featureFlags: string[]; 
}

export interface UserState {
  id?: string; // UUID from DB
  dailyQuestionsLeft: number;
  isPremium: boolean;
  tier?: 'free' | 'member21' | 'premium'; // Added tier
  name: string;
  gender?: string;
  contact?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  hasOnboarded: boolean;
  connectedAstrologerId?: string;
  subscriptionExpiry?: Date;
  language: Language; 
  subscriptionTierId?: string;
  isAdminImpersonating?: boolean; 
}

export interface CallState {
  isActive: boolean;
  type: 'voice' | 'video';
  partnerName: string;
  partnerImage: string;
  channelName?: string;
  messageId?: string; 
}

export enum AppView {
  CHAT = 'chat',
  MARKETPLACE = 'marketplace',
  SHOP = 'shop',
  PROFILE = 'profile',
  ASTRO_DASHBOARD = 'astro_dashboard',
  ADMIN_DASHBOARD = 'admin_dashboard',
  HOROSCOPE = 'horoscope',
  NOT_FOUND = 'not_found'
}

export interface HoroscopeData {
  starSign: string;
  language?: Language; // Track language
  meta?: {
    dailyDate?: string;
    weekDate?: string;
    monthDate?: string;
  };
  daily: {
    overview: string; // Detailed View
    simple_overview: string; // Simple explanation
    dos: string[];
    donts: string[];
    luckyColor: string;
    luckyNumber: string;
  };
  weekly: string; // Includes date range in text
  monthly: string; // Detailed overview
}
