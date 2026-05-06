import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../config/api.js'
import DraftEditor from '../components/DraftEditor.jsx'

export default function Escalation() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const ESCALATION_TYPES = [
    {
      id: 'followup',
      label: t('escalation.followup'),
      description: t('escalation.followupDesc'),
      badge: t('escalation.step', { n: 1 }),
      badgeColor: 'chip-info',
    },
    {
      id: 'rti',
      label: t('escalation.rti'),
      description: t('escalation.rtiDesc'),
      badge: t('escalation.step', { n: 2 }),
      badgeColor: 'chip-warning',
    },
    {
      id: 'cpgrams',
      label: t('escalation.cpgrams'),
      description: t('escalation.cpgramsDesc'),
      badge: t('escalation.step', { n: 3 }),
      badgeColor: 'chip-error',
    },
  ]

  const [selectedType, setSelectedType] = useState(null)
  const [draft, setDraft] = useState(null)
  const [draftBody, setDraftBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!state?.tracking) {
    return (
      <div className="page page-enter text-center py-20">
        <p className="text-body-md text-accent-slate">{t('escalation.noData')}</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/tracker')}>{t('escalation.goTracker')}</button>
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
      <h1 className="text-h2 text-primary-container mb-2">{t('escalation.title')}</h1>
      <p className="text-body-md text-accent-slate mb-6">
        {t('escalation.subtitle')}
      </p>

      {/* Type picker */}
      {!draft && (
        <div className="space-y-3 mb-6">
          {ESCALATION_TYPES.map((tp) => (
            <button
              key={tp.id}
              id={`escalation-${tp.id}`}
              className={`card w-full text-left transition-all duration-200 ${
                selectedType === tp.id ? 'border-primary-container ring-1 ring-primary-container' : ''
              }`}
              onClick={() => handleGenerate(tp.id)}
              disabled={loading}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-label-bold text-on-surface">{tp.label}</p>
                <span className={tp.badgeColor}>{tp.badge}</span>
              </div>
              <p className="text-label-sm text-accent-slate">{tp.description}</p>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-3 border-primary-container border-t-transparent rounded-full animate-spin" />
          <p className="text-body-md text-accent-slate mt-3">{t('escalation.generatingDraft')}</p>
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
              <p className="text-label-bold text-on-surface mb-3">{t('escalation.howToFile')}</p>
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
              <p className="text-label-bold text-on-surface mb-2">{t('escalation.whatToExpect')}</p>
              <div className="space-y-2 text-label-sm">
                <p><span className="text-accent-slate">{t('escalation.whatLabel')}</span>{draft.process_breakdown.what}</p>
                <p><span className="text-accent-slate">{t('escalation.whereLabel')}</span>{draft.process_breakdown.where}</p>
                <p><span className="text-accent-slate">{t('escalation.responseLabel')}</span>{draft.process_breakdown.expected_response}</p>
                {draft.process_breakdown.next_step && (
                  <p className="text-accent-amber font-medium">
                    {t('escalation.nextLabel')}{draft.process_breakdown.next_step}
                  </p>
                )}
                {draft.process_breakdown.after_cpgrams && (
                  <p className="text-accent-amber font-medium">
                    {t('escalation.afterCpgrams')}{draft.process_breakdown.after_cpgrams}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-6">
            <a href={mailtoHref} className="btn-primary text-center block no-underline">
              {t('escalation.sendByEmail')}
            </a>
            {draft.portal_url && (
              <button
                className="btn-ghost"
                onClick={() => window.open(draft.portal_url, '_blank', 'noopener')}
              >
                {t('escalation.fileOnPortal')}
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/tracker')}>
              {t('escalation.backTracker')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
