
import { supabase } from './supabaseClient';
import { Product, Transaction, UserState, Message, Astrologer, CommunicationLog, UsageLog } from '../types';
import { MOCK_PRODUCTS, MOCK_ASTROLOGERS } from '../constants';
import { hashPassword, compressAndEncrypt, decryptAndDecompress } from './securityService';

// --- HELPERS ---
export const generateReferenceId = (type: 'Product' | 'Subscription' | 'Dakshina' | 'Consultation' | 'Log', subtype?: string) => {
    const random = Math.floor(1000 + Math.random() * 9000);
    let prefix = 'GEN';
    
    switch(type) {
        case 'Product': prefix = 'STR'; break; 
        case 'Consultation': prefix = 'CNS'; break;
        case 'Subscription': prefix = 'SUB'; break;
        case 'Dakshina': prefix = 'TIP'; break;
        case 'Log': prefix = 'LOG'; break;
    }
    
    if (subtype && type === 'Subscription') {
        let tierCode = 'GEN';
        const lowerSub = subtype.toLowerCase();
        if (lowerSub.includes('monthly')) tierCode = 'MTH';
        else if (lowerSub.includes('yearly')) tierCode = 'YR';
        else if (lowerSub.includes('one')) tierCode = 'ONE';
        else if (lowerSub.includes('elite')) tierCode = 'ELT';
        
        return `${prefix}-${tierCode}-${random}`;
    }
    
    return `${prefix}-${random}`;
};

// --- NATAL CACHE ---
export const fetchCachedReading = async (key: string): Promise<string | null> => {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase.from('natal_cache').select('response').eq('id', key).maybeSingle();
        if (error || !data) return null;
        return data.response;
    } catch (e) { return null; }
};

export const saveCachedReading = async (key: string, response: string) => {
    if (!supabase) return;
    try { await supabase.from('natal_cache').upsert({ id: key, response }, { onConflict: 'id' }); } catch (e) { console.warn("Failed to cache", e); }
};

// --- LOGGING ---
export const logCommunication = async (type: CommunicationLog['type'], recipient: string, direction: CommunicationLog['direction'], status: CommunicationLog['status'], details?: string) => {
    const logId = generateReferenceId('Log');
    console.log(`[${logId}] ${direction.toUpperCase()} ${type} to ${recipient}: ${status}`);
    if (supabase) {
        try { await supabase.from('communications').insert([{ id: logId, type, recipient, direction, status, details, timestamp: new Date().toISOString() }]); } catch (e) {}
    }
};

export const fetchCommunicationLogs = async (): Promise<CommunicationLog[]> => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('communications').select('*').order('timestamp', { ascending: false });
        if (error) {
            console.error("Error fetching logs:", error);
            return [];
        }
        return data ? data.map((log: any) => ({ ...log })) : [];
    } catch (e) { return []; }
};

// --- TOKEN USAGE ---
export const logTokenUsage = async (userId: string, feature: string, inputTokens: number, outputTokens: number) => {
    if (!supabase || !userId) return;
    try {
        // userId must be UUID
        await supabase.from('usage_logs').insert([{
            user_id: userId,
            feature: feature,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
            timestamp: new Date().toISOString()
        }]);
    } catch (e) { console.error("Failed to log usage", e); }
};

export const fetchUsageStats = async () => {
    if (!supabase) return { totalRequests: 0, estimatedTokens: 0 };
    try {
        const { data } = await supabase.from('usage_logs').select('total_tokens');
        if (!data) return { totalRequests: 0, estimatedTokens: 0 };
        const totalTokens = data.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);
        return { totalRequests: data.length, estimatedTokens: totalTokens };
    } catch (e) { return { totalRequests: 0, estimatedTokens: 0 }; }
};

// --- AUTH ---
export const sendAuthOtp = async (contact: string): Promise<{ success: boolean; message?: string; isRateLimit?: boolean }> => {
    if (!supabase) return { success: false, message: "System not initialized" };
    const isEmail = /[a-zA-Z@]/.test(contact);
    await logCommunication(isEmail ? 'email' : 'sms', contact, 'outbound', 'sent', 'OTP Requested');

    try {
        let error;
        if (isEmail) {
            const res = await supabase.auth.signInWithOtp({ email: contact, options: { shouldCreateUser: true } });
            error = res.error;
        } else {
            const phone = contact.replace(/[\s-]/g, '');
            const res = await supabase.auth.signInWithOtp({ phone: phone, options: { shouldCreateUser: true } });
            error = res.error;
        }

        if (error) {
            const msg = error.message.toLowerCase();
            await logCommunication(isEmail ? 'email' : 'sms', contact, 'outbound', 'failed', `Error: ${msg}`);
            if (msg.includes('security') || msg.includes('seconds') || msg.includes('rate limit')) {
                return { success: false, message: error.message, isRateLimit: true };
            }
            throw error;
        }
        return { success: true };
    } catch (e: any) { return { success: false, message: e.message }; }
};

