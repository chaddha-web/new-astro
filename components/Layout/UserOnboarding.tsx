
import React, { useState, useEffect } from 'react';
import { sendAuthOtp, verifyAuthOtp, fetchUserProfile, saveUserProfile } from '../../services/dbService';
import { UserState } from '../../types';
import { Lock, Smartphone, User, Clock, Globe, Unlock, Sparkles } from 'lucide-react';

export interface OnboardingData {
  contact: string;
  name: string;
  gender: string;
  date: string;
  time: string;
  place: string;
  password?: string;
  userId?: string; // Newly added
}

interface UserOnboardingProps {
  onSubmit: (data: OnboardingData, tier: 'free' | 'premium' | 'member21') => void;
  onGuruLogin?: () => void;
}

const COUNTRY_CODES = [
    { code: '+91', country: 'IN', label: 'India (+91)' },
    { code: '+1', country: 'US', label: 'USA/Canada (+1)' },
    { code: '+44', country: 'UK', label: 'UK (+44)' },
    { code: '+61', country: 'AU', label: 'Australia (+61)' },
    { code: '+971', country: 'AE', label: 'UAE (+971)' },
    { code: '+65', country: 'SG', label: 'Singapore (+65)' },
    { code: '+49', country: 'DE', label: 'Germany (+49)' },
    { code: '+33', country: 'FR', label: 'France (+33)' },
    { code: '+81', country: 'JP', label: 'Japan (+81)' },
];

