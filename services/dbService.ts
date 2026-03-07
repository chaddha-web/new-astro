
import { supabase } from './supabaseClient';
import { Product, Transaction, UserState, Message, Astrologer, CommunicationLog, UsageLog, PayoutRecord, Earnings } from '../types';
import { MOCK_PRODUCTS, MOCK_ASTROLOGERS } from '../constants';
import { hashPassword, compressAndEncrypt, decryptAndDecompress } from './securityService';

// --- LOGGING HELPER ---
const logError = (context: string, error: any) => {
    console.error(`[DB-ERROR] [${context}]`, error);
    // Optionally log to a remote service here in the future
};

// --- HELPERS ---
export const generateReferenceId = (type: 'Product' | 'Subscription' | 'Dakshina' | 'Consultation' | 'Log' | 'Payout', subtype?: string) => {
    const random = Math.floor(1000 + Math.random() * 9000);
    let prefix = 'GEN';
    
    switch(type) {
        case 'Product': prefix = 'STR'; break; 
        case 'Consultation': prefix = 'CNS'; break;
        case 'Subscription': prefix = 'SUB'; break;
        case 'Dakshina': prefix = 'TIP'; break;
        case 'Log': prefix = 'LOG'; break;
        case 'Payout': prefix = 'PAY'; break;
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
    console.log("⬆️ [DB Sending] fetchCachedReading:", key);
    if (!supabase) return null;
    try {
        const { data, error } = await supabase.from('natal_cache').select('response').eq('id', key).maybeSingle();
        if (error) {
            // It's common to not find cache, so maybeSingle avoids error, but we log if it's a real error
            if (error.code !== 'PGRST116') logError('fetchCachedReading', error);
            return null;
        }
        if (!data) {
            console.log("⬇️ [DB Success] fetchCachedReading (Miss):", key);
            return null;
        }
        console.log("⬇️ [DB Success] fetchCachedReading (Hit):", key);
        return data.response;
    } catch (e) { 
        logError('fetchCachedReading:Exception', e);
        return null; 
    }
};

export const saveCachedReading = async (key: string, response: string) => {
    console.log("⬆️ [DB Sending] saveCachedReading:", key);
    if (!supabase) return;
    try { 
        const { error } = await supabase.from('natal_cache').upsert({ id: key, response }, { onConflict: 'id' }); 
        if (error) throw error;
        console.log("⬇️ [DB Success] saveCachedReading:", key);
    } 
    catch (e) { logError('saveCachedReading', e); }
};

export const flushAllInsights = async (): Promise<boolean> => {
    console.log("⬆️ [DB Sending] flushAllInsights");
    if (!supabase) return false;
    try {
        // Delete all rows in natal_cache. 
        // Note: Supabase requires a WHERE clause for delete. neq id 0 covers everything usually.
        const { error } = await supabase.from('natal_cache').delete().neq('id', 'dummy_val_that_does_not_exist');
        if (error) {
            logError('flushAllInsights', error);
            return false;
        }
        console.log("⬇️ [DB Success] flushAllInsights");
        return true;
    } catch (e) {
        logError('flushAllInsights:Exception', e);
        return false;
    }
};

// --- LOGGING ---
export const logCommunication = async (type: CommunicationLog['type'], recipient: string, direction: CommunicationLog['direction'], status: CommunicationLog['status'], details?: string) => {
    const logId = generateReferenceId('Log');
    console.log(`[${logId}] ${direction.toUpperCase()} ${type} to ${recipient}: ${status}`);
    
    if (supabase) {
        console.log("⬆️ [DB Sending] logCommunication:", type, recipient);
        try { 
            const { error } = await supabase.from('communications').insert([{ id: logId, type, recipient, direction, status, details, timestamp: new Date().toISOString() }]); 
            if (error) throw error;
            console.log("⬇️ [DB Success] logCommunication");
        } 
        catch (e) { logError('logCommunication', e); }
    }
};

export const fetchCommunicationLogs = async (): Promise<CommunicationLog[]> => {
    console.log("⬆️ [DB Sending] fetchCommunicationLogs");
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('communications').select('*').order('timestamp', { ascending: false });
        if (error) {
            logError('fetchCommunicationLogs', error);
            return [];
        }
        console.log("⬇️ [DB Success] fetchCommunicationLogs count:", data?.length);
        return data ? data.map((log: any) => ({ ...log })) : [];
    } catch (e) { return []; }
};

