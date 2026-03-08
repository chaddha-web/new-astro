
import React from 'react';
import { UserState, Language } from '../../types';
import { formatDisplayName } from '../../constants';
import { MessageCircle, Sparkles, User as UserIcon, ShoppingBag, Zap, Phone, Package, CreditCard, LogOut } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserState;
  onNavigate: (view: string) => void;
  onOpenProfile: () => void;
  onOpenHistory: (tab: 'all' | 'calls' | 'purchases') => void;
  onLogout: () => void;
  onLanguageChange: (lang: Language) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onNavigate, onOpenProfile, onOpenHistory, onLogout, onLanguageChange }) => {
  const displayName = formatDisplayName(user.name || 'Guest');

  const languages: { code: Language, label: string }[] = [
      { code: 'en', label: 'English' },
      { code: 'hi', label: 'हिंदी' },
      { code: 'te', label: 'తెలుగు' },
      { code: 'mr', label: 'मराठी' },
      { code: 'ml', label: 'മലയാളം' },
      { code: 'pa', label: 'ਪੰਜਾਬੀ' }
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 bottom-0 z-[70] w-72 bg-mystic-900 border-r border-gold-500/20 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* User Header */}
        <div className="p-6 border-b border-white/5 bg-mystic-800/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-900 flex items-center justify-center text-white font-bold text-xl border-2 border-gold-500/30 shadow-inner">
               {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg leading-tight line-clamp-1">{displayName}</h3>
              <p className="text-xs text-gold-400 font-medium uppercase tracking-wider">
                {user.tier === 'member21' ? '21 Member' : user.isPremium ? 'Premium Member' : 'Free Plan'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onOpenProfile} className="flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded text-xs text-mystic-300 font-bold border border-white/5 transition-colors">
                Edit Profile
            </button>
            <button onClick={() => { onClose(); onNavigate('chart'); }} className="flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded text-xs text-mystic-300 font-bold border border-white/5 transition-colors">
                Natal Chart
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <div className="px-3 mb-2 text-[10px] text-mystic-500 uppercase tracking-widest font-bold">Menu</div>
            
            <SidebarItem icon={<MessageCircle size={18} />} label="Chat" onClick={() => onNavigate('chat')} />
            <SidebarItem icon={<Sparkles size={18} />} label="Insights" onClick={() => onNavigate('horoscope')} />
            <SidebarItem icon={<UserIcon size={18} />} label="Gurus" onClick={() => onNavigate('marketplace')} />
            <SidebarItem icon={<ShoppingBag size={18} />} label="Shop" onClick={() => onNavigate('shop')} />
            <SidebarItem icon={<Zap size={18} />} label="Upgrade Plan" onClick={() => onNavigate('upgrade')} />
            
            <div className="my-4 border-t border-white/5"></div>
            <div className="px-3 mb-2 text-[10px] text-mystic-500 uppercase tracking-widest font-bold">Payments & History</div>
            
            <SidebarItem icon={<Phone size={18} />} label="Call History" onClick={() => onOpenHistory('calls')} />
            <SidebarItem icon={<Package size={18} />} label="My Purchases" onClick={() => onOpenHistory('purchases')} />
            <SidebarItem icon={<CreditCard size={18} />} label="All Transactions" onClick={() => onOpenHistory('all')} />

            <div className="my-4 border-t border-white/5"></div>
            <div className="px-3 mb-3 text-[10px] text-mystic-500 uppercase tracking-widest font-bold">Preferred Language</div>
            <div className="grid grid-cols-2 gap-2 px-3">
                {languages.map(lang => (
                    <button 
                        key={lang.code}
                        onClick={() => onLanguageChange(lang.code)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${user.language === lang.code ? 'bg-gold-500 text-mystic-900 border-gold-500 shadow-lg shadow-gold-500/20' : 'bg-white/5 text-mystic-400 border-white/10 hover:bg-white/10'}`}
                    >
                        {lang.label}
                    </button>
                ))}
            </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-mystic-950/30">
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white hover:bg-red-500/10 py-3 rounded-xl transition-all text-sm font-bold"
            >
                <LogOut size={16} /> Logout
            </button>
            <p className="text-center text-[10px] text-mystic-600 mt-4 font-mono">ASTRO-VASTU v1.3</p>
        </div>
      </div>
    </>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-mystic-300 hover:bg-mystic-800 hover:text-white hover:pl-6 transition-all group"
    >
        <span className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform flex items-center justify-center">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
    </button>
);

export default Sidebar;