const UserOnboarding: React.FC<UserOnboardingProps> = ({ onSubmit, onGuruLogin }) => {
  const [step, setStep] = useState(1);
  const [contactInput, setContactInput] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timer, setTimer] = useState(0);
  const [debouncedPlace, setDebouncedPlace] = useState('');
  const [verifiedUserId, setVerifiedUserId] = useState<string | undefined>(undefined);
  const [showGuruPin, setShowGuruPin] = useState(false);
  const [guruPin, setGuruPin] = useState('');

  const [formData, setFormData] = useState<OnboardingData>({
    contact: '',
    name: '',
    gender: '',
    date: '',
    time: '',
    place: '',
    password: ''
  });

  const isEmailDetected = /[a-zA-Z@]/.test(contactInput);

  useEffect(() => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let detected = '+91'; 
        if (tz.includes('America')) detected = '+1';
        else if (tz.includes('Europe/London')) detected = '+44';
        else if (tz.includes('Europe')) detected = '+49'; 
        else if (tz.includes('Australia')) detected = '+61';
        else if (tz.includes('Dubai') || tz.includes('Asia/Muscat')) detected = '+971';
        else if (tz.includes('Asia/Singapore')) detected = '+65';
        else if (tz.includes('Asia/Tokyo')) detected = '+81';
        if (COUNTRY_CODES.some(c => c.code === detected)) setCountryCode(detected);
    } catch (e) {}
  }, []);

  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedPlace(formData.place), 1000);
    return () => clearTimeout(handler);
  }, [formData.place]);

  useEffect(() => {
      setErrorMsg(''); 
      const cleanContact = contactInput.trim();
      if (isEmailDetected) {
          setFormData(prev => ({ ...prev, contact: cleanContact }));
      } else {
          setFormData(prev => ({ ...prev, contact: `${countryCode}${cleanContact}` }));
      }
  }, [contactInput, countryCode, isEmailDetected]);

  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // STEP 4 COMPLETION TRIGGER: SAVE FULL PROFILE
    if (step === 4) {
        setIsLoading(true);
        try {
            // Construct the UserState for DB save
            // We use 'verifiedUserId' obtained from OTP step
            const userPayload: UserState = {
                id: verifiedUserId,
                contact: formData.contact,
                name: formData.name,
                gender: formData.gender,
                birthDate: formData.date,
                birthTime: formData.time,
                birthPlace: formData.place,
                dailyQuestionsLeft: 1, // Default free limit
                isPremium: false,
                tier: 'free',
                hasOnboarded: false, // Not fully finished until payment/final step
                language: 'en'
            };
            
            // Upsert full details. Password was saved earlier or can be updated here if needed.
            await saveUserProfile(userPayload, formData.password);
            
        } catch (e) {
            console.error("Failed to save profile at Step 4", e);
            // Optionally block progress, but we'll allow proceed to keep flow moving 
            // and rely on final save in App.tsx as backup
        } finally {
            setIsLoading(false);
        }
    }

    setStep(prev => prev + 1);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMsg('');

      const cleanInput = contactInput.trim();
      const contact = isEmailDetected ? cleanInput : `${countryCode}${cleanInput}`;
      
      try {
        const { profile } = await fetchUserProfile(contact);
        if (profile) {
            setIsLoading(false);
            setErrorMsg("This mobile number or email is already registered. Please login instead.");
            return;
        }
      } catch (err) {}

      const result = await sendAuthOtp(contact);
      setIsLoading(false);

      if (result.success) {
          setOtpSent(true);
          setTimer(60); 
      } else if (result.isRateLimit) {
          alert("Note: You are requesting codes too quickly. Please check your inbox for the previous code.");
          setOtpSent(true);
          setTimer(60);
      } else {
          setErrorMsg(result.message || "Failed to send code.");
      }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMsg('');

      const cleanInput = contactInput.trim();
      const contact = isEmailDetected ? cleanInput : `${countryCode}${cleanInput}`;
      const result = await verifyAuthOtp(contact, otp.trim());

      if (result.success) {
          setIsOtpVerified(true);
          if (result.userId) {
              setVerifiedUserId(result.userId);
              setFormData(prev => ({ ...prev, userId: result.userId }));
              
              // IMMEDIATE STORAGE: Create Skeletal Profile
              // Stores only Contact and ID initially.
              try {
                  const initialUser: UserState = {
                      id: result.userId,
                      contact: contact,
                      name: '', // Placeholder
                      dailyQuestionsLeft: 0,
                      isPremium: false,
                      tier: 'free',
                      hasOnboarded: false,
                      language: 'en'
                  };
                  // We don't save password here yet, just the row
                  await saveUserProfile(initialUser);
                  console.log("Initial Skeletal Profile Created");
              } catch (saveErr) {
                  console.error("Failed to create skeletal profile", saveErr);
              }
          }
      } else {
          setErrorMsg(result.message || "Invalid Code.");
      }
      setIsLoading(false);
  };

  const handleSetPasswordAndContinue = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password.length < 4) {
          setErrorMsg("Password must be at least 4 characters.");
          return;
      }
      setFormData(prev => ({ ...prev, password: password }));
      
      // Update password in DB now that we have it
      if (verifiedUserId) {
          try {
             // Pass password to saveUserProfile which handles hashing
             await saveUserProfile({ 
                 id: verifiedUserId, 
                 contact: formData.contact, 
                 dailyQuestionsLeft: 0, 
                 isPremium: false, 
                 tier: 'free',
                 hasOnboarded: false,
                 language: 'en',
                 name: '' // Keep skeletal
             }, password);
          } catch (e) { console.error("Password update failed", e); }
      }

      handleNext();
  };

  const resetContact = () => {
      setOtpSent(false);
      setIsOtpVerified(false);
      setOtp('');
      setPassword('');
      setTimer(0);
      setErrorMsg('');
      setVerifiedUserId(undefined);
  };

  const handleFinalSubmit = (tier: 'free' | 'premium' | 'member21') => {
    if (formData.name && formData.date) {
      // Pass the complete form data including userId
      onSubmit({ ...formData, userId: verifiedUserId }, tier);
    }
  };

  const handleGuruPinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (guruPin === '2904') {
          onGuruLogin?.();
      } else {
          setErrorMsg("Incorrect Guru PIN");
      }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
        {showGuruPin ? (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-6">
                     <div className="w-12 h-12 bg-mystic-700/50 rounded-full flex items-center justify-center mx-auto mb-3"><Lock className="w-6 h-6 text-gold-400" /></div>
                     <h3 className="text-xl font-serif text-white">Guru Access</h3>
                     <p className="text-mystic-400 text-sm">Enter Security PIN to continue.</p>
                </div>
                <form onSubmit={handleGuruPinSubmit} className="space-y-4">
                    <input type="password" value={guruPin} onChange={(e) => setGuruPin(e.target.value)} placeholder="PIN Code" className="w-full bg-mystic-900 border border-mystic-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 text-center tracking-widest text-lg" autoFocus />
                    {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
                    <button type="submit" className="w-full bg-gold-500 hover:bg-gold-400 text-mystic-900 font-bold py-3 rounded-xl transition-colors">Verify Access</button>
                    <button type="button" onClick={() => { setShowGuruPin(false); setGuruPin(''); setErrorMsg(''); }} className="w-full text-mystic-500 text-xs hover:text-white transition-colors">Cancel</button>
                </form>
            </div>
        ) : (
            <>
                <div className="text-center mb-6">
                     <div className="w-12 h-12 bg-mystic-700/50 rounded-full flex items-center justify-center mx-auto mb-3"><Smartphone className="w-6 h-6 text-gold-400" /></div>
                     <h3 className="text-xl font-serif text-white">Let's stay connected</h3>
                     <p className="text-mystic-400 text-sm">Verify your mobile or email to start.</p>
                </div>
                <form onSubmit={otpSent ? (isOtpVerified ? handleSetPasswordAndContinue : handleVerifyOtp) : handleSendOtp} className="space-y-4">
                    <label className="text-xs uppercase tracking-widest text-mystic-400 font-bold ml-1">Email or Mobile Number</label>
                    <div className="flex gap-2 relative">
                        {!isEmailDetected && !otpSent && (
                            <div className="animate-in slide-in-from-left-4 fade-in duration-300 shrink-0">
                                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="h-full bg-mystic-900/50 border border-mystic-700 rounded-xl px-2 text-white focus:outline-none focus:border-gold-500 transition-all text-sm appearance-none text-center cursor-pointer min-w-[70px]">
                                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                            </div>
                        )}
                        <input type="text" value={contactInput} onChange={e => setContactInput(e.target.value)} disabled={otpSent || isLoading} className={`flex-1 bg-mystic-900/50 border rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold-500 transition-all placeholder-mystic-600 ${otpSent ? 'border-gold-500/50 text-mystic-400 cursor-not-allowed' : 'border-mystic-700'}`} placeholder="Enter mobile number or email" autoFocus={!otpSent} />
                        {otpSent && !isOtpVerified && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-500 text-sm animate-pulse">Verifying...</div>}
                        {isOtpVerified && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xl">✓</div>}
                    </div>
                    {!isEmailDetected && !otpSent && <p className="text-[10px] text-mystic-500 pl-1">Country code: {countryCode} (Auto-detected)</p>}

                    {otpSent && !isOtpVerified && (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-500 mt-4 bg-mystic-800/50 p-4 rounded-xl border border-gold-500/30">
                            <label className="text-xs uppercase tracking-widest text-gold-400 font-bold block mb-2 text-center">Enter 6-Digit Code</label>
                            <input type="text" value={otp} onChange={(e) => { const val = e.target.value.trim(); if (val.length <= 6) setOtp(val); }} placeholder="• • • • • •" maxLength={6} className="w-full bg-mystic-900 border-2 border-mystic-700 focus:border-gold-500 rounded-lg py-3 text-center text-2xl tracking-[0.5em] text-white outline-none font-mono transition-colors" autoFocus />
                            <div className="flex justify-between items-center mt-4 border-t border-white/5 pt-2">
                                <button type="button" onClick={handleSendOtp} disabled={isLoading || timer > 0} className={`text-[10px] underline ${timer > 0 ? 'text-mystic-600 cursor-not-allowed' : 'text-mystic-400 hover:text-white'}`}>{timer > 0 ? `Resend available in ${timer}s` : 'Resend Code'}</button>
                                <button type="button" onClick={resetContact} className="text-[10px] text-red-400 hover:text-red-300 underline">Change Number/Email</button>
                            </div>
                            {errorMsg && <p className="text-red-400 text-xs text-center mt-2 font-bold">{errorMsg}</p>}
                            <button type="submit" disabled={otp.length !== 6 || isLoading} className="w-full mt-4 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-mystic-900 font-bold py-3 rounded-lg shadow-lg transition-all">{isLoading ? 'Checking...' : 'Verify Code'}</button>
                        </div>
                    )}

                    {isOtpVerified && (
                         <div className="animate-in slide-in-from-top-4 fade-in duration-500 mt-4 space-y-4">
                            <div className="bg-mystic-800/50 p-4 rounded-xl border border-green-500/30">
                                <label className="text-xs uppercase tracking-widest text-green-400 font-bold block mb-2">Create Password</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a secure password" className="w-full bg-mystic-900 border border-mystic-600 focus:border-green-500 rounded-lg py-3 px-4 text-white outline-none transition-colors" autoFocus />
                            </div>
                            {errorMsg && <p className="text-red-400 text-xs text-center font-bold">{errorMsg}</p>}
                            <button type="submit" disabled={password.length < 4} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-mystic-900 font-bold py-4 rounded-xl shadow-lg transition-all">Save & Continue →</button>
                         </div>
                    )}
                    {!otpSent && (
                        <>
                            {errorMsg && <p className="text-red-400 text-xs text-center font-bold">{errorMsg}</p>}
                            <button type="submit" disabled={(!isEmailDetected && contactInput.length < 5) || (isEmailDetected && !contactInput.includes('@')) || isLoading} className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-mystic-900 font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center">{isLoading ? <div className="w-5 h-5 border-2 border-mystic-900 border-t-transparent rounded-full animate-spin"></div> : 'Send Verification Code'}</button>
                        </>
                    )}
                </form>
                {!otpSent && onGuruLogin && <div className="mt-4 text-center"><button onClick={() => setShowGuruPin(true)} className="text-xs text-violet-400 hover:text-white transition-colors underline">Guru Login Shortcut</button></div>}
            </>
        )}
    </div>
  );

  const renderStep2 = () => (
    <form onSubmit={handleNext} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="text-center mb-6">
             <div className="w-12 h-12 bg-mystic-700/50 rounded-full flex items-center justify-center mx-auto mb-3"><User className="w-6 h-6 text-gold-400" /></div>
             <h3 className="text-xl font-serif text-white">Who are you?</h3>
             <p className="text-mystic-400 text-sm">Help the stars identify your energy.</p>
        </div>
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-mystic-400 font-bold ml-1">Your Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-mystic-900/50 border border-mystic-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold-500 transition-all" placeholder="Enter your full name" autoFocus />
            </div>
            <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-mystic-400 font-bold ml-1">Gender</label>
                <div className="grid grid-cols-3 gap-3">
                    {['Male', 'Female', 'Other'].map(g => (
                        <button type="button" key={g} onClick={() => setFormData({...formData, gender: g})} className={`py-3 rounded-xl border font-bold text-sm transition-all ${formData.gender === g ? 'bg-gold-500/20 border-gold-500 text-gold-400' : 'bg-mystic-900/30 border-mystic-700 text-mystic-400 hover:bg-mystic-800'}`}>{g}</button>
                    ))}
                </div>
            </div>
        </div>
        <button type="submit" disabled={!formData.name || !formData.gender} className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-mystic-900 font-bold py-4 rounded-xl shadow-lg transition-all">Next Step →</button>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handleNext} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="text-center mb-6">
             <div className="w-12 h-12 bg-mystic-700/50 rounded-full flex items-center justify-center mx-auto mb-3"><Clock className="w-6 h-6 text-gold-400" /></div>
             <h3 className="text-xl font-serif text-white">Moment of Arrival</h3>
             <p className="text-mystic-400 text-sm">The exact time determines your Lagna (Ascendant).</p>
        </div>
        <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-mystic-400 font-bold ml-1">Birth Date</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-mystic-900/50 border border-mystic-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold-500 transition-all [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-mystic-400 font-bold ml-1">Birth Time</label>
                <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-mystic-900/50 border border-mystic-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold-500 transition-all [color-scheme:dark]" />
            </div>
        </div>
        <button type="submit" disabled={!formData.date || !formData.time} className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-mystic-900 font-bold py-4 rounded-xl shadow-lg transition-all">Next Step →</button>
    </form>
  );

  const renderStep4 = () => (
    <form onSubmit={handleNext} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="text-center mb-6">
             <div className="w-12 h-12 bg-mystic-700/50 rounded-full flex items-center justify-center mx-auto mb-3"><Globe className="w-6 h-6 text-gold-400" /></div>
             <h3 className="text-xl font-serif text-white">Place of Origin</h3>
             <p className="text-mystic-400 text-sm">Location corrects the planetary coordinates.</p>
        </div>
        <div className="relative w-full h-48 rounded-xl overflow-hidden border border-mystic-600/50 bg-black/40 shadow-inner group">
            <div className="absolute inset-0 z-10 bg-[url('https://www.transparenttextures.com/patterns/graphy-dark.png')] opacity-30 pointer-events-none"></div>
            {debouncedPlace.length > 3 ? (
                 <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0, opacity: 0.7, filter: 'contrast(1.2) saturate(0.8)' }} src={`https://maps.google.com/maps?q=${encodeURIComponent(debouncedPlace)}&t=m&z=10&output=embed&iwloc=near`} allowFullScreen className="transition-opacity duration-1000"></iframe>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 border border-gold-500/20 rounded-full animate-ping opacity-20 absolute"></div>
                    <div className="w-48 h-48 border border-gold-500/10 rounded-full animate-pulse opacity-10 absolute"></div>
                    <span className="text-xs text-mystic-500 font-mono tracking-widest z-10">AWAITING COORDINATES...</span>
                </div>
            )}
            <div className="absolute inset-0 z-20 pointer-events-none border-2 border-mystic-800/50 rounded-xl"></div>
            {debouncedPlace.length > 3 && <div className="absolute top-0 left-0 w-full h-1 bg-green-400/30 shadow-[0_0_15px_rgba(74,222,128,0.5)] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>}
        </div>
        <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-mystic-400 font-bold ml-1">City, State, Country</label>
            <input type="text" required value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} className="w-full bg-mystic-900/50 border border-mystic-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold-500 transition-all placeholder-mystic-600 font-bold tracking-wide" placeholder="e.g. Mumbai, Maharashtra" autoFocus />
        </div>
        <button type="submit" disabled={!formData.place || isLoading} className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-mystic-900 font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center">
            {isLoading ? <div className="w-5 h-5 border-2 border-mystic-900 border-t-transparent rounded-full animate-spin"></div> : 'Unlock Your Destiny →'}
        </button>
    </form>
  );

  const renderStep5 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="text-center mb-4">
             <div className="w-16 h-16 bg-gradient-to-tr from-gold-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(234,179,8,0.4)]"><Unlock className="w-8 h-8 text-white" /></div>
             <h3 className="text-2xl font-serif text-white mb-1">Final Step</h3>
             <p className="text-mystic-300 text-xs">Choose how you want to reveal your astrological reading.</p>
        </div>
        
        {/* Premium Option */}
        <div className="bg-gradient-to-br from-mystic-800 to-mystic-900 border border-gold-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-gold-500/50 transition-all cursor-pointer shadow-lg" onClick={() => handleFinalSubmit('premium')}>
            <div className="absolute top-0 right-0 bg-gold-500 text-mystic-900 text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Recommended</div>
            <div className="flex justify-between items-start mb-2">
                <div><h4 className="text-base font-bold text-white">Premium Access</h4><p className="text-gold-400 font-bold text-lg">₹299 <span className="text-[10px] font-normal text-mystic-400">/ month</span></p></div>
                <div><Sparkles className="w-6 h-6 text-gold-400" /></div>
            </div>
            <ul className="space-y-1.5 mb-4 text-xs text-mystic-300">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 10 Detailed Questions Daily</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Full Vastu Blueprints & Remedies</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Download Natal Chart</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Priority Instant Response</li>
            </ul>
            <button className="w-full bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-mystic-950 font-bold py-2.5 rounded-xl shadow-lg text-sm transition-transform active:scale-[0.98]">Unlock Premium</button>
        </div>

        {/* Member 21 Option */}
        <div className="bg-indigo-900/30 border border-indigo-500/40 rounded-2xl p-4 relative overflow-hidden group hover:bg-indigo-900/50 hover:border-indigo-500/60 transition-all cursor-pointer flex justify-between items-center" onClick={() => handleFinalSubmit('member21')}>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-indigo-100">Member 21</h4>
                    <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">3 Years</span>
                </div>
                <p className="text-[10px] text-indigo-300">Full Initiation Reading + Insights Dashboard</p>
                <p className="text-[9px] text-indigo-400 mt-0.5">Pay per question after initial reading.</p>
            </div>
            <div className="text-right">
                <p className="text-lg font-bold text-indigo-200 font-mono">₹21</p>
                <button className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg mt-1 font-bold">Join</button>
            </div>
        </div>

        <div className="text-center pt-2">
            <button onClick={() => handleFinalSubmit('free')} className="text-xs text-mystic-500 hover:text-white underline decoration-mystic-700 underline-offset-4 transition-colors">Continue with Limited Free Access (1 Question)</button>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full p-4">
      <div className="bg-mystic-800/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative my-auto">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-mystic-900 rounded-t-3xl overflow-hidden">
            <div className="h-full bg-gold-500 transition-all duration-500 ease-out" style={{ width: `${(step / 5) * 100}%` }}></div>
        </div>
        {step > 1 && <button onClick={() => setStep(prev => prev - 1)} className="absolute top-6 left-6 text-mystic-500 hover:text-white transition-colors">← Back</button>}
        <div className="mt-4">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
        </div>
        <div className="mt-6 text-center">
            <p className="text-[10px] text-mystic-600 uppercase tracking-widest font-bold">Step {step} of 5</p>
        </div>
      </div>
    </div>
  );
};

export default UserOnboarding;
