'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const NUDGE_MESSAGES = [
  'You got this. Log one thing today.',
  'Tiny progress still counts. Let’s go.',
  'Quick check-in: crush today’s goal.',
  'Your partner believes in you.',
  'Show up for 10 minutes and build momentum.',
]

type NudgeButtonProps = {
  partnerName: string
  senderId?: string
  recipientId?: string
  onSent?: () => Promise<void> | void
}

export default function NudgeButton({ partnerName, senderId, recipientId, onSent }: NudgeButtonProps) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleNudge = async () => {
    if (!senderId || !recipientId) {
      setErrorMessage('Connect with a partner to send a nudge.')
      window.setTimeout(() => setErrorMessage(null), 3000)
      return
    }

    setSending(true)
    setErrorMessage(null)

    const randomMessage = NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)]

    const { error } = await supabase
      .from('nudges')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        message: randomMessage,
      })

    if (error) {
      console.error('Failed to send nudge', error)
      setErrorMessage('Could not send the nudge right now.')
      setSending(false)
      return
    }

    await onSent?.()
    setSent(true)
    setSending(false)
    window.setTimeout(() => setSent(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <button
        onClick={() => void handleNudge()}
        disabled={sending}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: sending ? 'wait' : 'pointer',
          transition: 'opacity 0.15s',
          fontFamily: 'inherit',
          letterSpacing: '0.2px',
          opacity: sending ? 0.7 : 1,
          ...(sent ? {
            backgroundColor: 'rgba(232, 0, 45, 0.15)',
            color: '#E8002D',
            border: '0.5px solid rgba(232, 0, 45, 0.4)',
          } : {
            backgroundColor: '#E8002D',
            color: '#ffffff',
            border: 'none',
          }),
        }}
      >
        <Zap size={14} fill={sent ? 'none' : 'currentColor'} />
        {sending ? 'Sending...' : sent ? 'Nudge sent!' : `Nudge ${partnerName}`}
      </button>
      {errorMessage ? (
        <p style={{ color: '#A0A0A0', fontSize: 12, margin: 0 }}>{errorMessage}</p>
      ) : null}
    </div>
  )
}