// --- TOKEN USAGE ---
export const logTokenUsage = async (userId: string, feature: string, inputTokens: number, outputTokens: number) => {
    if (!supabase || !userId) return;
    console.log("⬆️ [DB Sending] logTokenUsage:", userId, feature);
    try {
        const { error } = await supabase.from('usage_logs').insert([{
            user_id: userId,
            feature: feature,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
            timestamp: new Date().toISOString()
        }]);
        
        if (error) {
            // Log full error details to console to debug 400 Bad Request
            console.error("❌ [DB Error] logTokenUsage failed:", error);
            logError('logTokenUsage', error);
        } else {
            console.log("⬇️ [DB Success] logTokenUsage");
        }
    } catch (e) { logError('logTokenUsage', e); }
};

export const fetchUsageStats = async () => {
    console.log("⬆️ [DB Sending] fetchUsageStats");
    if (!supabase) return { totalRequests: 0, estimatedTokens: 0 };
    try {
        // Optimally we would use a count query, but for now fetching limited data to aggregate locally
        // or assuming standard select. If table is huge, this needs RPC.
        const { data, error } = await supabase.from('usage_logs').select('total_tokens');
        if (error) {
            logError('fetchUsageStats', error);
            return { totalRequests: 0, estimatedTokens: 0 };
        }
        if (!data) return { totalRequests: 0, estimatedTokens: 0 };
        const totalTokens = data.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);
        console.log("⬇️ [DB Success] fetchUsageStats");
        return { totalRequests: data.length, estimatedTokens: totalTokens };
    } catch (e) { return { totalRequests: 0, estimatedTokens: 0 }; }
};

export const fetchAllUsageLogs = async (limit = 100) => {
    console.log("⬆️ [DB Sending] fetchAllUsageLogs limit:", limit);
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('usage_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (error) throw error;
        console.log("⬇️ [DB Success] fetchAllUsageLogs count:", data?.length);
        return data;
    } catch (e) {
        logError('fetchAllUsageLogs', e);
        return [];
    }
};

// --- PAYOUTS & EARNINGS ---

export const requestPayout = async (astrologerId: string, amount: number): Promise<boolean> => {
    console.log("⬆️ [DB Sending] requestPayout:", astrologerId, amount);
    if (!supabase) return false;
    try {
        const { error } = await supabase.from('payouts').insert([{
            id: generateReferenceId('Payout'),
            astrologer_id: astrologerId,
            amount: amount,
            status: 'Processing',
            date: new Date().toISOString(),
            reference_id: `REQ-${Date.now()}`
        }]);
        
        if (error) {
            logError('requestPayout', error);
            return false;
        }
        console.log("⬇️ [DB Success] requestPayout");
        return true;
    } catch (e) {
        logError('requestPayout:Exception', e);
        return false;
    }
};

export const fetchPayoutHistory = async (astrologerId: string): Promise<PayoutRecord[]> => {
    console.log("⬆️ [DB Sending] fetchPayoutHistory:", astrologerId);
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('payouts').select('*').eq('astrologer_id', astrologerId).order('created_at', { ascending: false });
        if (error) {
            logError('fetchPayoutHistory', error);
            return [];
        }
        console.log("⬇️ [DB Success] fetchPayoutHistory count:", data?.length);
        return data.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            date: p.created_at || p.date,
            status: p.status,
            referenceId: p.reference_id
        }));
    } catch (e) {
        logError('fetchPayoutHistory:Exception', e);
        return [];
    }
};

export const fetchAdminPayoutRequests = async () => {
    console.log("⬆️ [DB Sending] fetchAdminPayoutRequests");
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('payouts')
            .select(`
                *,
                astrologers ( name )
            `)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        console.log("⬇️ [DB Success] fetchAdminPayoutRequests count:", data?.length);
        return data.map((p: any) => ({
            id: p.id,
            astrologerId: p.astrologer_id,
            astrologerName: p.astrologers?.name || 'Unknown',
            amount: p.amount,
            status: p.status,
            date: p.created_at || p.date,
            referenceId: p.reference_id
        }));
    } catch (e) {
        logError('fetchAdminPayoutRequests', e);
        return [];
    }
};

