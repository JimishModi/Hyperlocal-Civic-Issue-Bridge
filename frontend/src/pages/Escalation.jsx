import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api.js'
import DraftEditor from '../components/DraftEditor.jsx'

const ESCALATION_TYPES = [
  {
    id: 'followup',
    label: 'Follow-up Letter',
    description: 'Formal reminder to the department — must respond in 7 days',
    badge: 'Step 1',
    badgeColor: 'chip-info',
  },
  {
    id: 'rti',
    label: 'RTI Application',
    description: 'Right to Information — legally compels disclosure within 30 days',
    badge: 'Step 2',
    badgeColor: 'chip-warning',
  },
  {
    id: 'cpgrams',
    label: 'CPGRAMS — Central Government',
    description: 'Escalate to Government of India grievance portal (pgportal.gov.in)',
    badge: 'Step 3',
    badgeColor: 'chip-error',
  },
]

export default function Escalation() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const [selectedType, setSelectedType] = useState(null)
  const [draft, setDraft] = useState(null)
  const [draftBody, setDraftBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!state?.tracking) {
    return (
      <div className="page page-enter text-center py-20">
        <p className="text-body-md text-accent-slate">No tracking data. Please track a complaint first.</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/tracker')}>Go to Tracker</button>
      </div>
    )
  }

  const handleGenerate = async (type) => {
    setSelectedType(type)
    setError(null)
    setLoading(true)
    try {
      const result = await apiFetch('/escalate', {
        method: 'POST',
        body: JSON.stringify({
          reference_code: state.reference_code,
          type: type,
          category: state.tracking.category,
          department: state.tracking.department,
        }),
      })
      setDraft(result)
      setDraftBody(result.body || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const mailtoHref = draft
    ? `mailto:${draft.email || ''}?subject=${encodeURIComponent(draft.subject || 'Escalation')}&body=${encodeURIComponent(draftBody)}`
    : '#'

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-2">Escalate Complaint</h1>
      <p className="text-body-md text-accent-slate mb-6">
        Choose how you'd like to escalate this issue.
      </p>

      {/* Type picker */}
      {!draft && (
        <div className="space-y-3 mb-6">
          {ESCALATION_TYPES.map((t) => (
            <button
              key={t.id}
              id={`escalation-${t.id}`}
              className={`card w-full text-left transition-all duration-200 ${
                selectedType === t.id ? 'border-primary-container ring-1 ring-primary-container' : ''
              }`}
              onClick={() => handleGenerate(t.id)}
              disabled={loading}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-label-bold text-on-surface">{t.label}</p>
                <span className={t.badgeColor}>{t.badge}</span>
              </div>
              <p className="text-label-sm text-accent-slate">{t.description}</p>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-3 border-primary-container border-t-transparent rounded-full animate-spin" />
          <p className="text-body-md text-accent-slate mt-3">Generating escalation draft…</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-label-sm">
          {error}
        </div>
      )}

      {draft && !loading && (
        <>
          <DraftEditor value={draftBody} onChange={setDraftBody} />

          {draft.filing_steps && draft.filing_steps.length > 0 && (
            <div className="card mt-4 mb-4">
              <p className="text-label-bold text-on-surface mb-3">How to File</p>
              <ol className="space-y-2">
                {draft.filing_steps.map((step, i) =>
                  step === '---'
                    ? <li key={i} className="border-t border-outline-variant my-3" />
                    : <li key={i} className="flex gap-2 text-label-sm text-on-surface">
                        <span className="text-accent-green font-bold shrink-0">{i + 1}.</span>
                        <span>{step.replace(/^Method [AB][^:]*:\s*/, '')}</span>
                      </li>
                )}
              </ol>
            </div>
          )}

          {draft.process_breakdown && (
            <div className="card mb-4">
              <p className="text-label-bold text-on-surface mb-2">What to Expect</p>
              <div className="space-y-2 text-label-sm">
                <p><span className="text-accent-slate">What: </span>{draft.process_breakdown.what}</p>
                <p><span className="text-accent-slate">Where: </span>{draft.process_breakdown.where}</p>
                <p><span className="text-accent-slate">Response: </span>{draft.process_breakdown.expected_response}</p>
                {draft.process_breakdown.next_step && (
                  <p className="text-accent-amber font-medium">
                    Next: {draft.process_breakdown.next_step}
                  </p>
                )}
                {draft.process_breakdown.after_cpgrams && (
                  <p className="text-accent-amber font-medium">
                    After CPGRAMS: {draft.process_breakdown.after_cpgrams}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-6">
            <a href={mailtoHref} className="btn-primary text-center block no-underline">
              Send by Email
            </a>
            {draft.portal_url && (
              <button
                className="btn-ghost"
                onClick={() => window.open(draft.portal_url, '_blank', 'noopener')}
              >
                File on Portal
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/tracker')}>
              ← Back to Tracker
            </button>
          </div>
        </>
      )}
    </div>
  )
}