export const verifyAuthOtp = async (contact: string, token: string): Promise<{ success: boolean; message?: string; userId?: string }> => {
    if (!supabase) return { success: false, message: "System not initialized" };
    const isEmail = /[a-zA-Z@]/.test(contact);

    try {
        let error, data;
        if (isEmail) {
            ({ data, error } = await supabase.auth.verifyOtp({ email: contact, token: token, type: 'email' }));
        } else {
            const phone = contact.replace(/[\s-]/g, '');
            ({ data, error } = await supabase.auth.verifyOtp({ phone: phone, token: token, type: 'sms' }));
        }

        if (error) return { success: false, message: error.message };
        
        if (data.session && data.session.user) {
            const userId = data.session.user.id;
            await logCommunication(isEmail ? 'email' : 'sms', contact, 'inbound', 'completed', 'OTP Verified');
            
            // NOTE: We do NOT insert a skeletal profile here anymore.
            // We wait for saveUserProfile to be called with the full form data.
            // This prevents "Name = Email" and NULL field issues.
            
            return { success: true, userId: userId };
        } else {
            return { success: false, message: "Invalid code." };
        }
    } catch (e: any) { return { success: false, message: "Verification failed." }; }
};

export const resetUserPassword = async (contact: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!supabase) return { success: false, message: "System not initialized" };
    try {
        const hashedPassword = await hashPassword(newPassword);
        const { error } = await supabase.from('profiles').update({ password: hashedPassword }).eq('contact', contact);
        if (error) throw error;
        return { success: true };
    } catch (e) { return { success: false, message: "Failed to update password." }; }
};

// --- SEEDING ---
export const seedDatabase = async () => {
    if (!supabase) return;
    try {
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
        if (count === 0) {
            const p = MOCK_PRODUCTS.map(x => ({ name: x.name, category: x.category, price: x.price, description: x.description, benefits: x.benefits, image_url: x.imageUrl }));
            await supabase.from('products').insert(p);
        }
        const { count: ac } = await supabase.from('astrologers').select('*', { count: 'exact', head: true });
        if (ac === 0) {
            const a = MOCK_ASTROLOGERS.map(x => ({ name: x.name, specialty: x.specialty, rating: x.rating, reviews: x.reviews, price_per_min: x.pricePerMin, image_url: x.imageUrl, is_online: x.isOnline }));
            await supabase.from('astrologers').insert(a);
        }
    } catch (e) {}
};

export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
    if (!supabase) return null;
    return supabase.channel(`public:${table}`).on('postgres_changes', { event: '*', schema: 'public', table: table }, callback).subscribe();
};

// --- DATA FETCHING ---
export const fetchAstrologers = async (): Promise<Astrologer[]> => {
    if (!supabase) return MOCK_ASTROLOGERS;
    try {
        const { data } = await supabase.from('astrologers').select('*').order('is_online', { ascending: false });
        if (!data) return MOCK_ASTROLOGERS;
        return data.map((a: any) => ({ id: a.id, name: a.name, specialty: a.specialty, rating: a.rating, reviews: a.reviews, pricePerMin: a.price_per_min, imageUrl: a.image_url, isOnline: a.is_online }));
    } catch (e) { return MOCK_ASTROLOGERS; }
};

export const saveAstrologer = async (astro: Partial<Astrologer>) => {
    if (!supabase) return;
    const payload = { name: astro.name, specialty: astro.specialty, rating: astro.rating, reviews: astro.reviews, price_per_min: astro.pricePerMin, image_url: astro.imageUrl, is_online: astro.isOnline };
    if (astro.id && astro.id.length > 10) await supabase.from('astrologers').update(payload).eq('id', astro.id);
    else await supabase.from('astrologers').insert([payload]);
};

export const deleteAstrologer = async (id: string) => { if (supabase) await supabase.from('astrologers').delete().eq('id', id); };

export const fetchProducts = async (): Promise<Product[]> => {
  if (!supabase) return MOCK_PRODUCTS;
  try {
      const { data } = await supabase.from('products').select('*');
      if (!data) return MOCK_PRODUCTS;
      return data.map((p: any) => ({ id: p.id, name: p.name, category: p.category, price: p.price, description: p.description, benefits: p.benefits, imageUrl: p.image_url }));
  } catch (e) { return MOCK_PRODUCTS; }
};