export const updatePayoutStatus = async (payoutId: string, status: 'Completed' | 'Rejected') => {
    console.log("⬆️ [DB Sending] updatePayoutStatus:", payoutId, status);
    if (!supabase) return false;
    try {
        const { error } = await supabase.from('payouts').update({ status }).eq('id', payoutId);
        if (error) throw error;
        console.log("⬇️ [DB Success] updatePayoutStatus");
        return true;
    } catch (e) {
        logError('updatePayoutStatus', e);
        return false;
    }
};

export const fetchAstrologerEarnings = async (astrologerId: string): Promise<Earnings> => {
    console.log("⬆️ [DB Sending] fetchAstrologerEarnings:", astrologerId);
    if (!supabase) return { chats: 0, products: 0, tips: 0, withdrawn: 0 };
    
    try {
        const { data: txData, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('related_entity_id', astrologerId);

        if (txError) {
            // Silence error if column is missing, likely old schema
            if (txError.code !== '42703') logError('fetchAstrologerEarnings:Transactions', txError);
        }

        const earnings: Earnings = { chats: 0, products: 0, tips: 0, withdrawn: 0 };

        if (txData) {
            txData.forEach((tx: any) => {
                if (tx.status !== 'Success') return;
                
                if (tx.type === 'Consultation') earnings.chats += (tx.amount * 0.9);
                else if (tx.type === 'Dakshina') earnings.tips += (tx.amount * 0.8);
                else if (tx.type === 'Product') earnings.products += (tx.amount * 0.1); 
            });
        }

        const { data: payoutData, error: payoutError } = await supabase
            .from('payouts')
            .select('amount')
            .eq('astrologer_id', astrologerId)
            .neq('status', 'Failed'); 

        if (payoutError) {
            logError('fetchAstrologerEarnings:Payouts', payoutError);
        }

        if (payoutData) {
            earnings.withdrawn = payoutData.reduce((sum, p) => sum + (p.amount || 0), 0);
        }

        console.log("⬇️ [DB Success] fetchAstrologerEarnings");
        return earnings;

    } catch (e) {
        logError('fetchAstrologerEarnings:Exception', e);
        return { chats: 0, products: 0, tips: 0, withdrawn: 0 };
    }
};

// --- AUTH ---
export const sendAuthOtp = async (contact: string): Promise<{ success: boolean; message?: string; isRateLimit?: boolean }> => {
    console.log("⬆️ [DB Sending] sendAuthOtp:", contact);
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
        console.log("⬇️ [DB Success] sendAuthOtp");
        return { success: true };
    } catch (e: any) { return { success: false, message: e.message }; }
};

export const verifyAuthOtp = async (contact: string, token: string): Promise<{ success: boolean; message?: string; userId?: string }> => {
    console.log("⬆️ [DB Sending] verifyAuthOtp:", contact);
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
            console.log("⬇️ [DB Success] verifyAuthOtp");
            return { success: true, userId: userId };
        } else {
            return { success: false, message: "Invalid code." };
        }
    } catch (e: any) { return { success: false, message: "Verification failed." }; }
};

export const resetUserPassword = async (contact: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    console.log("⬆️ [DB Sending] resetUserPassword:", contact);
    if (!supabase) return { success: false, message: "System not initialized" };
    try {
        const hashedPassword = await hashPassword(newPassword);
        const { error } = await supabase.from('profiles').update({ password: hashedPassword }).eq('contact', contact);
        if (error) throw error;
        console.log("⬇️ [DB Success] resetUserPassword");
        return { success: true };
    } catch (e) { return { success: false, message: "Failed to update password." }; }
};

// --- SEEDING ---
export const seedDatabase = async () => {
    console.log("⬆️ [DB Sending] seedDatabase");
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
        console.log("⬇️ [DB Success] seedDatabase");
    } catch (e) {}
};

export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
    if (!supabase) return null;
    return supabase.channel(`public:${table}`).on('postgres_changes', { event: '*', schema: 'public', table: table }, callback).subscribe();
};

