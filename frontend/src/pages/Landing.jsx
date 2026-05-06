import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../config/supabase'

export default function Landing() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const LANGS = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हिं' },
    { code: 'mr', label: 'मरा' },
  ]

  return (
    <div className="page page-enter flex flex-col items-center justify-center min-h-screen text-center relative">
      <div className="absolute top-6 right-6 flex items-center gap-3">
        {/* Language switcher on landing too */}
        <div className="flex bg-white/80 rounded-lg overflow-hidden border border-slate-200">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => i18n.changeLanguage(l.code)}
              className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                i18n.language?.startsWith(l.code)
                  ? 'bg-primary-container text-on-primary'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {user ? (
          <button 
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            onClick={() => supabase.auth.signOut()}
          >
            {t('landing.signOut')}
          </button>
        ) : (
          <button 
            className="text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors px-5 py-2 rounded-full"
            onClick={() => navigate('/auth')}
          >
            {t('landing.logIn')}
          </button>
        )}
      </div>

      <h1 className="text-h1 text-primary-container mb-4">
        {t('landing.title')}
      </h1>
      <p className="text-body-md text-accent-slate mb-8 max-w-md mx-auto">
        {t('landing.subtitle')}
      </p>
      <button
        className="btn-primary max-w-xs"
        onClick={() => navigate(user ? '/intake' : '/auth')}
      >
        {t('landing.reportIssue')}
      </button>

      {user && (
        <button
          className="btn-ghost max-w-xs mt-3"
          onClick={() => navigate('/dashboard')}
        >
          {t('landing.myComplaints')}
        </button>
      )}
    </div>
  )
}
