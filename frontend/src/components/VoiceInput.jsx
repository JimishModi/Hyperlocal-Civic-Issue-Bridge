import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Mic button that uses the Web Speech API (SpeechRecognition).
 * Appends recognised transcript to parent via `onResult(transcript)`.
 * No external libraries needed.
 */
export default function VoiceInput({ onResult }) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-IN'

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) onResult(transcript)
    }

    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [onResult])

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }, [listening])

  if (!supported) return null

  return (
    <button
      id="voice-button"
      type="button"
      onClick={toggle}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
        listening
          ? 'bg-error text-white pulse-recording'
          : 'bg-surface-container-high text-accent-slate hover:bg-surface-container-highest'
      }`}
      title={listening ? 'Stop recording' : 'Speak your description'}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
      </svg>
    </button>
  )
}
