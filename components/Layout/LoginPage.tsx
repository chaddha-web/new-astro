import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarBackground from './StarBackground';

interface LoginPageProps {
  onSeekerLogin: (verifiedContact: string) => void;
  onVerifyCredentials: (contact: string, password: string) => Promise<boolean | string>;
  onAdminEnter: () => void;
  sendAuthOtp: (contact: string) => Promise<{success: boolean, message?: string, isRateLimit?: boolean}>;
  verifyAuthOtp: (contact: string, otp: string) => Promise<{success: boolean, message?: string}>;
  resetUserPassword: (contact: string, newPass: string) => Promise<{success: boolean, message?: string}>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSeekerLogin, onVerifyCredentials, onAdminEnter, sendAuthOtp, verifyAuthOtp, resetUserPassword }) => {
  const navigate = useNavigate();
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp' | 'forgot_request' | 'forgot_otp' | 'forgot_new_password'>('credentials');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (isAdminMode) {
        if (adminPin === '2904') {
            onAdminEnter();
            navigate('/app');
        } else {
            setErrorMsg("Incorrect Admin PIN");
        }
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
            const otpResult = await sendAuthOtp(targetContact);
            if (otpResult.success || otpResult.isRateLimit) setLoginStep('otp');
            else setErrorMsg(otpResult.message || "Failed to send OTP.");
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
          if (result.success) {
              onSeekerLogin(phoneNumber);
              navigate('/app');
          } else {
              setErrorMsg(result.message || "Invalid OTP Code.");
          }
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

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-mystic-900 text-white font-sans selection:bg-gold-500/30">
      <StarBackground />
      <div className="relative z-10 bg-mystic-800 border border-gold-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in fade-in">
          <button onClick={() => navigate('/')} className="absolute top-4 right-4 text-mystic-500 hover:text-white">✕</button>
          
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
  );
};

export default LoginPage;
