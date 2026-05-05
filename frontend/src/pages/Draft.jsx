import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api.js'
import DraftEditor from '../components/DraftEditor.jsx'

export default function Draft() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const draft = state?.draft
  const [body, setBody] = useState(draft?.body || '')
  const [filing, setFiling] = useState(false)
  const [error, setError] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [breakdown, setBreakdown] = useState(null)

  if (!draft) {
    return (
      <div className="page page-enter text-center py-20">
        <p className="text-body-md text-accent-slate">No draft data. Please start from the intake page.</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/intake')}>Go to Intake</button>
      </div>
    )
  }

  /* ── mailto link ── */
  const mailtoHref = `mailto:${draft.email || ''}?subject=${encodeURIComponent(draft.subject || 'Civic Complaint')}&body=${encodeURIComponent(body)}`

  /* ── File on portal ── */
  const handlePortal = () => {
    if (draft.portal_url) window.open(draft.portal_url, '_blank', 'noopener')
  }

  /* ── Save & Track ── */
  const handleFile = async () => {
    setError(null)
    setFiling(true)
    try {
      const result = await apiFetch('/file', {
        method: 'POST',
        body: JSON.stringify({
          body,
          subject: draft.subject || `Civic Complaint: ${draft.category}`,
          department: draft.department,
          category: draft.category,
          email: draft.email,
          user_email: userEmail,
        }),
      })
      const code = result.reference_code
      localStorage.setItem('civic_ref_code', code)
      setBreakdown(result.process_breakdown)
    } catch (err) {
      setError(err.message)
    } finally {
      setFiling(false)
    }
  }

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-2">Your Complaint Draft</h1>

      <div className="card mb-4">
        <p className="text-label-bold text-on-surface mb-1">Department</p>
        <p className="text-body-md text-accent-slate mb-3">{draft.department || '—'}</p>
        <p className="text-label-bold text-on-surface mb-1">Email</p>
        <p className="text-body-md text-accent-slate">{draft.email || '—'}</p>
      </div>

      <DraftEditor value={body} onChange={setBody} />

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-label-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-label-bold text-on-surface mb-2">
          Your Email <span className="text-accent-slate font-normal">(optional — for CC and 14-day reminder)</span>
        </label>
        <input
          className="input-field"
          type="email"
          placeholder="you@example.com"
          value={userEmail}
          onChange={e => setUserEmail(e.target.value)}
        />
      </div>

      {breakdown ? (
        <div className="card-elevated">
          <p className="text-label-bold text-on-surface mb-4">Process Breakdown</p>
          <div className="flex flex-col gap-4 mb-6">
            {Object.values(breakdown).map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${step.done ? 'bg-accent-green text-white' : 'bg-surface-container text-accent-slate'}`}>
                  {step.done ? '✓' : '⏱'}
                </div>
                <div>
                  <p className="text-label-bold text-on-surface">{step.title}</p>
                  <p className="text-label-sm text-accent-slate">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 text-center mb-4">
            <p className="text-label-bold">Your reference code: {localStorage.getItem('civic_ref_code')}</p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => navigate('/tracker', { state: { reference_code: localStorage.getItem('civic_ref_code') } })}
          >
            Continue to Tracker →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-6">
          <a id="email-button" href={mailtoHref} className="btn-primary text-center block no-underline">
            Send by Email
          </a>
          <button id="portal-button" className="btn-ghost" onClick={handlePortal}>
            File on Portal
          </button>
          <button id="file-button" className="btn-secondary" onClick={handleFile} disabled={filing}>
            {filing ? 'Filing…' : 'Save & Track'}
          </button>
        </div>
      )}
    </div>
  )
}
