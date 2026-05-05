import { Routes, Route, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Intake from './pages/Intake.jsx'
import Result from './pages/Result.jsx'
import Draft from './pages/Draft.jsx'
import Tracker from './pages/Tracker.jsx'
import Escalation from './pages/Escalation.jsx'
import Auth from './pages/Auth.jsx'
import ChatBot from './components/ChatBot.jsx'

export default function App() {
  const location = useLocation()
  const showChat = location.pathname !== '/' && location.pathname !== '/auth'

  return (
    <div className="app-shell bg-background">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/intake" element={<Intake />} />
        <Route path="/result" element={<Result />} />
        <Route path="/draft" element={<Draft />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/escalation" element={<Escalation />} />
      </Routes>

      {showChat && <ChatBot />}
    </div>
  )
}
