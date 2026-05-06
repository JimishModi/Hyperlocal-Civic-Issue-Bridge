import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api.js'

export default function Tracker() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const [code, setCode] = useState(
    state?.reference_code || localStorage.getItem('civic_ref_code') || ''
  )
  const [tracking, setTracking] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionType, setActionType] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  // Auto-search when navigated here with a reference code (e.g. Track Existing)
  useEffect(() => {
    if (state?.reference_code) {
      handleTrack(state.reference_code)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTrack = async (overrideCode) => {
    const searchCode = overrideCode || code
    if (!searchCode?.trim()) return
    setError(null)
    setTracking(true)
    try {
      const result = await apiFetch(`/track/${encodeURIComponent(searchCode.trim())}`)
      setData(result)
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setTracking(false)
    }
  }

  /* ── Escalation eligibility: unresolved + > 15 days ── */
  const showEscalation = data && (data.status === 'awaiting' || data.status === 'escalated') && data.days_since_filed > 15

  const handleLogAction = async () => {
    if (!actionType) return
    setSubmittingAction(true)
    try {
      await apiFetch(`/track/${encodeURIComponent(code.trim())}/action`, {
        method: 'POST',
        body: JSON.stringify({ update_type: actionType, notes: actionNote }),
      })
      setShowActionForm(false)
      setActionType('')
      setActionNote('')
      handleTrack()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleResolve = async () => {
    setResolving(true)
    try {
      await apiFetch(`/track/${encodeURIComponent(code.trim())}/resolve`, { method: 'PATCH' })
      setData(prev => ({ ...prev, status: 'resolved' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-6">Track Complaint</h1>

      {/* Reference code input */}
      <div className="mb-4">
        <label className="block text-label-bold text-on-surface mb-2">Reference Code</label>
        <input
          id="ref-code-input"
          className="input-field"
          placeholder="e.g. A3X7F2K9"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      <button
        id="track-button"
        className="btn-primary mb-6"
        onClick={handleTrack}
        disabled={tracking || !code.trim()}
      >
        {tracking ? 'Tracking…' : 'Track'}
      </button>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-label-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="page-enter">
          <div className="card-elevated mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-bold">Status</span>
              <span className={data.status === 'resolved' ? 'chip-success' : data.status === 'escalated' ? 'chip-warning' : 'chip-info'}>
                {data.status}
              </span>
            </div>
            <div className="space-y-2 text-body-md">
              <p><span className="text-accent-slate">Category:</span> {data.category}</p>
              <p><span className="text-accent-slate">Department:</span> {data.department}</p>
              <p><span className="text-accent-slate">Filed:</span> {data.date_filed}</p>
            </div>
          </div>

          {data.status !== 'resolved' && (
            <button
              className="btn-ghost text-sm text-accent-green border border-accent-green mt-3 py-1.5"
              onClick={handleResolve}
              disabled={resolving}
            >
              {resolving ? 'Marking…' : '✓ Mark as Resolved'}
            </button>
          )}

          {/* Action log */}
          {data.updates?.length > 0 && (
            <div className="card mt-4 mb-0">
              <p className="text-label-bold mb-2">Action Log</p>
              <ul className="space-y-2">
                {data.updates.map((u, i) => (
                  <li key={i} className="text-label-sm flex gap-2">
                    <span className="text-accent-slate shrink-0">{u.date}</span>
                    <span>{u.type === 'bmc_responded' ? '✅ BMC responded & acted'
                      : u.type === 'bmc_partial' ? '⚠️ BMC responded, no action'
                      : u.type === 'no_response' ? '❌ No response'
                      : u.type === 'resolved' ? '✅ Resolved'
                      : '📝 Note'}{u.notes ? ` — ${u.notes}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Log action form */}
          {showActionForm ? (
            <div className="mt-4 p-3 bg-surface-container rounded-xl space-y-3">
              <p className="text-label-bold">Log an Update</p>
              <select className="input-field" value={actionType} onChange={e => setActionType(e.target.value)}>
                <option value="">Select what happened…</option>
                <option value="bmc_responded">✅ BMC responded and took action</option>
                <option value="bmc_partial">⚠️ BMC responded but no action taken</option>
                <option value="no_response">❌ No response from BMC</option>
                <option value="resolved">✅ Issue is now resolved</option>
                <option value="note">📝 Add a note</option>
              </select>
              <textarea
                className="input-field min-h-[80px] resize-none"
                placeholder="Additional details (optional)"
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-secondary text-sm py-1.5" disabled={!actionType || submittingAction} onClick={handleLogAction}>
                  {submittingAction ? 'Saving…' : 'Save Update'}
                </button>
                <button className="btn-ghost text-sm py-1.5" onClick={() => setShowActionForm(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            data.status !== 'resolved' && (
              <button className="btn-ghost text-sm py-1.5 mt-3" onClick={() => setShowActionForm(true)}>
                + Log Action / Update
              </button>
            )
          )}

          {data.escalations?.length > 0 && (
            <div className="card mb-4">
              <p className="text-label-bold mb-2">Escalation History</p>
              <ul className="space-y-1 text-label-sm text-accent-slate">
                {data.escalations.map((esc, i) => (
                  <li key={i}>• {esc.type} — {esc.date}</li>
                ))}
              </ul>
            </div>
          )}

          {showEscalation && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
              <p className="text-label-bold text-amber-900 mb-2">
                {data.status === 'escalated'
                  ? `⚠️ Escalation filed ${data.days_since_filed} days ago — still unresolved. Consider the next escalation step.`
                  : `⚠️ This complaint has been pending for ${data.days_since_filed} days with no response from BMC.`
                }
              </p>
              <button
                id="escalate-button"
                className="btn-primary bg-accent-amber text-white"
                onClick={() => navigate('/escalation', { state: { tracking: data, reference_code: code } })}
              >
                Escalate Now
              </button>
            </div>
          )}

          <button
            className="btn-secondary w-full"
            onClick={() => navigate('/intake')}
          >
            + File Another Complaint
          </button>
        </div>
      )}
    </div>
  )
}
