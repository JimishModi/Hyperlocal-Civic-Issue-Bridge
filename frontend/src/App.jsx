import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Landing from './pages/Landing.jsx'
import Intake from './pages/Intake.jsx'
import Result from './pages/Result.jsx'
import Draft from './pages/Draft.jsx'
import Tracker from './pages/Tracker.jsx'
import Escalation from './pages/Escalation.jsx'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ChatBot from './components/ChatBot.jsx'
import { supabase } from './config/supabase.js'

function TopNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const hide = ['/', '/auth'].includes(location.pathname)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  if (hide || !user) return null

  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-0">
      <button className="btn-ghost text-label-sm py-1 px-3" onClick={() => navigate('/')}>← Home</button>
      <button className="btn-ghost text-label-sm py-1 px-3" onClick={() => navigate('/dashboard')}>My Complaints</button>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const showChat = location.pathname !== '/' && location.pathname !== '/auth'

  return (
    <div className="app-shell bg-background">
      <TopNav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/intake" element={<Intake />} />
        <Route path="/result" element={<Result />} />
        <Route path="/draft" element={<Draft />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/escalation" element={<Escalation />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>

      {showChat && <ChatBot />}
    </div>
  )
}
