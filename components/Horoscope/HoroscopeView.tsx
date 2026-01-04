
import React, { useState } from 'react';
import { UserState, HoroscopeData } from '../../types';
import { jsPDF } from "jspdf";
import { generateJsonContent } from '../../services/geminiService';
import { Type, Schema } from '@google/genai';

interface HoroscopeViewProps {
  user: UserState;
  onSendYearlyReport: () => void;
  horoscopeData?: HoroscopeData;
  isLoading: boolean;
}

const HoroscopeView: React.FC<HoroscopeViewProps> = ({ user, onSendYearlyReport, horoscopeData, isLoading }) => {
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
          
          if (type === 'weekly' && diffDays < 7) {
              return { allowed: false, message: `Weekly limit reached. Try again in ${7 - diffDays} days.` };
          }
          if (type === 'monthly' && diffDays < 30) {
              return { allowed: false, message: "Monthly yearbook already downloaded this month." };
          }
      }
      return { allowed: true };
  };

  const handleDownloadReport = async (type: 'weekly' | 'monthly') => {
      const eligibility = checkDownloadEligibility(type);
      if (!eligibility.allowed) {
          alert(eligibility.message);
          return;
      }

      setIsGeneratingPdf(true);
      try {
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 20;
          
          // Colors
          const goldColor = [218, 165, 32] as [number, number, number];
          const darkColor = [26, 11, 46] as [number, number, number]; // Mystic Dark

          // Helper: Add Branding (Watermark, Border, Footer) to current page
          const addPageBranding = (pageNo: number) => {
              // 1. Watermark (Diagonal, Light)
              doc.saveGraphicsState();
              doc.setTextColor(230, 230, 230); // Very light grey
              doc.setFontSize(60);
              doc.setFont("helvetica", "bold");
              
              // Rotate context for diagonal text
              doc.text("astro21.io", pageWidth / 2, pageHeight / 2, {
                  align: "center",
                  angle: 45,
                  renderingMode: "fill"
              });
              doc.restoreGraphicsState();

              // 2. Border
              doc.setDrawColor(...goldColor);
              doc.setLineWidth(1);
              doc.rect(10, 10, pageWidth - 20, pageHeight - 20); // Outer
              doc.setLineWidth(0.2);
              doc.rect(12, 12, pageWidth - 24, pageHeight - 24); // Inner decorative

              // 3. Footer
              doc.setFontSize(9);
              doc.setTextColor(150);
              doc.setFont("times", "italic");
              doc.text(`astro21.io  |  Page ${pageNo}`, pageWidth / 2, pageHeight - 15, { align: "center" });
          };

          // --- PAGE 1 SETUP ---
          addPageBranding(1);
          let yPos = 30;

          // Header Logo
          doc.setFont("times", "bold");
          doc.setFontSize(28);
          doc.setTextColor(...goldColor);
          doc.text("ASTRO21", pageWidth / 2, yPos, { align: "center" });
          yPos += 8;

          // Subtitle
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text("COSMIC GUIDANCE REPORT", pageWidth / 2, yPos, { align: "center", charSpace: 3 });
          yPos += 15;

          // Report Type Title
          doc.setFont("times", "bold");
          doc.setFontSize(16);
          doc.setTextColor(...darkColor);
          doc.text(`${type === 'weekly' ? 'Weekly Transit Forecast' : `Annual Yearbook ${new Date().getFullYear()}`}`, pageWidth / 2, yPos, { align: "center" });
          yPos += 10;

          // User Meta Data Box
          doc.setDrawColor(...goldColor);
          doc.setFillColor(252, 250, 240); // Off-white/cream background
          doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'FD');
          
          yPos += 8;
          doc.setFontSize(11);
          doc.setTextColor(50);
          doc.text(`Seeker: ${user.name}`, margin + 5, yPos);
          doc.text(`Sign: ${horoscopeData?.starSign || (user.birthDate ? 'Unknown (using birth date)' : 'Unknown')}`, pageWidth - margin - 5, yPos, { align: "right" });
          
          yPos += 8;
          doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, margin + 5, yPos);
          doc.text(`Format: ${type === 'weekly' ? 'Sunday - Saturday' : 'January - December'}`, pageWidth - margin - 5, yPos, { align: "right" });
          
          yPos += 20;

          // Content Generation via AI
          let reportContent = [];
          const signInfo = horoscopeData?.starSign ? `Star Sign: ${horoscopeData.starSign}` : (user.birthDate ? `Born: ${user.birthDate}` : '');
          
          if (type === 'weekly') {
              const prompt = `Generate a 7-day horoscope for ${user.name} ${signInfo}.
              Period: This week (Sunday to Saturday).
              Output JSON object with a field "items" which is an array of objects.
              Each object must have "title" (Day Name) and "forecast" (Prediction). 
              Tone: Mystical yet practical. Max 40 words per day.`;
              
              const schema: Schema = {
                  type: Type.OBJECT,
                  properties: {
                      items: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  title: { type: Type.STRING },
                                  forecast: { type: Type.STRING }
                              },
                              required: ['title', 'forecast']
                          }
                      }
                  }
              };
              
              const data = await generateJsonContent(prompt, 2500, schema);
              reportContent = data?.items || [];

          } else {
              const year = new Date().getFullYear();
              const prompt = `Generate a 12-month horoscope for ${user.name} ${signInfo} for the year ${year}. 
              Output JSON object with a field "items" which is an array of objects.
              Each object must have "title" (Month Name) and "forecast" (Prediction).
              Tone: Mystical yet practical. Max 40 words per month.`;
              
              const schema: Schema = {
                  type: Type.OBJECT,
                  properties: {
                      items: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  title: { type: Type.STRING },
                                  forecast: { type: Type.STRING }
                              },
                              required: ['title', 'forecast']
                          }
                      }
                  }
              };
              
              const data = await generateJsonContent(prompt, 4000, schema);
              reportContent = data?.items || [];
          }

          // Render Content Loop
          doc.setFont("times", "normal");
          let pageCount = 1;

          if (reportContent && reportContent.length > 0) {
              reportContent.forEach((item: any, index: number) => {
                  const title = item.title || item.day || item.month;
                  const text = item.forecast;

                  // Dynamic Check for Page Break
                  // Bottom margin is ~20px + footer space
                  if (yPos > pageHeight - 40) {
                      doc.addPage();
                      pageCount++;
                      addPageBranding(pageCount);
                      yPos = 30; // Reset top margin
                  }

                  // Item Title
                  doc.setFont("times", "bold");
                  doc.setFontSize(12);
                  doc.setTextColor(...darkColor);
                  
                  // Draw a small bullet/icon
                  doc.setDrawColor(...goldColor);
                  doc.setFillColor(...goldColor);
                  doc.circle(margin - 4, yPos - 1, 1.5, 'F');
                  
                  doc.text(String(title).toUpperCase(), margin, yPos);
                  yPos += 6;

                  // Item Body
                  doc.setFont("times", "normal");
                  doc.setFontSize(11);
                  doc.setTextColor(20); // Almost black
                  
                  const splitText = doc.splitTextToSize(String(text), pageWidth - (margin * 2));
                  doc.text(splitText, margin, yPos);
                  
                  // Calculate height of text block + spacing
                  const blockHeight = (splitText.length * 5); 
                  yPos += blockHeight + 8; // Spacing between items
                  
                  // Divider line (light)
                  if (index < reportContent.length - 1) {
                      doc.setDrawColor(220, 220, 220);
                      doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);
                  }
              });
          } else {
              doc.setFont("helvetica", "italic");
              doc.setTextColor(150);
              doc.text("Cosmic interference prevented report generation. Please try again.", margin, yPos);
          }

          // Save File
          const fileName = `Astro21_${user.name.replace(/\s+/g, '_')}_${type === 'weekly' ? 'Weekly' : 'Yearbook'}.pdf`;
          doc.save(fileName);

          // Update Limit
          localStorage.setItem(`last_${type}_dl_${user.id || 'guest'}`, new Date().toISOString());

      } catch (e) {
          console.error("PDF Gen Error", e);
          alert("Failed to generate PDF. Please try again.");
      } finally {
          setIsGeneratingPdf(false);
      }
  };

  const renderDaily = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-gradient-to-r from-mystic-800 to-mystic-900 border border-gold-500/30 rounded-2xl p-6 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl">✨</div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-serif text-white">Daily Cosmic Rhythm</h3>
                {horoscopeData?.starSign && (
                    <span className="text-xs bg-gold-500/20 text-gold-400 px-3 py-1 rounded-full border border-gold-500/30 font-bold uppercase tracking-widest">
                        {horoscopeData.starSign}
                    </span>
                )}
              </div>
              <p className="text-sm text-mystic-300 mb-4">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              
              {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-gold-400 uppercase tracking-widest">Reading the stars...</p>
                  </div>
              ) : horoscopeData?.daily ? (
                  <>
                    <p className="text-white leading-relaxed mb-6 font-medium text-lg">{horoscopeData.daily.overview}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                            <h4 className="text-green-400 font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><span>✅</span> Do's</h4>
                            <ul className="space-y-2">
                                {Array.isArray(horoscopeData.daily.dos) && horoscopeData.daily.dos.map((item, i) => (
                                    <li key={i} className="text-sm text-mystic-200 flex items-start gap-2">
                                        <span className="text-green-500 mt-1">•</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                            <h4 className="text-red-400 font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><span>❌</span> Don'ts</h4>
                            <ul className="space-y-2">
                                {Array.isArray(horoscopeData.daily.donts) && horoscopeData.daily.donts.map((item, i) => (
                                    <li key={i} className="text-sm text-mystic-200 flex items-start gap-2">
                                        <span className="text-red-500 mt-1">•</span> {item}
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
      const year = new Date().getFullYear();

      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-mystic-800/60 border border-white/10 rounded-2xl p-8 shadow-xl relative overflow-hidden min-h-[400px]">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl">{type === 'weekly' ? '📅' : '🌑'}</div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-serif text-gold-400 mb-6 flex items-center gap-3">
                        <span>{type === 'weekly' ? '🔭' : '🔮'}</span> 
                        {type === 'weekly' ? 'Weekly Transit Analysis' : 'Monthly Stellar Alignment'}
                    </h3>
                    
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs text-indigo-400 uppercase tracking-widest">Consulting planetary ephemeris...</p>
                        </div>
                    ) : content ? (
                        <div className="prose prose-invert max-w-none">
                            <p className="text-mystic-100 text-lg leading-relaxed whitespace-pre-wrap">{content}</p>
                            <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                                <p className="text-xs text-mystic-500 italic">Insights generated for your natal chart alignment.</p>
                                <button 
                                    onClick={() => handleDownloadReport(type)}
                                    disabled={isGeneratingPdf}
                                    className={`text-xs font-bold px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${hasAccess ? 'bg-white/5 hover:bg-white/10 text-gold-400 border-gold-500/20' : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'}`}
                                >
                                    {!hasAccess && <span>🔒</span>}
                                    {isGeneratingPdf 
                                        ? 'Publishing PDF...' 
                                        : type === 'weekly' 
                                            ? 'Download Weekly PDF (Sun-Sat)' 
                                            : `Download ${year} Yearbook (Jan-Dec)`
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
        <div className="flex justify-center mb-6">
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
                        {tab}
                    </button>
                ))}
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
