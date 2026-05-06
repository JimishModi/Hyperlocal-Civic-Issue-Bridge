import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api.js'
import DraftEditor from '../components/DraftEditor.jsx'

export default function Draft() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const draft = state?.draft
  const coords = state?.coords
  const [body, setBody] = useState(draft?.body || '')
  const [filing, setFiling] = useState(false)
  const [error, setError] = useState(null)
  const [duplicateRef, setDuplicateRef] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [breakdown, setBreakdown] = useState(null)
  const [emailClicked, setEmailClicked] = useState(false)
  const [portalClicked, setPortalClicked] = useState(false)

  if (!draft) {
    return (
      <div className="page page-enter text-center py-20">
        <p className="text-body-md text-accent-slate">No draft data. Please start from the intake page.</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/intake')}>Go to Intake</button>
      </div>
    )
  }

  const hasFiled = emailClicked || portalClicked

  /* ── mailto link (opens user's email client) ── */
  const mailtoHref = `mailto:${draft.email || ''}?subject=${encodeURIComponent(draft.subject || 'Civic Complaint')}&body=${encodeURIComponent(body)}`

  const handleEmailClick = () => setEmailClicked(true)

  /* ── File on portal ── */
  const handlePortal = () => {
    if (draft.portal_url) {
      window.open(draft.portal_url, '_blank', 'noopener')
      setPortalClicked(true)
    }
  }

  /* ── Save & Track ── */
  const handleFile = async (force = false) => {
    setError(null)

    if (!userEmail.trim()) {
      setError('Please enter your email — it\'s required to send you a copy and 14-day reminder.')
      return
    }

    setFiling(true)

    const filingMethod =
      emailClicked && portalClicked ? 'both'
      : emailClicked ? 'email'
      : portalClicked ? 'portal'
      : 'direct'

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
          image_urls: draft.image_urls ?? [],
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          force,
          filing_method: filingMethod,
        }),
      })
      const code = result.reference_code
      localStorage.setItem('civic_ref_code', code)
      setBreakdown(result.process_breakdown)
    } catch (err) {
      if (err.message?.startsWith('DUPLICATE:')) {
        setDuplicateRef(err.message.split(':')[1])
      } else {
        setError(err.message)
      }
    } finally {
      setFiling(false)
    }
  }

  /* ── Post-filing success view ── */
  if (breakdown) {
    return (
      <div className="page page-enter">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-accent-green flex items-center justify-center text-white text-lg">✓</div>
          <h1 className="text-h2 text-primary-container">Complaint Filed!</h1>
        </div>

        <div className="card-elevated mb-4">
          <p className="text-label-bold text-on-surface mb-4">Process Breakdown</p>
          <div className="flex flex-col gap-4 mb-6">
            {Object.values(breakdown).map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs ${step.done ? 'bg-accent-green text-white' : 'bg-surface-container text-accent-slate'}`}>
                  {step.done ? '✓' : (idx + 1)}
                </div>
                <div>
                  <p className="text-label-bold text-on-surface">{step.title}</p>
                  <p className="text-label-sm text-accent-slate">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 text-center mb-4">
            <p className="text-label-sm text-accent-slate mb-0.5">Your reference code</p>
            <p className="text-label-bold text-lg tracking-widest">{localStorage.getItem('civic_ref_code')}</p>
          </div>
          <button
            className="btn-secondary w-full"
            onClick={() => navigate('/tracker', { state: { reference_code: localStorage.getItem('civic_ref_code') } })}
          >
            Continue to Tracker →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-2">Your Complaint Draft</h1>

      {/* Department info */}
      <div className="card mb-4">
        <p className="text-label-bold text-on-surface mb-1">Department</p>
        <p className="text-body-md text-accent-slate mb-3">{draft.department || '—'}</p>
        <p className="text-label-bold text-on-surface mb-1">Email</p>
        <p className="text-body-md text-accent-slate">{draft.email || '—'}</p>
      </div>

      {/* Editable draft */}
      <DraftEditor value={body} onChange={setBody} />

      {/* Duplicate warning */}
      {duplicateRef && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-label-bold text-amber-900 mb-1">Already Reported</p>
          <p className="text-label-sm text-amber-800 mb-3">
            This issue is already filed (Ref: <strong>{duplicateRef}</strong>). Filing again won't speed things up — but you can if your issue is different.
          </p>
          <div className="flex gap-2">
            <button
              className="btn-ghost text-sm py-1.5"
              onClick={() => navigate('/tracker', { state: { reference_code: duplicateRef } })}
            >
              Track Existing →
            </button>
            <button
              className="btn-secondary text-sm py-1.5"
              disabled={filing}
              onClick={() => { setDuplicateRef(null); handleFile(true) }}
            >
              File Anyway
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-label-sm">
          {error}
        </div>
      )}

      {/* Your email — required */}
      <div className="mb-6">
        <label className="block text-label-bold text-on-surface mb-2">
          Your Email <span className="text-error text-xs ml-1">*required</span>
        </label>
        <input
          className="input-field"
          type="email"
          placeholder="you@example.com"
          required
          value={userEmail}
          onChange={e => setUserEmail(e.target.value)}
        />
      </div>

      {/* Filing options */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Send by Email */}
        {emailClicked ? (
          <div className="px-4 py-3 rounded-xl bg-accent-green/10 border border-accent-green text-accent-green text-center font-semibold select-none">
            ✓ Email Sent
          </div>
        ) : (
          <a
            id="email-button"
            href={mailtoHref}
            onClick={handleEmailClick}
            className="btn-primary text-center block no-underline"
          >
            Send by Email
          </a>
        )}

        {/* File on Portal */}
        <button
          id="portal-button"
          className={`w-full px-4 py-3 rounded-xl font-semibold transition-all ${
            portalClicked
              ? 'bg-accent-green/10 border border-accent-green text-accent-green'
              : 'btn-ghost'
          }`}
          onClick={handlePortal}
        >
          {portalClicked ? 'BMC Portal Opened' : 'File on BMC Portal'}
        </button>
        {portalClicked && (
          <p className="text-label-sm text-accent-slate -mt-1 text-center">
            Paste your complaint into the BMC grievance portal.
          </p>
        )}
      </div>

      {/* Save & Track — only active after at least one filing method used */}
      <div className={`rounded-xl p-4 transition-all ${hasFiled ? 'bg-surface-container' : 'bg-surface-container-low opacity-60'}`}>
        <p className="text-label-bold text-on-surface mb-0.5">Save & Track</p>
        <p className="text-label-sm text-accent-slate mb-3">
          {hasFiled
            ? `Get a reference code and 14-day follow-up reminder${userEmail ? '' : ' — add your email above for a copy'}.`
            : 'File by email or portal first to enable tracking.'}
        </p>
        <button
          id="file-button"
          className="btn-secondary w-full"
          onClick={() => handleFile()}
          disabled={filing || !hasFiled}
        >
          {filing ? 'Saving…' : 'Save & Track'}
        </button>
      </div>
    </div>
  )
}
