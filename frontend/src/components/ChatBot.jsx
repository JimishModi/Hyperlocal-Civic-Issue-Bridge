import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../config/api.js'

/**
 * Floating chatbot widget.
 * Visible on all pages except Landing.
 * POST /chat with the conversation history.
 */
export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    const userMsg = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setSending(true)

    try {
      const res = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: updatedMessages }),
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* ── Floating action button ── */}
      {!open && (
        <button
          id="chat-fab"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent-green text-white shadow-elevated flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 z-50"
          aria-label="Open chat"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 max-w-app mx-auto z-50 chat-panel-enter">
          <div className="bg-surface-container-lowest rounded-t-2xl shadow-chat border border-outline-variant flex flex-col" style={{ height: '60vh', maxHeight: '480px' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <span className="text-label-bold text-on-surface">Civic Bridge Assistant</span>
              <button
                id="chat-close"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5 text-accent-slate" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-body-md text-accent-slate text-center py-8">
                  Ask anything about civic issues, complaints, or how to use this app.
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-body-md ${
                    msg.role === 'user'
                      ? 'ml-auto bg-primary-container text-on-primary rounded-br-sm'
                      : 'bg-surface-container text-on-surface rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {sending && (
                <div className="max-w-[85%] px-3 py-2 rounded-xl bg-surface-container text-accent-slate rounded-bl-sm">
                  <span className="animate-pulse">Thinking…</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-outline-variant">
              <div className="flex gap-2">
                <input
                  id="chat-input"
                  className="input-field flex-1 min-h-[44px]"
                  placeholder="Type a message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  id="chat-send"
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-11 h-11 rounded-lg bg-primary-container text-on-primary flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-primary"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
