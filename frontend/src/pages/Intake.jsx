import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api.js'
import VoiceInput from '../components/VoiceInput.jsx'

const MAX_PHOTOS = 5

/* ── Multi-photo capture component ── */
function MultiPhotoCapture({ onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [camError, setCamError] = useState(null)
  const [photos, setPhotos] = useState([]) // [{file, url}]

  const notify = (updated) => onCapture(updated.map(p => p.file))

  const startCamera = async () => {
    if (photos.length >= 5) return;
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOpen(true)
    } catch {
      setCamError('Camera access denied. Use the file picker instead.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  const snap = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], `issue-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      setPhotos(prev => {
        const updated = [...prev, { file, url }]
        notify(updated)
        return updated
      })
      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  useEffect(() => () => stopCamera(), [])

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newEntries = files.slice(0, MAX_PHOTOS - photos.length).map(file => ({
      file,
      url: URL.createObjectURL(file),
    }))
    setPhotos(prev => {
      const updated = [...prev, ...newEntries]
      notify(updated)
      return updated
    })
    e.target.value = ''
  }

  const removePhoto = (idx) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].url)
      const updated = prev.filter((_, i) => i !== idx)
      notify(updated)
      return updated
    })
  }

  const canAdd = photos.length < MAX_PHOTOS

  return (
    <div className="mb-4">
      <label className="block text-label-bold text-on-surface mb-2">
        Photos <span className="text-accent-slate font-normal text-xs ml-1">({photos.length}/{MAX_PHOTOS})</span>
      </label>

      {/* Camera viewfinder */}
      {cameraOpen && (
        <div className="relative rounded-xl overflow-hidden bg-black h-64 mb-3">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <button
            type="button"
            onClick={snap}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-4 border-primary-container shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            title="Take photo"
          >
            <div className="w-10 h-10 rounded-full bg-primary-container" />
          </button>
          <button
            type="button"
            onClick={stopCamera}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white text-sm"
          >✕</button>
        </div>
      )}

      {/* Thumbnails grid */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((p, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-outline-variant">
              <img src={p.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white text-xs hover:bg-black/80"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add photo controls */}
      {canAdd && !cameraOpen && (
        <div className={`card flex flex-col items-center justify-center gap-3 border-dashed border-2 border-outline-variant ${photos.length === 0 ? 'h-44' : 'h-28'}`}>
          <div className="flex gap-3">
            <button
              type="button"
              id="open-camera-btn"
              onClick={startCamera}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Camera
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-ghost text-sm px-4 py-2"
            >
              Gallery
            </button>
          </div>
          {photos.length === 0 && <p className="text-accent-slate text-xs">Add up to {MAX_PHOTOS} photos</p>}
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
          {camError && <p className="text-xs text-error-container text-center px-4">{camError}</p>}
        </div>
      )}
    </div>
  )
}

/* ── Main Intake page ── */
export default function Intake() {
  const navigate = useNavigate()

  const [photos, setPhotos] = useState([])
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [duplicate, setDuplicate] = useState(null)
  const [pendingResult, setPendingResult] = useState(null)

  const handleCapture = useCallback((files) => {
    setPhotos(files)
  }, [])

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
      photos.forEach(p => formData.append('images', p))
      formData.append('description', description)
      if (location) {
        formData.append('latitude', location.lat)
        formData.append('longitude', location.lng)
      }

      // Step 1: Validate
      await apiFetch('/validate', { method: 'POST', body: formData })

      // Step 2: Classify
      const classifyData = new FormData()
      photos.forEach(p => classifyData.append('images', p))
      classifyData.append('description', description)
      if (location) {
        classifyData.append('latitude', location.lat)
        classifyData.append('longitude', location.lng)
      }
      const result = await apiFetch('/classify', { method: 'POST', body: classifyData })

      if (result.duplicate) {
        setDuplicate(result.duplicate)
        setPendingResult(result)
        return
      }
      navigate('/result', { state: { classification: result, coords: location } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page-enter">
      <h1 className="text-h2 text-primary-container mb-6">Report an Issue</h1>

      {/* Camera / Photos */}
      <MultiPhotoCapture onCapture={handleCapture} />

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

      {/* Duplicate warning */}
      {duplicate && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-label-bold text-amber-900 mb-1">Already Reported</p>
          <p className="text-label-sm text-amber-800 mb-3">
            A similar issue near this location was already filed (Ref: <strong>{duplicate.reference_code}</strong>) and is currently <strong>{duplicate.status}</strong>. Filing a duplicate won't speed things up.
          </p>
          <div className="flex gap-2">
            <button
              className="btn-ghost text-sm py-1.5"
              onClick={() => navigate('/tracker', { state: { reference_code: duplicate.reference_code } })}
            >
              Track Existing
            </button>
            <button
              className="btn-secondary text-sm py-1.5"
              onClick={() => navigate('/result', { state: { classification: pendingResult, coords: location } })}
            >
              File Anyway
            </button>
          </div>
        </div>
      )}

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
        disabled={submitting || (!photos.length && !description)}
      >
        {submitting ? 'Analyzing…' : 'Submit Report'}
      </button>
    </div>
  )
}