export const createProduct = async (product: Product): Promise<Product | null> => {
  if (!supabase) return product;
  const payload = { name: product.name, category: product.category, price: product.price, description: product.description, benefits: product.benefits, image_url: product.imageUrl };
  let data, error;
  if (product.id && product.id.length > 10 && !product.id.startsWith('p')) { ({ data, error } = await supabase.from('products').update(payload).eq('id', product.id).select().single()); } 
  else { ({ data, error } = await supabase.from('products').insert([payload]).select().single()); }
  if (error) return null;
  return { ...product, id: data.id, name: data.name, imageUrl: data.image_url, category: data.category };
};

export const deleteProductFromDb = async (id: string) => { if(supabase) { const {error} = await supabase.from('products').delete().eq('id', id); return !error; } return true; };

export const fetchTransactions = async (): Promise<Transaction[]> => {
  if (!supabase) return [];
  try {
      // Fetch without ordering to avoid index issues
      const { data, error } = await supabase.from('transactions').select('*');
      
      if (error) {
          console.error("DB: Error fetching transactions:", error);
          return [];
      }
      if (!data || data.length === 0) {
          console.log("DB: No transactions found (or RLS restricted).");
          return [];
      }

      const mapped = data.map((t: any) => ({ 
          id: t.id, 
          userId: t.user_id, 
          userName: t.user_name || 'Anonymous', 
          amount: t.amount, 
          type: t.type, 
          status: t.status, 
          date: t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], 
          details: t.details,
          _created_at: t.created_at // Keep for sorting
      }));

      // Sort Descending client-side
      return mapped.sort((a: any, b: any) => {
          return new Date(b._created_at || 0).getTime() - new Date(a._created_at || 0).getTime();
      });

  } catch (e) { 
      console.error("DB: Exception fetching transactions:", e);
      return []; 
  }
};

export const saveTransaction = async (tx: Transaction) => {
  if (!supabase) return;
  try { 
      const { error } = await supabase.from('transactions').insert([{ 
          id: tx.id, 
          user_id: tx.userId, 
          user_name: tx.userName, 
          amount: tx.amount, 
          type: tx.type, 
          details: tx.details, 
          status: tx.status, 
          created_at: new Date().toISOString() 
      }]); 
      if (error) console.error("DB: Transaction save failed", error);
  } catch (e) { console.error("DB: Exception saving transaction", e); }
};

export const fetchProfiles = async (): Promise<any[]> => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('profiles').select('*');
        
        if (error) {
            console.error("DB: Error fetching profiles (likely RLS restricted):", error);
            return [];
        }
        
        if (!data || data.length === 0) {
            // RLS often returns empty array instead of error
            return [];
        }

        // Standardize to CamelCase for App Consistency
        const mappedUsers = data.map((u: any) => {
            // DERIVE TIER LOGIC IF COLUMN MISSING OR EXPLICITLY SET
            let tier = u.tier || 'free';
            const now = new Date();
            const expiry = u.subscription_expiry ? new Date(u.subscription_expiry) : null;
            
            if (tier === 'free' || !tier) {
                if (u.is_premium) {
                    tier = 'premium';
                } else if (expiry && expiry > now && expiry.getFullYear() - now.getFullYear() >= 2) {
                    // Member 21 usually has a long expiry (3 years)
                    tier = 'member21';
                }
            }

            return {
                id: u.id,
                name: u.name || 'User',
                contact: u.contact,
                isPremium: !!u.is_premium,
                tier: tier, 
                dailyQuestionsLeft: u.daily_questions_left || 0,
                gender: u.gender,
                birthDate: u.birth_date,
                birthTime: u.birth_time,
                birthPlace: u.birth_place,
                createdAt: u.created_at,
                chatHistory: u.chat_history,
                subscriptionExpiry: expiry // Ensure expiry is passed
            };
        });

        return mappedUsers.sort((a: any, b: any) => {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    } catch (e) {
        console.error("DB: Exception fetching profiles:", e);
        return [];
    }
};

export const updateProfile = async (id: string, updates: any) => { 
    if(!supabase) return;
    
    // Map CamelCase back to snake_case for DB
    const dbUpdates: any = {};
    if (updates.isPremium !== undefined) dbUpdates.is_premium = updates.isPremium;
    if (updates.dailyQuestionsLeft !== undefined) dbUpdates.daily_questions_left = updates.dailyQuestionsLeft;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
    
    // Handle Subscription Expiry update (crucial for Tier management)
    if (updates.subscriptionExpiry !== undefined) dbUpdates.subscription_expiry = updates.subscriptionExpiry;
    // Allow direct snake_case passing too
    if (updates.subscription_expiry !== undefined) dbUpdates.subscription_expiry = updates.subscription_expiry;

    await supabase.from('profiles').update(dbUpdates).eq('id', id); 
};

