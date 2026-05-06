import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../config/api.js'

export default function Tracker() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [code, setCode] = useState(
    state?.reference_code || localStorage.getItem('civic_ref_code') || ''
  )
  const [tracking, setTracking] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [resolving, setResolving] = useState(false)

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
      <button
        className="btn-ghost mb-4 flex items-center gap-1 text-label-sm"
        onClick={() => navigate('/')}
      >
        {t('tracker.home')}
      </button>

      <h1 className="text-h2 text-primary-container mb-6">{t('tracker.title')}</h1>

      {/* Reference code input */}
      <div className="mb-4">
        <label className="block text-label-bold text-on-surface mb-2">{t('tracker.refCodeLabel')}</label>
        <input
          id="ref-code-input"
          className="input-field"
          placeholder={t('tracker.refCodePlaceholder')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      <button
        id="track-button"
        className="btn-primary mb-6"
        onClick={() => handleTrack()}
        disabled={tracking || !code.trim()}
      >
        {tracking ? t('tracker.tracking') : t('tracker.track')}
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
              <span className="text-label-bold">{t('tracker.status')}</span>
              <span className={data.status === 'resolved' ? 'chip-success' : data.status === 'escalated' ? 'chip-warning' : 'chip-info'}>
                {t(`status.${data.status}`, data.status)}
              </span>
            </div>
            <div className="space-y-2 text-body-md">
              <p><span className="text-accent-slate">{t('tracker.categoryLabel')}</span> {data.category}</p>
              <p><span className="text-accent-slate">{t('tracker.departmentLabel')}</span> {data.department}</p>
              <p><span className="text-accent-slate">{t('tracker.filedLabel')}</span> {data.date_filed}</p>
            </div>
          </div>

          {data.status !== 'resolved' && (
            <button
              className="btn-ghost text-sm text-accent-green border border-accent-green mt-3 py-1.5"
              onClick={handleResolve}
              disabled={resolving}
            >
              {resolving ? t('tracker.marking') : t('tracker.markResolved')}
            </button>
          )}

          {data.escalations?.length > 0 && (
            <div className="card mb-4">
              <p className="text-label-bold mb-2">{t('tracker.escalationHistory')}</p>
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
                  ? t('tracker.escalatedWarning', { days: data.days_since_filed })
                  : t('tracker.pendingWarning', { days: data.days_since_filed })
                }
              </p>
              <button
                id="escalate-button"
                className="btn-primary bg-accent-amber text-white"
                onClick={() => navigate('/escalation', { state: { tracking: data, reference_code: code } })}
              >
                {t('tracker.escalateNow')}
              </button>
            </div>
          )}

          <button
            className="btn-secondary w-full"
            onClick={() => navigate('/intake')}
          >
            {t('tracker.fileAnother')}
          </button>
        </div>
      )}
    </div>
  )
}
