import React from 'react';
import { Landmark, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';

export default function Auth() {
  const { t } = useTranslation();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in with Google:', error.message);
      alert(t('auth.loginError') + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Icon */}
      <div className="w-16 h-16 bg-[#eaf0ff] rounded-full flex items-center justify-center mb-6 text-[#0b1f3c]">
        <Landmark size={32} />
      </div>

      {/* Header text */}
      <h1 className="text-3xl font-bold text-[#0b1f3c] mb-2 text-center">{t('auth.welcome')}</h1>
      <p className="text-slate-600 mb-8 text-center max-w-sm font-medium">
        {t('auth.subtitle')}
      </p>

      {/* Auth Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 w-full max-w-md">
        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-lg py-3 px-4 text-slate-800 font-semibold hover:bg-slate-50 hover:shadow-sm transition-all focus:ring-2 focus:ring-[#eaf0ff] focus:outline-none"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          {t('auth.continueGoogle')}
        </button>
      </div>

      {/* Footer text */}
      <div className="mt-12 text-center">
        <div className="flex items-center justify-center gap-1.5 text-slate-500 mb-4 text-sm font-medium">
          <ShieldCheck size={16} />
          <span>{t('auth.secured')}</span>
        </div>
        
        <p className="text-[#0b1f3c] text-sm font-semibold mb-3">
          {t('auth.copyright')}
        </p>
        
      </div>
    </div>
  );
}
