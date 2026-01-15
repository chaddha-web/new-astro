
import React, { useState, useEffect } from 'react';
import { Product, Transaction, SubscriptionTier, Astrologer, CommunicationLog, Message, Sender } from '../../types';
import { DEFAULT_SUBSCRIPTION_TIERS, AVAILABLE_FEATURES } from '../../constants';
import { saveAstrologer, deleteAstrologer, updateProfile, createProduct, deleteProductFromDb, fetchUsageStats, fetchAdminPayoutRequests, updatePayoutStatus, fetchAllUsageLogs, flushAllInsights } from '../../services/dbService';
import { decryptAndDecompress } from '../../services/securityService';

interface AdminDashboardProps {
  products: Product[];
  transactions: Transaction[];
  astrologers: Astrologer[];
  users: any[];
  commLogs: CommunicationLog[];
  onUpdateProducts: (products: Product[]) => void;
  onLogout: () => void;
  onImpersonate: (user: any) => void;
  onRefresh?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    products, 
    transactions, 
    astrologers, 
    users, 
    commLogs, 
    onUpdateProducts, 
    onLogout, 
    onImpersonate,
    onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'shop' | 'users' | 'gurus' | 'finance' | 'communications' | 'subscriptions' | 'usage' | 'settings'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('all');
  const [tiers, setTiers] = useState<SubscriptionTier[]>(DEFAULT_SUBSCRIPTION_TIERS);
  
  // Real-time API Usage Stats & Logs from DB
  const [usageStats, setUsageStats] = useState({ totalRequests: 0, estimatedTokens: 0 });
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  
  // Payout Management
  const [payouts, setPayouts] = useState<any[]>([]);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [editingAstro, setEditingAstro] = useState<Partial<Astrologer> | null>(null);
  const [isAstroModalOpen, setIsAstroModalOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);

  const [viewingChatUser, setViewingChatUser] = useState<any | null>(null);
  const [userChatHistory, setUserChatHistory] = useState<Message[]>([]);
  const [isChatReviewOpen, setIsChatReviewOpen] = useState(false);

  useEffect(() => {
      // Fetch overview stats and detailed lists when tab changes
      if (activeTab === 'overview' || activeTab === 'usage') {
          fetchUsageStats().then(setUsageStats);
          fetchAllUsageLogs().then(setUsageLogs);
      }
      if (activeTab === 'finance') {
          fetchAdminPayoutRequests().then(setPayouts);
      }
  }, [activeTab]);