export const fetchUserProfile = async (contact: string | string[]): Promise<{ profile: any | null, chatHistory: Message[] }> => {
  if (!supabase) return { profile: null, chatHistory: [] };
  try {
      let query = supabase.from('profiles').select('*');
      if (Array.isArray(contact)) query = query.in('contact', contact); else query = query.eq('contact', contact);
      const { data, error } = await query.limit(1).maybeSingle();
      if (error || !data) return { profile: null, chatHistory: [] };

      let messages: Message[] = [];
      if (data.chat_history) {
          const decrypted = decryptAndDecompress(data.chat_history);
          if (decrypted) messages = decrypted.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
      
      // DERIVE TIER FROM DATA (Robust against missing column)
      let tier = data.tier || 'free';
      const now = new Date();
      const expiry = data.subscription_expiry ? new Date(data.subscription_expiry) : null;
      
      if (tier === 'free' || !tier) {
          if (data.is_premium) {
              tier = 'premium';
          } else if (expiry && expiry > now && expiry.getFullYear() - now.getFullYear() >= 2) {
              // Member 21: Not premium, but has long expiry
              tier = 'member21';
          }
      }

      // Explicit Mapping from DB (snake_case) to App (CamelCase)
      const mappedProfile = { 
          id: data.id, 
          contact: data.contact, 
          name: data.name, 
          gender: data.gender, 
          birthDate: data.birth_date, // snake_case from DB
          birthTime: data.birth_time, // snake_case from DB
          birthPlace: data.birth_place, // snake_case from DB
          isPremium: data.is_premium, // snake_case from DB
          tier: tier, 
          dailyQuestionsLeft: data.daily_questions_left, // snake_case from DB
          subscriptionExpiry: expiry, // snake_case from DB
          password: data.password 
      };

      return {
        profile: mappedProfile,
        chatHistory: messages
      };
  } catch (e) { return { profile: null, chatHistory: [] }; }
};

export const generateUniqueUsername = async (fullName: string): Promise<string> => {
    return fullName.trim();
};

export const saveUserProfile = async (user: UserState, password?: string, messages?: Message[]) => {
  if (!supabase || !user.contact) return;
  try {
      // HANDLE EXPIRY: Can be String or Date object. Convert to ISO String.
      let expiryVal = null;
      if (user.subscriptionExpiry) {
          if (typeof user.subscriptionExpiry === 'string') {
              expiryVal = user.subscriptionExpiry;
          } else if (user.subscriptionExpiry instanceof Date) {
              expiryVal = user.subscriptionExpiry.toISOString();
          }
      }

      // Member 21 Safety Check: Ensure expiry is set if tier suggests it
      if (user.tier === 'member21' && !expiryVal) {
          const d = new Date();
          d.setFullYear(d.getFullYear() + 3);
          expiryVal = d.toISOString();
      }

      const payload: any = {
        contact: user.contact,
        name: user.name || '',
        gender: user.gender || null, // Send NULL instead of empty string for optional fields
        birth_date: user.birthDate || null, // DATE type columns choke on empty strings
        birth_time: user.birthTime || null, 
        birth_place: user.birthPlace || null,
        is_premium: !!user.isPremium,
        daily_questions_left: typeof user.dailyQuestionsLeft === 'number' ? user.dailyQuestionsLeft : 0,
        subscription_expiry: expiryVal,
        tier: user.tier || 'free' // Force sending tier if column exists
      };
      
      // If the user is Member 21, ensure we set specific flags that allow us to derive it later
      if (user.tier === 'member21') {
          payload.is_premium = false;
      }

      if (password) payload.password = await hashPassword(password);
      if (messages && messages.length > 0) payload.chat_history = compressAndEncrypt(messages);

      // Prefer ID if available (UUID), otherwise fallback to contact
      if (user.id && user.id.length > 5) {
         // CRITICAL FIX: Use upsert instead of update when ID is present. 
         // This ensures that if the row exists it is updated, but if for any reason (like incomplete registration)
         // the row is missing attributes or needs a forceful write, upsert handles it better.
         // We also include the ID in the payload for the upsert to work on PK.
         const upsertPayload = { ...payload, id: user.id };
         const { error } = await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id' });
         if (error) console.error("DB: Upsert (by ID) failed", JSON.stringify(error));
      } else {
         const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'contact' });
         if (error) console.error("DB: Upsert (by Contact) failed", JSON.stringify(error));
      }
  } catch (e) { console.error("DB: Exception saving profile", e); }
};