// --- DATA FETCHING ---
export const fetchAstrologers = async (): Promise<Astrologer[]> => {
    console.log("⬆️ [DB Sending] fetchAstrologers");
    if (!supabase) return MOCK_ASTROLOGERS;
    try {
        const { data } = await supabase.from('astrologers').select('*').order('is_online', { ascending: false });
        if (!data) return MOCK_ASTROLOGERS;
        console.log("⬇️ [DB Success] fetchAstrologers count:", data.length);
        return data.map((a: any) => ({ id: a.id, name: a.name, specialty: a.specialty, rating: a.rating, reviews: a.reviews, pricePerMin: a.price_per_min, imageUrl: a.image_url, isOnline: a.is_online }));
    } catch (e) { return MOCK_ASTROLOGERS; }
};

export const saveAstrologer = async (astro: Partial<Astrologer>) => {
    console.log("⬆️ [DB Sending] saveAstrologer:", astro.name);
    if (!supabase) return;
    const payload = { name: astro.name, specialty: astro.specialty, rating: astro.rating, reviews: astro.reviews, price_per_min: astro.pricePerMin, image_url: astro.imageUrl, is_online: astro.isOnline };
    let error;
    if (astro.id && astro.id.length > 10) {
        ({ error } = await supabase.from('astrologers').update(payload).eq('id', astro.id));
    } else {
        ({ error } = await supabase.from('astrologers').insert([payload]));
    }
    if (error) logError('saveAstrologer', error);
    else console.log("⬇️ [DB Success] saveAstrologer");
};

export const deleteAstrologer = async (id: string) => { 
    console.log("⬆️ [DB Sending] deleteAstrologer:", id);
    if (supabase) {
        await supabase.from('astrologers').delete().eq('id', id); 
        console.log("⬇️ [DB Success] deleteAstrologer");
    }
};

export const fetchProducts = async (): Promise<Product[]> => {
  console.log("⬆️ [DB Sending] fetchProducts");
  if (!supabase) return MOCK_PRODUCTS;
  try {
      const { data } = await supabase.from('products').select('*');
      // Fix: Check if data is empty array and fallback to mock if so
      if (!data || data.length === 0) return MOCK_PRODUCTS;
      console.log("⬇️ [DB Success] fetchProducts count:", data.length);
      return data.map((p: any) => ({ id: p.id, name: p.name, category: p.category, price: p.price, description: p.description, benefits: p.benefits, imageUrl: p.image_url }));
  } catch (e) { return MOCK_PRODUCTS; }
};

export const createProduct = async (product: Product): Promise<Product | null> => {
  console.log("⬆️ [DB Sending] createProduct:", product.name);
  if (!supabase) return product;
  const payload = { name: product.name, category: product.category, price: product.price, description: product.description, benefits: product.benefits, image_url: product.imageUrl };
  let data, error;
  if (product.id && product.id.length > 10 && !product.id.startsWith('p')) { ({ data, error } = await supabase.from('products').update(payload).eq('id', product.id).select('*').single()); } 
  else { ({ data, error } = await supabase.from('products').insert([payload]).select('*').single()); }
  if (error) { logError('createProduct', error); return null; }
  console.log("⬇️ [DB Success] createProduct");
  return { ...product, id: data.id, name: data.name, imageUrl: data.image_url, category: data.category };
};

export const deleteProductFromDb = async (id: string) => { 
    console.log("⬆️ [DB Sending] deleteProductFromDb:", id);
    if(supabase) { 
        const {error} = await supabase.from('products').delete().eq('id', id); 
        if(!error) console.log("⬇️ [DB Success] deleteProductFromDb");
        return !error; 
    } 
    return true; 
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  console.log("⬆️ [DB Sending] fetchTransactions");
  if (!supabase) return [];
  try {
      const { data, error } = await supabase.from('transactions').select('*');
      
      if (error) {
          logError('fetchTransactions', error);
          return [];
      }
      if (!data || data.length === 0) return [];

      const mapped = data.map((t: any) => ({ 
          id: t.id, 
          userId: t.user_id, 
          userName: t.user_name || 'Anonymous', 
          amount: t.amount, 
          type: t.type, 
          status: t.status, 
          date: t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], 
          details: t.details,
          relatedEntityId: t.related_entity_id,
          _created_at: t.created_at,
          paymentId: t.details.includes('Ref: ') ? t.details.split('Ref: ')[1].replace(']', '') : undefined
      }));

      console.log("⬇️ [DB Success] fetchTransactions count:", mapped.length);
      return mapped.sort((a: any, b: any) => {
          return new Date(b._created_at || 0).getTime() - new Date(a._created_at || 0).getTime();
      });

  } catch (e) { 
      logError('fetchTransactions:Exception', e);
      return []; 
  }
};