  const handleEditProduct = (product: Product) => { setEditingProduct(product); setIsProductModalOpen(true); };
  const handleCreateProduct = () => { setEditingProduct({ id: `p${Date.now()}`, name: '', category: 'pooja', price: 0, description: '', benefits: '', imageUrl: 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?auto=format&fit=crop&w=500&q=80' }); setIsProductModalOpen(true); };
  const saveProduct = async () => { if (!editingProduct) return; const saved = await createProduct(editingProduct); if (saved) { const existingIdx = products.findIndex(p => p.id === editingProduct.id || p.id === saved.id); let updatedProducts = [...products]; if (existingIdx >= 0) updatedProducts[existingIdx] = saved; else updatedProducts.push(saved); onUpdateProducts(updatedProducts); setIsProductModalOpen(false); setEditingProduct(null); } };
  const deleteProduct = async (id: string) => { if (window.confirm("Delete?")) { const success = await deleteProductFromDb(id); if (success) onUpdateProducts(products.filter(p => p.id !== id)); } };

  const handleEditAstro = (astro: Astrologer) => { setEditingAstro(astro); setIsAstroModalOpen(true); };
  const handleCreateAstro = () => { setEditingAstro({ name: '', specialty: 'Vedic', rating: 5.0, reviews: 0, pricePerMin: 20, imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', isOnline: false }); setIsAstroModalOpen(true); };
  const saveAstro = async () => { if (!editingAstro) return; await saveAstrologer(editingAstro); setIsAstroModalOpen(false); setEditingAstro(null); };
  const removeAstro = async (id: string) => { if(window.confirm("Delete?")) await deleteAstrologer(id); };

  const handleEditUser = (user: any) => { setEditingUser(user); setIsUserModalOpen(true); };
  
  // Enhanced User Save with Tier Logic
  const saveUserUpdates = async () => { 
      if (!editingUser) return; 
      
      const updates: any = {
          name: editingUser.name,
          dailyQuestionsLeft: editingUser.dailyQuestionsLeft,
          isPremium: editingUser.isPremium
      };

      // Critical: Set Expiry based on Tier to ensure persistence even without 'tier' column
      if (editingUser.tier === 'member21') {
          updates.isPremium = false; // Member 21 is not "Daily Refill Premium"
          if (!editingUser.subscriptionExpiry) {
              const d = new Date();
              d.setFullYear(d.getFullYear() + 3);
              updates.subscriptionExpiry = d.toISOString();
          } else {
              updates.subscriptionExpiry = editingUser.subscriptionExpiry;
          }
      } else if (editingUser.tier === 'premium') {
          updates.isPremium = true;
          if (!editingUser.subscriptionExpiry) {
              const d = new Date();
              d.setMonth(d.getMonth() + 1);
              updates.subscriptionExpiry = d.toISOString();
          } else {
              updates.subscriptionExpiry = editingUser.subscriptionExpiry;
          }
      } else {
          // Free
          updates.isPremium = false;
          updates.subscriptionExpiry = null;
      }

      await updateProfile(editingUser.id, updates); 
      setIsUserModalOpen(false); 
      if (onRefresh) onRefresh(); // Trigger refresh to show new status
  };
  
  const handleViewUserChat = (user: any) => { 
      setViewingChatUser(user); 
      // Handle both raw snake_case (legacy) or camelCase (new)
      const rawHistory = user.chatHistory || user.chat_history;
      
      if (rawHistory) { 
          const decrypted = decryptAndDecompress(rawHistory); 
          setUserChatHistory(decrypted || []); 
      } else { 
          setUserChatHistory([]); 
      } 
      setIsChatReviewOpen(true); 
  };

  const handleEditTier = (tier: SubscriptionTier) => { setEditingTier({ ...tier }); setIsTierModalOpen(true); };
  const toggleFeature = (featureId: string) => { if (!editingTier) return; const hasFeature = editingTier.featureFlags.includes(featureId); let newFlags = hasFeature ? editingTier.featureFlags.filter(f => f !== featureId) : [...editingTier.featureFlags, featureId]; setEditingTier({ ...editingTier, featureFlags: newFlags }); };
  const saveTierUpdates = () => { if (!editingTier) return; setTiers(prev => prev.map(t => t.id === editingTier.id ? editingTier : t)); setIsTierModalOpen(false); };

  const handleUserTierChange = (newTier: string) => {
      let newData = { ...editingUser, tier: newTier };
      
      if (newTier === 'member21') {
          newData.isPremium = false;
          newData.dailyQuestionsLeft = 0; 
          const d = new Date();
          d.setFullYear(d.getFullYear() + 3);
          newData.subscriptionExpiry = d.toISOString();
      } else if (newTier === 'premium') {
          newData.isPremium = true;
          newData.dailyQuestionsLeft = 10;
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          newData.subscriptionExpiry = d.toISOString();
      } else {
          newData.isPremium = false;
          newData.dailyQuestionsLeft = 1;
          newData.subscriptionExpiry = null;
      }
      setEditingUser(newData);
  };

  const handlePayoutAction = async (id: string, action: 'Completed' | 'Rejected') => {
      if(!window.confirm(`Mark payout as ${action}?`)) return;
      const success = await updatePayoutStatus(id, action);
      if (success) {
          fetchAdminPayoutRequests().then(setPayouts);
      }
  };

  const handleRenewInsights = async () => {
      if (!window.confirm("This will delete ALL cached horoscopes and readings for all users. Users will get fresh AI insights on their next visit. Continue?")) return;
      const success = await flushAllInsights();
      if (success) {
          alert("Success! All old insights have been cleared. Users will receive accurate generated readings on their next dashboard load.");
      } else {
          alert("Failed to flush cache. Check database logs.");
      }
  };

  const renderOverview = () => {
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const member21Count = users.filter(u => u.tier === 'member21').length;
      const premiumCount = users.filter(u => u.isPremium && u.tier !== 'member21').length;

      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-mystic-800 to-mystic-900 p-6 rounded-2xl border border-gold-500/30 shadow-lg relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">💰</div>
                      <h3 className="text-gold-400 uppercase tracking-widest text-xs font-bold mb-2">Total Revenue</h3>
                      <p className="text-3xl font-serif text-white font-bold">₹{totalRevenue.toLocaleString()}</p>
                      <div className="w-full bg-mystic-950 h-1 rounded-full mt-4 overflow-hidden"><div className="bg-gold-500 h-full" style={{ width: '100%' }}></div></div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-mystic-800 to-mystic-900 p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">👥</div>
                      <h3 className="text-mystic-400 uppercase tracking-widest text-xs font-bold mb-2">Total Seekers</h3>
                      <p className="text-3xl font-serif text-white font-bold">{users.length}</p>
                  </div>

                   <div className="bg-gradient-to-br from-mystic-800 to-mystic-900 p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🧘</div>
                      <h3 className="text-mystic-400 uppercase tracking-widest text-xs font-bold mb-2">Active Gurus</h3>
                      <p className="text-3xl font-serif text-white font-bold">{astrologers.filter(a => a.isOnline).length} / {astrologers.length}</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-900 to-mystic-900 p-6 rounded-2xl border border-indigo-500/30 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">👑</div>
                      <h3 className="text-indigo-300 uppercase tracking-widest text-xs font-bold mb-2">Members</h3>
                      <div className="flex gap-4">
                          <div>
                              <p className="text-2xl font-serif text-white font-bold">{member21Count}</p>
                              <p className="text-[10px] text-indigo-400 uppercase">Member 21</p>
                          </div>
                          <div className="h-8 w-px bg-white/10"></div>
                          <div>
                              <p className="text-2xl font-serif text-white font-bold">{premiumCount}</p>
                              <p className="text-[10px] text-gold-400 uppercase">Premium</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* API Monitor Section */}
              <div className="bg-mystic-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl">📡</div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="space-y-2">
                          <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                              <span>🔮</span> Cosmic Engine Monitor
                          </h3>
                          <p className="text-xs text-mystic-400">Real-time usage tracking from Supabase (usage_logs)</p>
                      </div>
                      <div className="flex gap-4">
                         <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center min-w-[120px]">
                            <p className="text-[10px] text-mystic-400 uppercase mb-1">Total Requests</p>
                            <p className="text-2xl font-bold text-white font-mono">{usageStats.totalRequests}</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center min-w-[120px]">
                            <p className="text-[10px] text-mystic-400 uppercase mb-1">Est. Tokens</p>
                            <p className="text-2xl font-bold text-indigo-400 font-mono">{usageStats.estimatedTokens.toLocaleString()}</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center min-w-[120px]">
                            <p className="text-[10px] text-mystic-400 uppercase mb-1">Est. Cost</p>
                            <p className="text-2xl font-bold text-green-400 font-mono">Free Tier</p>
                         </div>
                      </div>
                  </div>
                  <div className="mt-8">
                      <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] text-mystic-500 font-bold uppercase tracking-widest">Global Traffic Intensity</span>
                          <span className="text-xs font-bold text-indigo-300">Live</span>
                      </div>
                      <div className="w-full bg-mystic-800 h-2 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="bg-gradient-to-r from-green-500 via-indigo-500 to-red-500 h-full transition-all duration-1000" 
                            style={{ width: `${Math.min((usageStats.totalRequests / 1000) * 100, 100)}%` }}
                          ></div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-mystic-950 text-white overflow-hidden">
        <header className="bg-mystic-900/90 backdrop-blur-md border-b border-gold-500/20 p-4 flex justify-between items-center shrink-0 z-20">
            <h1 className="text-xl md:text-2xl font-serif text-gold-400 font-bold flex items-center gap-3"><span className="text-2xl">🛡️</span> Admin Panel</h1>
            <div className="flex items-center gap-3">
                {onRefresh && (
                    <button onClick={onRefresh} className="bg-white/5 hover:bg-white/10 text-mystic-300 border border-white/10 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                        <span>↻</span> Refresh
                    </button>
                )}
                <button onClick={onLogout} className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all">Logout</button>
            </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
            <aside className="w-20 md:w-64 bg-mystic-900/50 border-r border-white/5 p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
                {[
                    { id: 'overview', icon: '📊', label: 'Overview' },
                    { id: 'users', icon: '👥', label: 'Seekers' },
                    { id: 'gurus', icon: '🧘', label: 'Gurus' },
                    { id: 'shop', icon: '🏷️', label: 'Shop Manager' },
                    { id: 'communications', icon: '📡', label: 'Logs' },
                    { id: 'usage', icon: '🔮', label: 'API Usage' },
                    { id: 'finance', icon: '💰', label: 'Financials' },
                    { id: 'subscriptions', icon: '✨', label: 'Subscriptions' },
                    { id: 'settings', icon: '⚙️', label: 'Settings' }
                ].map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`text-left p-3 rounded-xl flex items-center justify-center md:justify-start gap-3 transition-all ${activeTab === item.id ? 'bg-gold-500 text-mystic-900 font-bold shadow-lg shadow-gold-500/20' : 'text-mystic-400 hover:bg-white/5 hover:text-white'}`}>
                        <span className="text-xl">{item.icon}</span><span className="hidden md:inline">{item.label}</span>
                    </button>
                ))}
            </aside>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-black/20">
                {activeTab === 'overview' && renderOverview()}
                
                {/* ... (Existing tabs: users, gurus, shop) ... */}
                {activeTab === 'users' && (
                    /* ...existing user code... */
                    <div className="animate-in fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h3 className="text-xl font-bold text-white">Registered Seekers</h3>
                            <div className="flex gap-2 w-full md:w-auto">
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-mystic-900 border border-mystic-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                                    <option value="all">All Users</option>
                                    <option value="premium">Premium Only</option>
                                    <option value="member21">Member 21</option>
                                    <option value="free">Free Only</option>
                                </select>
                                <input type="text" placeholder="Search by Name/Phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-mystic-900 border border-mystic-700 rounded-lg px-4 py-2 text-sm text-white w-full md:w-64 outline-none" />
                            </div>
                        </div>
                        
                        <div className="bg-mystic-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-mystic-800 text-mystic-400 uppercase text-xs font-bold border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Plan Status</th>
                                            <th className="px-6 py-4">Expiry</th>
                                            <th className="px-6 py-4">Daily Limit</th>
                                            <th className="px-6 py-4">Joined</th>
                                            <th className="px-6 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {users.filter(u => {
                                            const matchName = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.contact?.includes(searchTerm);
                                            let matchStatus = true;
                                            if (filterStatus === 'premium') matchStatus = u.isPremium;
                                            else if (filterStatus === 'member21') matchStatus = u.tier === 'member21';
                                            else if (filterStatus === 'free') matchStatus = !u.isPremium && u.tier !== 'member21';
                                            return matchName && matchStatus;
                                        }).map(user => (
                                            <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-900 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                                                            {user.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white group-hover:text-gold-400 transition-colors">{user.name}</p>
                                                            <p className="text-xs text-mystic-400 font-mono">{user.contact}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.tier === 'member21' ? (
                                                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-[10px] font-bold border border-indigo-500/30 uppercase tracking-wide">MEMBER 21</span>
                                                    ) : user.isPremium ? (
                                                        <span className="bg-gold-500/20 text-gold-400 px-2 py-1 rounded text-[10px] font-bold border border-gold-500/30 uppercase tracking-wide">PREMIUM</span> 
                                                    ) : (
                                                        <span className="bg-mystic-800 text-mystic-400 px-2 py-1 rounded text-[10px] uppercase tracking-wide">FREE</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono text-mystic-300">
                                                    {user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-mystic-300">
                                                    <span className="font-mono text-white">{user.dailyQuestionsLeft}</span> <span className="text-xs">Qs/Day</span>
                                                </td>
                                                <td className="px-6 py-4 text-mystic-500 text-xs">
                                                    {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleEditUser(user)} className="bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg text-xs transition-colors border border-white/5" title="Edit Profile">✏️</button>
                                                        <button onClick={() => handleViewUserChat(user)} className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 p-2 rounded-lg text-xs transition-colors border border-violet-500/20" title="View Chat History">💬</button>
                                                        <button onClick={() => onImpersonate(user)} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 p-2 rounded-lg text-xs transition-colors border border-orange-500/20" title="Login As User">🕵️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'gurus' && (
                    <div className="animate-in fade-in"> 
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Astrologers Management</h3>
                            <button onClick={handleCreateAstro} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-green-900/20 flex items-center gap-2">
                                <span>+</span> Add Guru
                            </button>
                        </div> 
                        <div className="bg-mystic-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                             <div className="overflow-x-auto">
                                 <table className="w-full text-sm text-left">
                                    <thead className="bg-mystic-800 text-mystic-400 uppercase text-xs font-bold border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4">Profile</th>
                                            <th className="px-6 py-4">Specialty</th>
                                            <th className="px-6 py-4">Metrics</th>
                                            <th className="px-6 py-4">Rate</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {astrologers.map(a => (
                                            <tr key={a.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={a.imageUrl} className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-gold-400 transition-colors" />
                                                        <span className="font-bold text-white group-hover:text-gold-400 transition-colors">{a.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-mystic-300">{a.specialty}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1 text-gold-400 font-bold">
                                                        <span>★</span> {a.rating} <span className="text-mystic-500 text-xs font-normal">({a.reviews})</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-white font-mono">₹{a.pricePerMin}/min</td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border font-bold uppercase tracking-wider ${a.isOnline ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${a.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                                        {a.isOnline ? 'Online' : 'Offline'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleEditAstro(a)} className="text-blue-400 hover:text-blue-300 font-bold text-xs bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded mr-2 transition-colors">Edit</button>
                                                    <button onClick={() => removeAstro(a.id)} className="text-red-400 hover:text-red-300 font-bold text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition-colors">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                 </table>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'shop' && (
                    <div className="animate-in fade-in"> 
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Store Inventory</h3>
                            <button onClick={handleCreateProduct} className="bg-gold-500 hover:bg-gold-400 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-gold-500/20 flex items-center gap-2">
                                <span>+</span> Add Item
                            </button>
                        </div> 
                        <div className="bg-mystic-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                             <div className="overflow-x-auto">
                                 <table className="w-full text-sm text-left">
                                    <thead className="bg-mystic-800 text-mystic-400 uppercase text-xs font-bold border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4">Item</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Price</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {products.map(p => (
                                            <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                                            <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        </div>
                                                        <p className="font-bold text-white group-hover:text-gold-400 transition-colors">{p.name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-mystic-800 border border-mystic-700 px-2 py-1 rounded text-[10px] uppercase tracking-wider text-mystic-300">{p.category}</span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-gold-400 font-bold">₹{p.price}</td>
                                                <td className="px-6 py-4 text-xs text-mystic-500 max-w-xs truncate">
                                                    {p.description}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleEditProduct(p)} className="text-blue-400 hover:text-blue-300 font-bold text-xs bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded mr-2 transition-colors">Edit</button>
                                                    <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300 font-bold text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition-colors">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                 </table>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'subscriptions' && (
                    <div className="animate-in fade-in"> 
                        <h3 className="text-xl font-bold mb-6 text-white">Subscription Config</h3> 
                        <div className="bg-mystic-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-mystic-800 text-mystic-400 uppercase text-xs font-bold border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Tier Name</th>
                                        <th className="px-6 py-4">Duration</th>
                                        <th className="px-6 py-4">Price</th>
                                        <th className="px-6 py-4">Benefits</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {tiers.map(t => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">{t.name}</td>
                                            <td className="px-6 py-4 text-mystic-300">{t.duration}</td>
                                            <td className="px-6 py-4 text-gold-400 font-bold font-mono">₹{t.price}</td>
                                            <td className="px-6 py-4 text-xs text-mystic-400">{t.benefits.length} features active</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleEditTier(t)} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-xs border border-white/10 transition-colors">Configure</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'communications' && (
                    <div className="animate-in fade-in">
                        <h3 className="text-xl font-bold mb-6 text-white">System Logs</h3>
                        <div className="bg-mystic-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                             <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-mystic-800 text-mystic-400 uppercase font-bold border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-3">Timestamp</th>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3">Recipient</th>
                                            <th className="px-6 py-3">Direction</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {commLogs.map(l => (
                                            <tr key={l.id} className="hover:bg-white/5">
                                                <td className="px-6 py-3 text-mystic-500 font-mono">{new Date(l.timestamp).toLocaleString()}</td>
                                                <td className="px-6 py-3 text-white">{l.type}</td>
                                                <td className="px-6 py-3 text-mystic-300">{l.recipient}</td>
                                                <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-[10px] uppercase ${l.direction === 'outbound' ? 'bg-blue-500/20 text-blue-400' : l.direction === 'inbound' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{l.direction}</span></td>
                                                <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-[10px] uppercase ${l.status === 'sent' || l.status === 'delivered' || l.status === 'completed' || l.status === 'logged' ? 'text-green-400' : 'text-red-400'}`}>{l.status}</span></td>
                                                <td className="px-6 py-3 text-mystic-400 max-w-xs truncate">{l.details}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'usage' && (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">AI Token Usage Log</h3>
                            <div className="text-xs text-mystic-400">Total Tracked: {usageStats.totalRequests}</div>
                        </div>
                        <div className="bg-mystic-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                             <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-mystic-800 text-mystic-400 uppercase font-bold border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-3">Timestamp</th>
                                            <th className="px-6 py-3">User ID</th>
                                            <th className="px-6 py-3">Feature</th>
                                            <th className="px-6 py-3 text-right">Input Tokens</th>
                                            <th className="px-6 py-3 text-right">Output Tokens</th>
                                            <th className="px-6 py-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {usageLogs.map((l, i) => (
                                            <tr key={l.id || i} className="hover:bg-white/5">
                                                <td className="px-6 py-3 text-mystic-500 font-mono">{new Date(l.timestamp).toLocaleString()}</td>
                                                <td className="px-6 py-3 text-white max-w-[100px] truncate" title={l.user_id}>{l.user_id}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${l.feature === 'chat' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{l.feature}</span>
                                                </td>
                                                <td className="px-6 py-3 text-right text-mystic-400">{l.input_tokens}</td>
                                                <td className="px-6 py-3 text-right text-mystic-400">{l.output_tokens}</td>
                                                <td className="px-6 py-3 text-right font-bold text-indigo-400">{l.total_tokens}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                             {usageLogs.length === 0 && (
                                <div className="p-8 text-center text-mystic-500">
                                    <p>No usage logs found. Ensure DB 'usage_logs' table exists.</p>
                                </div>
                             )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'finance' && (
                    <div className="animate-in fade-in space-y-8">
                        {/* Payout Requests Section */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                                <span>🏦</span> Payout Requests
                            </h3>
                            <div className="bg-mystic-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-mystic-800 text-mystic-400 uppercase text-xs font-bold border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Guru</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {payouts.map(p => (
                                            <tr key={p.id} className="hover:bg-white/5">
                                                <td className="px-6 py-4 text-xs font-mono text-mystic-500">{new Date(p.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 font-bold text-white">{p.astrologerName}</td>
                                                <td className="px-6 py-4 font-mono text-gold-400">₹{p.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${
                                                        p.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                                                        p.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-yellow-500/20 text-yellow-400 animate-pulse'
                                                    }`}>{p.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {p.status === 'Processing' && (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handlePayoutAction(p.id, 'Completed')} className="bg-green-600 hover:bg-green-500 text-white text-[10px] px-3 py-1.5 rounded font-bold transition-colors">Pay</button>
                                                            <button onClick={() => handlePayoutAction(p.id, 'Rejected')} className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-3 py-1.5 rounded font-bold transition-colors">Reject</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {payouts.length === 0 && <div className="p-6 text-center text-mystic-500 text-sm">No pending payout requests.</div>}
                            </div>
                        </div>

                        {/* Updated Transaction Ledger */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-white">All Transactions</h3>
                            <div className="bg-mystic-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-96 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-mystic-800 text-mystic-400 uppercase text-xs font-bold border-b border-white/5 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Payment ID</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {transactions.map(t => (
                                            <tr key={t.id} className="hover:bg-white/5">
                                                <td className="px-6 py-4 text-mystic-500 font-mono text-xs">{t.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${
                                                        t.type === 'Product' ? 'bg-blue-500/10 text-blue-400' :
                                                        t.type === 'Subscription' ? 'bg-purple-500/10 text-purple-400' :
                                                        'bg-green-500/10 text-green-400'
                                                    }`}>{t.type}</span>
                                                </td>
                                                <td className="px-6 py-4 text-white">{t.userName}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-mystic-400 break-all max-w-[150px]">
                                                    {t.paymentId || (t.details.match(/Ref: ([^\]]+)/)?.[1] || '-')}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gold-400 font-bold">₹{t.amount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="animate-in fade-in space-y-8">
                        <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span>⚙️</span> System Settings
                        </h3>
                        
                        <div className="bg-mystic-900/50 border border-white/10 rounded-xl p-6 shadow-xl">
                            <h4 className="text-lg font-bold text-gold-400 mb-2">Renew Insights</h4>
                            <p className="text-mystic-300 text-sm mb-4">
                                Flush all cached horoscopes and daily readings. This forces the system to re-generate fresh, accurate insights for all users upon their next visit. 
                                Use this if users report outdated or incorrect predictions.
                            </p>
                            <button 
                                onClick={handleRenewInsights}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-colors flex items-center gap-2 text-sm"
                            >
                                <span>🗑️</span> Clear All Cached Insights
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>

        {isTierModalOpen && editingTier && ( <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-mystic-800 p-6 rounded-2xl w-full max-w-md"><h3 className="text-xl font-bold mb-4 text-white">Edit Tier: {editingTier.name}</h3><div className="space-y-2 mb-4">{AVAILABLE_FEATURES.map(f=>(<div key={f.id} onClick={()=>toggleFeature(f.id)} className={`p-2 border rounded cursor-pointer transition-colors ${editingTier.featureFlags.includes(f.id)?'bg-gold-500 text-black border-gold-500':'border-white/20 text-mystic-300 hover:bg-white/5'}`}>{f.label}</div>))}</div><button onClick={saveTierUpdates} className="bg-white/10 hover:bg-white/20 text-white w-full py-2 rounded transition-colors">Save</button></div></div> )}
        
        {/* EDIT USER MODAL - Fully Updated */}
        {isUserModalOpen && editingUser && ( 
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                <div className="bg-mystic-800 p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl">
                    <h3 className="text-white font-bold mb-4 text-lg">Manage User</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase text-mystic-400 font-bold block mb-1">Display Name</label>
                            <input value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name:e.target.value})} className="w-full bg-mystic-900 border border-white/10 p-2 rounded text-white text-sm"/>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase text-mystic-400 font-bold block mb-1">Subscription Plan</label>
                            <select 
                                value={editingUser.tier || 'free'} 
                                onChange={e => handleUserTierChange(e.target.value)}
                                className="w-full bg-mystic-900 border border-white/10 p-2 rounded text-white text-sm"
                            >
                                <option value="free">Free</option>
                                <option value="premium">Premium Plan</option>
                                <option value="member21">Member 21 (3-Year)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase text-mystic-400 font-bold block mb-1">Daily Qs Limit</label>
                                <input type="number" value={editingUser.dailyQuestionsLeft} onChange={e=>setEditingUser({...editingUser, dailyQuestionsLeft: parseInt(e.target.value)})} className="w-full bg-mystic-900 border border-white/10 p-2 rounded text-white text-sm"/>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-mystic-400 font-bold block mb-1">Expiry Date</label>
                                <input 
                                    type="date" 
                                    value={editingUser.subscriptionExpiry ? new Date(editingUser.subscriptionExpiry).toISOString().split('T')[0] : ''} 
                                    onChange={e=>setEditingUser({...editingUser, subscriptionExpiry: new Date(e.target.value).toISOString()})} 
                                    className="w-full bg-mystic-900 border border-white/10 p-2 rounded text-white text-sm [color-scheme:dark]"
                                    disabled={!editingUser.subscriptionExpiry}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-white/10">
                        <button onClick={()=>setIsUserModalOpen(false)} className="text-xs text-mystic-400 hover:text-white px-4 py-2">Cancel</button>
                        <button onClick={saveUserUpdates} className="bg-gold-500 hover:bg-gold-400 px-4 py-2 rounded text-black font-bold text-sm transition-colors shadow-lg shadow-gold-500/20">Save Changes</button>
                    </div>
                </div>
            </div> 
        )}
        
        {isProductModalOpen && editingProduct && ( <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-mystic-800 p-6 rounded-2xl w-full max-w-md"><h3 className="text-white font-bold mb-4">Edit Product</h3><input value={editingProduct.name} onChange={e=>setEditingProduct({...editingProduct, name:e.target.value})} className="w-full bg-mystic-900 border border-white/10 p-2 mb-2 rounded text-white" placeholder="Name"/><input type="number" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price:parseInt(e.target.value)})} className="w-full bg-mystic-900 border border-white/10 p-2 mb-4 rounded text-white" placeholder="Price"/><button onClick={saveProduct} className="w-full bg-gold-500 hover:bg-gold-400 p-2 rounded text-black font-bold transition-colors">Save</button></div></div> )}
        {isAstroModalOpen && editingAstro && ( <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-mystic-800 p-6 rounded-2xl w-full max-w-md"><h3 className="text-white font-bold mb-4">Edit Guru</h3><input value={editingAstro.name} onChange={e=>setEditingAstro({...editingAstro, name:e.target.value})} className="w-full bg-mystic-900 border border-white/10 p-2 mb-2 rounded text-white" placeholder="Name"/><button onClick={saveAstro} className="w-full bg-gold-500 hover:bg-gold-400 p-2 rounded text-black font-bold transition-colors">Save</button></div></div> )}
        {isChatReviewOpen && viewingChatUser && ( <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"><div className="bg-mystic-900 w-full max-w-lg h-[80vh] flex flex-col rounded-2xl overflow-hidden border border-white/10"><div className="p-4 bg-mystic-800 flex justify-between items-center"><h3 className="font-bold text-white">Chat: {viewingChatUser.name}</h3><button onClick={()=>setIsChatReviewOpen(false)} className="text-white hover:text-gold-400">✕</button></div><div className="flex-1 overflow-y-auto p-4 bg-black/20">{userChatHistory.length === 0 ? <p className="text-mystic-500 text-center italic mt-10">No chat history found.</p> : userChatHistory.map((m,i)=>(<div key={i} className="mb-3 text-sm"><span className={`${m.sender === Sender.USER ? 'text-green-400' : 'text-gold-400'} font-bold uppercase text-xs`}>{m.sender}</span><div className="bg-white/5 p-2 rounded mt-1 text-mystic-200">{m.text}</div></div>))}</div></div></div> )}
    </div>
  );
};

export default AdminDashboard;
