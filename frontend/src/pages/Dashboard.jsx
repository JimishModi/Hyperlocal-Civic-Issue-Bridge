import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../config/supabase'
import { apiFetch } from '../config/api.js'

const STATUS_CHIP = {
  resolved: 'chip-success',
  escalated: 'chip-warning',
  awaiting: 'chip-info',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [logging, setLogging] = useState(null) // reference_code being logged
  const [actionType, setActionType] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u?.email) fetchComplaints(u.email)
      else { setLoading(false) }
    })
  }, [])

  const fetchComplaints = async (email) => {
    setLoading(true)
    try {
      const data = await apiFetch(`/my-complaints?email=${encodeURIComponent(email)}`)
      setComplaints(data.complaints || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogAction = async (code) => {
    if (!actionType) return
    setSubmitting(true)
    try {
      await apiFetch(`/track/${code}/action`, {
        method: 'POST',
        body: JSON.stringify({ update_type: actionType, notes: actionNote }),
      })
      setLogging(null)
      setActionType('')
      setActionNote('')
      fetchComplaints(user.email)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user && !loading) {
    return (
      <div className="page page-enter text-center py-20">
        <p className="text-body-md text-accent-slate mb-4">{t('dashboard.signInPrompt')}</p>
        <button className="btn-primary" onClick={() => navigate('/auth')}>{t('dashboard.signIn')}</button>
      </div>
    )
  }

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-1">{t('dashboard.title')}</h1>
      <p className="text-label-sm text-accent-slate mb-6">{user?.email}</p>

      {loading && (
        <div className="text-center py-10 text-accent-slate text-label-sm">{t('dashboard.loading')}</div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-label-sm">{error}</div>
      )}

      {!loading && complaints.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-body-md text-accent-slate mb-4">{t('dashboard.noComplaints')}</p>
          <button className="btn-primary" onClick={() => navigate('/intake')}>{t('dashboard.reportIssue')}</button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {complaints.map((c) => (
          <div key={c.reference_code} className="card-elevated">
            {/* Header row */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpanded(expanded === c.reference_code ? null : c.reference_code)}
            >
              <div>
                <p className="text-label-bold text-on-surface">{c.category}</p>
                <p className="text-label-sm text-accent-slate">{c.date_filed} · {c.reference_code}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={STATUS_CHIP[c.status] || 'chip-info'}>{t(`status.${c.status}`, c.status)}</span>
                <span className="text-accent-slate text-sm">{expanded === c.reference_code ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === c.reference_code && (
              <div className="mt-4 border-t border-outline-variant pt-4 space-y-3">
                <p className="text-label-sm text-accent-slate">{c.description}</p>
                <p className="text-label-sm"><span className="text-accent-slate">{t('dashboard.departmentLabel')}</span> {c.department}</p>
                <p className="text-label-sm"><span className="text-accent-slate">{t('dashboard.emailSentLabel')}</span> {c.email_sent ? t('dashboard.yes') : t('dashboard.no')}</p>

                {/* Action log */}
                {c.updates.length > 0 && (
                  <div className="mt-3">
                    <p className="text-label-bold mb-2">{t('dashboard.actionLog')}</p>
                    <ul className="space-y-2">
                      {c.updates.map((u, i) => (
                        <li key={i} className="flex items-start gap-2 text-label-sm">
                          <span className="text-accent-slate shrink-0">{u.date}</span>
                          <span>{t(`updateLabels.${u.type}`, u.type)}{u.notes ? ` — ${u.notes}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Log action form */}
                {logging === c.reference_code ? (
                  <div className="mt-3 p-3 bg-surface-container rounded-xl space-y-3">
                    <p className="text-label-bold">{t('dashboard.logUpdate')}</p>
                    <select
                      className="input-field"
                      value={actionType}
                      onChange={e => setActionType(e.target.value)}
                    >
                      <option value="">{t('dashboard.selectAction')}</option>
                      <option value="bmc_responded">{t('dashboard.bmcResponded')}</option>
                      <option value="bmc_partial">{t('dashboard.bmcPartial')}</option>
                      <option value="no_response">{t('dashboard.noResponse')}</option>
                      <option value="resolved">{t('dashboard.issueResolved')}</option>
                      <option value="note">{t('dashboard.addNote')}</option>
                    </select>
                    <textarea
                      className="input-field min-h-[80px] resize-none"
                      placeholder={t('dashboard.additionalDetails')}
                      value={actionNote}
                      onChange={e => setActionNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn-secondary text-sm py-1.5"
                        disabled={!actionType || submitting}
                        onClick={() => handleLogAction(c.reference_code)}
                      >
                        {submitting ? t('dashboard.savingUpdate') : t('dashboard.saveUpdate')}
                      </button>
                      <button className="btn-ghost text-sm py-1.5" onClick={() => setLogging(null)}>
                        {t('dashboard.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      className="btn-ghost text-sm py-1.5"
                      onClick={() => { setLogging(c.reference_code); setActionType(''); setActionNote('') }}
                    >
                      {t('dashboard.logAction')}
                    </button>
                    <button
                      className="btn-ghost text-sm py-1.5"
                      onClick={() => navigate('/tracker', { state: { reference_code: c.reference_code } })}
                    >
                      {t('dashboard.fullTracker')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {complaints.length > 0 && (
        <button className="btn-secondary w-full mt-6" onClick={() => navigate('/intake')}>
          {t('dashboard.reportAnother')}
        </button>
      )}
    </div>
  )
}
