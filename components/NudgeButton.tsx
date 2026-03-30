'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'

export default function NudgeButton({ partnerName }: { partnerName: string }) {
  const [sent, setSent] = useState(false)

  const handleNudge = () => {
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <button
      onClick={handleNudge}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.15s',
        fontFamily: 'inherit',
        letterSpacing: '0.2px',
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
      {sent ? `Nudge sent!` : `Nudge ${partnerName}`}
    </button>
  )
}
