import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api.js'
import VoiceInput from '../components/VoiceInput.jsx'

export default function Intake() {
  const navigate = useNavigate()

  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  /* ── Photo capture ── */
  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  /* ── GPS ── */
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setError(`Location error: ${err.message}`)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  /* ── Voice transcript callback ── */
  const handleVoiceResult = useCallback((transcript) => {
    setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript))
  }, [])

  /* ── Submit: validate → classify → navigate ── */
  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (photo) formData.append('image', photo)
      formData.append('description', description)
      if (location) {
        formData.append('latitude', location.lat)
        formData.append('longitude', location.lng)
      }

      // Step 1: Validate
      await apiFetch('/validate', { method: 'POST', body: formData })

      // Step 2: Classify
      const classifyData = new FormData()
      if (photo) classifyData.append('image', photo)
      classifyData.append('description', description)
      if (location) {
        classifyData.append('latitude', location.lat)
        classifyData.append('longitude', location.lng)
      }
      const result = await apiFetch('/classify', { method: 'POST', body: classifyData })

      navigate('/result', { state: { classification: result } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-6">Report an Issue</h1>

      {/* Photo */}
      <div className="mb-4">
        <label className="block text-label-bold text-on-surface mb-2">Photo</label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        <label
          htmlFor="photo-input"
          className="card flex items-center justify-center h-40 cursor-pointer border-dashed border-2 border-outline-variant hover:border-primary-container transition-colors"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Issue" className="h-full w-full object-cover rounded-lg" />
          ) : (
            <span className="text-accent-slate text-body-md">Tap to take a photo</span>
          )}
        </label>
      </div>

      {/* Description + Voice */}
      <div className="mb-4">
        <label className="block text-label-bold text-on-surface mb-2">Describe the issue</label>
        <div className="relative">
          <textarea
            id="description-input"
            className="input-field min-h-[120px] resize-none pr-12"
            placeholder="What's the problem? Be specific about location and severity…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="absolute right-2 bottom-2">
            <VoiceInput onResult={handleVoiceResult} />
          </div>
        </div>
      </div>

      {/* GPS */}
      <div className="mb-6">
        <button
          id="gps-button"
          className="btn-ghost flex items-center justify-center gap-2"
          onClick={handleGPS}
          disabled={locating}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {locating ? 'Getting location…' : location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Add GPS location'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-label-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        id="submit-button"
        className="btn-secondary"
        onClick={handleSubmit}
        disabled={submitting || (!photo && !description)}
      >
        {submitting ? 'Analyzing…' : 'Submit Report'}
      </button>
    </div>
  )
}
