import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../config/api.js'
import VoiceInput from '../components/VoiceInput.jsx'

/* ── Inline camera component ── */
function CameraCapture({ onCapture }) {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)
  const [mode, setMode] = useState('idle')
  const [preview, setPreview] = useState(null)
  const [camError, setCamError] = useState(null)

  const startCamera = async () => {
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setMode('live')
    } catch {
      setCamError(t('intake.cameraError'))
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const snap = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], 'issue-photo.jpg', { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      setPreview(url)
      onCapture(file)
      stopCamera()
      setMode('preview')
    }, 'image/jpeg', 0.92)
  }

  const retake = () => {
    setPreview(null)
    onCapture(null)
    startCamera()
  }

  useEffect(() => () => stopCamera(), [])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    onCapture(file)
    setMode('preview')
  }

  return (
    <div className="mb-4">
      <label className="block text-label-bold text-on-surface mb-2">{t('intake.photoLabel')}</label>

      {mode === 'idle' && (
        <div className="card flex flex-col items-center justify-center gap-3 h-44 border-dashed border-2 border-outline-variant">
          <button
            type="button"
            id="open-camera-btn"
            onClick={startCamera}
            className="btn-secondary flex items-center gap-2 px-5 py-2 text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('intake.openCamera')}
          </button>
          <span className="text-accent-slate text-xs">{t('intake.or')}</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-ghost text-sm px-4 py-1"
          >
            {t('intake.chooseGallery')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          {camError && (
            <p className="text-xs text-error-container mt-1 text-center px-4">{camError}</p>
          )}
        </div>
      )}

      {mode === 'live' && (
        <div className="relative rounded-xl overflow-hidden bg-black h-64">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <button
            type="button"
            id="snap-btn"
            onClick={snap}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-4 border-primary-container shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            title="Take photo"
          >
            <div className="w-10 h-10 rounded-full bg-primary-container" />
          </button>
          <button
            type="button"
            onClick={() => { stopCamera(); setMode('idle') }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white text-sm"
          >✕</button>
        </div>
      )}

      {mode === 'preview' && preview && (
        <div className="relative rounded-xl overflow-hidden h-64">
          <img src={preview} alt="Captured issue" className="w-full h-full object-cover" />
          <button
            type="button"
            id="retake-btn"
            onClick={retake}
            className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-black/80 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('intake.retake')}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Main Intake page ── */
export default function Intake() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [photo, setPhoto] = useState(null)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleCapture = useCallback((file) => {
    setPhoto(file)
  }, [])

  /* ── GPS ── */
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setError(t('intake.geoNotSupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setError(t('intake.locationError', { message: err.message }))
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

      navigate('/result', { state: { classification: result, coords: location } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-6">{t('intake.title')}</h1>

      {/* Camera / Photo */}
      <CameraCapture onCapture={handleCapture} />

      {/* Description + Voice */}
      <div className="mb-4">
        <label className="block text-label-bold text-on-surface mb-2">{t('intake.describeLabel')}</label>
        <div className="relative">
          <textarea
            id="description-input"
            className="input-field min-h-[120px] resize-none pr-12"
            placeholder={t('intake.descPlaceholder')}
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
          {locating ? t('intake.gettingLocation') : location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : t('intake.addGps')}
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
        {submitting ? t('intake.analyzing') : t('intake.submit')}
      </button>
    </div>
  )
}
