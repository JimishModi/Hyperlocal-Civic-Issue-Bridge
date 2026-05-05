import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'

export default function Landing() {
  const navigate = useNavigate()
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

  return (
    <div className="page page-enter flex flex-col items-center justify-center min-h-screen text-center relative">
      <div className="absolute top-6 right-6">
        {user ? (
          <button 
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
        ) : (
          <button 
            className="text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors px-5 py-2 rounded-full"
            onClick={() => navigate('/auth')}
          >
            Log In
          </button>
        )}
      </div>

      <h1 className="text-h1 text-primary-container mb-4">
        Civic Issue Bridge
      </h1>
      <p className="text-body-md text-accent-slate mb-8 max-w-md mx-auto">
        Report local issues in Powai — get them to the right BMC department.
      </p>
      <button
        className="btn-primary max-w-xs"
        onClick={() => navigate(user ? '/intake' : '/auth')}
      >
        Report an Issue
      </button>
    </div>
  )
}