export const saveTransaction = async (tx: Transaction) => {
  console.log("⬆️ [DB Sending] saveTransaction:", tx.id);
  if (!supabase) return;
  try { 
      // Append Payment ID to details if present, to ensure persistence even without dedicated column
      const detailsWithRef = tx.paymentId ? `${tx.details} [Ref: ${tx.paymentId}]` : tx.details;

      const payload: any = { 
          id: tx.id, 
          user_id: tx.userId, 
          user_name: tx.userName, 
          amount: tx.amount, 
          type: tx.type, 
          details: detailsWithRef, 
          status: tx.status, 
          related_entity_id: tx.relatedEntityId || null,
          created_at: new Date().toISOString() 
      };

      const { error } = await supabase.from('transactions').insert([payload]); 
      
      if (error) {
          // Fallback if 'related_entity_id' is missing in DB
          if (error.code === '42703') {
              console.warn("Missing 'related_entity_id' column. Saving transaction without it.");
              delete payload.related_entity_id;
              const { error: retryError } = await supabase.from('transactions').insert([payload]);
              if (retryError) logError('saveTransaction:Retry', retryError);
              else console.log("⬇️ [DB Success] saveTransaction (Retry)");
          } else {
              logError('saveTransaction', error);
          }
      } else {
          console.log("⬇️ [DB Success] saveTransaction");
      }
  } catch (e) { logError('saveTransaction:Exception', e); }
};

export const fetchProfiles = async (): Promise<any[]> => {
    console.log("⬆️ [DB Sending] fetchProfiles");
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) {
            logError('fetchProfiles', error);
            return [];
        }
        if (!data || data.length === 0) return [];

        const mappedUsers = data.map((u: any) => {
            let tier = 'free';
            const now = new Date();
            const expiry = u.subscription_expiry ? new Date(u.subscription_expiry) : null;
            
            if (u.is_premium) {
                tier = 'premium';
            } else if (expiry && expiry > now) {
                if (expiry.getFullYear() - now.getFullYear() >= 2) {
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
                subscriptionExpiry: expiry,
                connectedAstrologerId: u.connected_astrologer_id // Support this field if in DB
            };
        });

        console.log("⬇️ [DB Success] fetchProfiles count:", mappedUsers.length);
        return mappedUsers.sort((a: any, b: any) => {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    } catch (e) {
        logError('fetchProfiles:Exception', e);
        return [];
    }
};

export const updateProfile = async (id: string, updates: any) => { 
    console.log("⬆️ [DB Sending] updateProfile:", id);
    if(!supabase) return;
    const dbUpdates: any = {};
    if (updates.isPremium !== undefined) dbUpdates.is_premium = updates.isPremium;
    if (updates.dailyQuestionsLeft !== undefined) dbUpdates.daily_questions_left = updates.dailyQuestionsLeft;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.subscriptionExpiry !== undefined) dbUpdates.subscription_expiry = updates.subscriptionExpiry;
    if (updates.subscription_expiry !== undefined) dbUpdates.subscription_expiry = updates.subscriptionExpiry;
    if (updates.connectedAstrologerId !== undefined) dbUpdates.connected_astrologer_id = updates.connectedAstrologerId;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id); 
    if (error) {
        // Handle missing column logic for update as well
        if (error.code === '42703') {
             console.warn("Missing column in profiles update. Retrying safely.");
             if (dbUpdates.connected_astrologer_id !== undefined) delete dbUpdates.connected_astrologer_id;
             await supabase.from('profiles').update(dbUpdates).eq('id', id); 
             console.log("⬇️ [DB Success] updateProfile (Retry)");
        } else {
            logError('updateProfile', error);
        }
    } else {
        console.log("⬇️ [DB Success] updateProfile");
    }
};

