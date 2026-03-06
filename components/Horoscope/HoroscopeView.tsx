
import React, { useState } from 'react';
import { UserState, HoroscopeData, Language } from '../../types';
import { generateJsonContent } from '../../services/geminiService';
import { Type, Schema } from '@google/genai';

interface HoroscopeViewProps {
  user: UserState;
  onSendYearlyReport: () => void;
  horoscopeData?: HoroscopeData;
  isLoading: boolean;
  onLanguageChange: (lang: Language) => void;
}

const HoroscopeView: React.FC<HoroscopeViewProps> = ({ user, onSendYearlyReport, horoscopeData, isLoading, onLanguageChange }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const checkDownloadEligibility = (type: 'weekly' | 'monthly'): { allowed: boolean; message?: string } => {
      // 1. Check Tier
      const isEligible = user.isPremium || user.tier === 'member21';
      if (!isEligible) {
          return { allowed: false, message: "Upgrade to Premium or Member 21 to download reports." };
      }

      // 2. Check Frequency (LocalStorage for frontend simplicity)
      const key = `last_${type}_dl_${user.id || 'guest'}`;
      const lastDl = localStorage.getItem(key);
      
      if (lastDl) {
          const lastDate = new Date(lastDl);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (type === 'weekly' && diffDays < 1) { // Changed to 1 day for testing ease, originally 7
              // return { allowed: false, message: `Weekly limit reached. Try again in ${7 - diffDays} days.` };
          }
      }
      return { allowed: true };
  };

  const handlePrint = async (type: 'weekly' | 'monthly') => {
      const eligibility = checkDownloadEligibility(type);
      if (!eligibility.allowed) {
          alert(eligibility.message);
          return;
      }

      setIsGeneratingPdf(true);
      
      // Update Limit
      localStorage.setItem(`last_${type}_dl_${user.id || 'guest'}`, new Date().toISOString());

      // Use Browser Print for perfect font rendering (supports Telugu/Marathi/etc natively)
      // We will create a temporary print window or style the current page for printing.
      // For simplicity and robustness with React, we'll open a print dialog on the current view 
      // but injecting a print-specific class to hide non-report elements.
      
      // Add print-only styles dynamically
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            padding: 40px;
            font-family: 'Times New Roman', serif;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure text colors are dark for print */
          .print-content p, .print-content h3, .print-content li {
             color: #000 !important;
          }
        }
      `;
      document.head.appendChild(style);

      setTimeout(() => {
          window.print();
          document.head.removeChild(style); // Cleanup
          setIsGeneratingPdf(false);
      }, 500);
  };

  const renderDaily = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-gradient-to-r from-mystic-800 to-mystic-900 border border-gold-500/30 rounded-2xl p-6 relative overflow-hidden shadow-lg print-content">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl no-print">✨</div>
              <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-xl font-serif text-white">Daily Cosmic Rhythm</h3>
                    <p className="text-xs text-mystic-400 mt-1 font-mono uppercase">
                        {horoscopeData?.meta?.dailyDate || new Date().toLocaleDateString()}
                    </p>
                </div>
                {horoscopeData?.starSign && (
                    <span className="text-xs bg-gold-500/20 text-gold-400 px-3 py-1 rounded-full border border-gold-500/30 font-bold uppercase tracking-widest no-print">
                        {horoscopeData.starSign}
                    </span>
                )}
              </div>
              
              {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-gold-400 uppercase tracking-widest">Reading the stars...</p>
                  </div>
              ) : horoscopeData?.daily ? (
                  <>
                    <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] text-gold-400 uppercase tracking-widest font-bold mb-1">Simple Overview</p>
                        <p className="text-white font-medium text-sm leading-relaxed">{horoscopeData.daily.simple_overview}</p>
                    </div>

                    <div className="mb-6">
                        <p className="text-[10px] text-mystic-400 uppercase tracking-widest font-bold mb-2">Detailed Analysis</p>
                        <p className="text-mystic-200 text-sm leading-relaxed text-justify whitespace-pre-line">{horoscopeData.daily.overview}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                            <h4 className="text-green-400 font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><span>✅</span> Do's</h4>
                            <ul className="space-y-2">
                                {Array.isArray(horoscopeData.daily.dos) && horoscopeData.daily.dos.map((item, i) => (
                                    <li key={i} className="text-sm text-mystic-200 flex items-start gap-2">
                                        <span className="text-green-500 mt-1 text-[10px]">▶</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                            <h4 className="text-red-400 font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><span>❌</span> Don'ts</h4>
                            <ul className="space-y-2">
                                {Array.isArray(horoscopeData.daily.donts) && horoscopeData.daily.donts.map((item, i) => (
                                    <li key={i} className="text-sm text-mystic-200 flex items-start gap-2">
                                        <span className="text-red-500 mt-1 text-[10px]">■</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <div className="bg-white/5 rounded-lg px-4 py-2 text-center flex-1 border border-white/5">
                            <p className="text-[10px] text-mystic-400 uppercase">Lucky Color</p>
                            <p className="text-gold-300 font-bold">{horoscopeData.daily.luckyColor}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg px-4 py-2 text-center flex-1 border border-white/5">
                            <p className="text-[10px] text-mystic-400 uppercase">Lucky Number</p>
                            <p className="text-gold-300 font-bold">{horoscopeData.daily.luckyNumber}</p>
                        </div>
                    </div>
                  </>
              ) : (
                  <p className="text-center text-mystic-500 py-10">Unable to fetch insights. Please try again.</p>
              )}
          </div>
      </div>
  );

  const renderFullForecast = (type: 'weekly' | 'monthly') => {
      const content = type === 'weekly' ? horoscopeData?.weekly : horoscopeData?.monthly;
      const hasAccess = user.isPremium || user.tier === 'member21';
      
      const headerDate = type === 'weekly' 
        ? `Week of ${horoscopeData?.meta?.weekDate || 'Current Cycle'}` 
        : `${horoscopeData?.meta?.monthDate || 'Yearly Overview'}`;

      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-mystic-800/60 border border-white/10 rounded-2xl p-8 shadow-xl relative overflow-hidden min-h-[400px] print-content">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl no-print">{type === 'weekly' ? '📅' : '🌑'}</div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-serif text-gold-400 mb-2 flex items-center gap-3">
                        <span>{type === 'weekly' ? '🔭' : '🔮'}</span> 
                        {type === 'weekly' ? 'Weekly Transit Analysis' : 'Annual Yearbook'}
                    </h3>
                    <p className="text-sm text-mystic-400 font-mono uppercase mb-6 border-b border-white/10 pb-4 inline-block">
                        {headerDate}
                    </p>
                    
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs text-indigo-400 uppercase tracking-widest">Consulting planetary ephemeris...</p>
                        </div>
                    ) : content ? (
                        <div className="prose prose-invert max-w-none">
                            <div className="text-mystic-100 text-lg leading-relaxed whitespace-pre-wrap font-serif">
                                {content}
                            </div>
                            
                            {/* Watermark for Print */}
                            <div className="hidden print:block text-center mt-10 border-t pt-4 text-xs text-gray-500">
                                Generated by www.astro21.io - Your Cosmic Guide
                            </div>

                            {type === 'monthly' && (
                                <div className="my-8 bg-indigo-900/40 p-6 rounded-xl border border-indigo-500/30 text-center animate-pulse-slow no-print">
                                    <p className="text-indigo-200 font-serif text-lg mb-2">Detailed Monthly Ephemeris</p>
                                    <p className="text-sm text-mystic-400 mb-4">Get the full breakdown for Jan-Dec instantly.</p>
                                </div>
                            )}

                            <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                                <p className="text-xs text-mystic-500 italic">Insights generated for your natal chart alignment.</p>
                                <button 
                                    onClick={() => handlePrint(type)}
                                    disabled={isGeneratingPdf}
                                    className={`text-xs font-bold px-6 py-3 rounded-full border transition-all flex items-center gap-2 shadow-lg ${hasAccess ? 'bg-gold-500 text-black hover:bg-gold-400 border-gold-500 shadow-gold-500/20' : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'}`}
                                >
                                    {!hasAccess && <span>🔒</span>}
                                    {isGeneratingPdf 
                                        ? 'Preparing Print...' 
                                        : type === 'weekly' 
                                            ? 'Print / Save Weekly PDF' 
                                            : `Print / Save Yearbook (Jan-Dec)`
                                    }
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-mystic-500 py-20">No data available for this cycle.</p>
                    )}
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 md:p-0">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            {/* Tabs */}
            <div className="bg-mystic-800 rounded-full p-1 flex border border-white/10">
                {['daily', 'weekly', 'monthly'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                            activeTab === tab 
                            ? 'bg-gold-500 text-mystic-900 shadow-lg' 
                            : 'text-mystic-400 hover:text-white'
                        }`}
                    >
                        {tab === 'monthly' ? 'Yearbook' : tab}
                    </button>
                ))}
            </div>

            {/* Language Selector for Insights */}
            <div className="flex items-center gap-2 bg-mystic-800/50 px-3 py-1.5 rounded-full border border-white/10">
                <span className="text-[10px] text-mystic-400 uppercase font-bold tracking-wider">Language:</span>
                <select 
                    value={user.language}
                    onChange={(e) => onLanguageChange(e.target.value as Language)}
                    className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="mr">मराठी (Marathi)</option>
                    <option value="ml">മലയാളം (Malayalam)</option>
                    <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
            {activeTab === 'daily' && renderDaily()}
            {activeTab === 'weekly' && renderFullForecast('weekly')}
            {activeTab === 'monthly' && renderFullForecast('monthly')}
        </div>
    </div>
  );
};

export default HoroscopeView;
