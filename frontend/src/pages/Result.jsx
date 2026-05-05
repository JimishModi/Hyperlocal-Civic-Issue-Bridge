import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api.js'

const CATEGORIES = [
  'Road & Footpath',
  'Water Supply',
  'Drainage & Sewage',
  'Garbage & Sanitation',
  'Street Lighting',
  'Illegal Construction',
  'Noise Pollution',
  'Tree Fall / Pruning',
  'Public Health',
  'Other',
]

export default function Result() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const classification = state?.classification
  const [category, setCategory] = useState(classification?.category || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!classification) {
    return (
      <div className="page page-enter text-center py-20">
        <p className="text-body-md text-accent-slate">No classification data. Please start from the intake page.</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/intake')}>Go to Intake</button>
      </div>
    )
  }

  const handleConfirm = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const draftResult = await apiFetch('/draft', {
        method: 'POST',
        body: JSON.stringify({
          category,
          department: classification.department,
          description: classification.description,
          location: classification.location,
          image_url: classification.image_url,
        }),
      })
      navigate('/draft', { state: { draft: draftResult } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-6">Classification Result</h1>

      <div className="card-elevated mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-label-bold text-on-surface">Category</span>
          <span className="chip-info">{Math.round((classification.confidence || 0) * 100)}% confidence</span>
        </div>
        <select
          id="category-select"
          className="input-field"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="card mb-6">
        <p className="text-label-bold text-on-surface mb-1">Department</p>
        <p className="text-body-md text-accent-slate">{classification.department || '—'}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-label-sm">
          {error}
        </div>
      )}

      <button
        id="confirm-button"
        className="btn-secondary mb-3"
        onClick={handleConfirm}
        disabled={submitting}
      >
        {submitting ? 'Generating draft…' : 'Looks right — Generate Draft'}
      </button>

      <button className="btn-ghost" onClick={() => navigate('/intake')}>
        ← Re-submit
      </button>
    </div>
  )
}