export const fetchUserProfile = async (contact: string | string[]): Promise<{ profile: any | null, chatHistory: Message[] }> => {
  console.log("⬆️ [DB Sending] fetchUserProfile:", contact);
  if (!supabase) return { profile: null, chatHistory: [] };
  try {
      let query = supabase.from('profiles').select('*');
      if (Array.isArray(contact)) query = query.in('contact', contact); else query = query.eq('contact', contact);
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) {
          if (error.code !== 'PGRST116') logError('fetchUserProfile', error);
          return { profile: null, chatHistory: [] };
      }
      if (!data) return { profile: null, chatHistory: [] };

      let messages: Message[] = [];
      if (data.chat_history) {
          const decrypted = decryptAndDecompress(data.chat_history);
          if (decrypted) messages = decrypted.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
      
      let tier = 'free';
      const now = new Date();
      const expiry = data.subscription_expiry ? new Date(data.subscription_expiry) : null;
      
      if (data.is_premium) {
          tier = 'premium';
      } else if (expiry && expiry > now) {
          if (expiry.getFullYear() - now.getFullYear() >= 2) {
              tier = 'member21';
          }
      }

      const mappedProfile = { 
          id: data.id, 
          contact: data.contact, 
          name: data.name, 
          gender: data.gender, 
          birthDate: data.birth_date, 
          birthTime: data.birth_time, 
          birthPlace: data.birth_place, 
          isPremium: data.is_premium, 
          tier: tier, 
          dailyQuestionsLeft: data.daily_questions_left, 
          subscriptionExpiry: expiry,
          password: data.password,
          connectedAstrologerId: data.connected_astrologer_id
      };

      console.log("⬇️ [DB Success] fetchUserProfile found:", mappedProfile.contact);
      return {
        profile: mappedProfile,
        chatHistory: messages
      };
  } catch (e) { 
      logError('fetchUserProfile:Exception', e);
      return { profile: null, chatHistory: [] }; 
  }
};

export const generateUniqueUsername = async (fullName: string): Promise<string> => {
    return fullName.trim();
};

export const saveUserProfile = async (user: UserState, password?: string, messages?: Message[]) => {
  console.log("⬆️ [DB Sending] saveUserProfile:", user.contact);
  if (!supabase || !user.contact) return;
  try {
      let expiryVal = null;
      if (user.subscriptionExpiry) {
          if (typeof user.subscriptionExpiry === 'string') {
              expiryVal = user.subscriptionExpiry;
          } else if (user.subscriptionExpiry instanceof Date) {
              expiryVal = user.subscriptionExpiry.toISOString();
          }
      }

      if (user.tier === 'member21' && !expiryVal) {
          const d = new Date();
          d.setFullYear(d.getFullYear() + 3);
          expiryVal = d.toISOString();
      }

      const payload: any = {
        contact: user.contact,
        name: user.name || '',
        gender: user.gender || null, 
        birth_date: user.birthDate || null, 
        birth_time: user.birthTime || null, 
        birth_place: user.birthPlace || null,
        is_premium: !!user.isPremium,
        daily_questions_left: typeof user.dailyQuestionsLeft === 'number' ? user.dailyQuestionsLeft : 0,
        subscription_expiry: expiryVal,
        connected_astrologer_id: user.connectedAstrologerId || null
      };
      
      if (user.tier === 'member21') {
          payload.is_premium = false;
      }

      if (password) payload.password = await hashPassword(password);
      if (messages && messages.length > 0) payload.chat_history = compressAndEncrypt(messages);

      const performUpsert = async (data: any, conflict: string) => {
          if (!supabase) return;
          const { error } = await supabase.from('profiles').upsert(data, { onConflict: conflict });
          if (error) {
              // Postgres error 42703: column does not exist
              if (error.code === '42703') {
                  console.warn("[DB-WARNING] 'connected_astrologer_id' column missing. Saving without it.");
                  const safeData = { ...data };
                  delete safeData.connected_astrologer_id;
                  const { error: retryError } = await supabase.from('profiles').upsert(safeData, { onConflict: conflict });
                  if (retryError) logError('saveUserProfile:Retry', retryError);
                  else console.log("⬇️ [DB Success] saveUserProfile (Retry)");
              } else {
                  logError('saveUserProfile', error);
              }
          } else {
              console.log("⬇️ [DB Success] saveUserProfile");
          }
      };

      if (user.id && user.id.length > 5) {
         const upsertPayload = { ...payload, id: user.id };
         await performUpsert(upsertPayload, 'id');
      } else {
         await performUpsert(payload, 'contact');
      }
  } catch (e) { logError('saveUserProfile:Exception', e); }
};
