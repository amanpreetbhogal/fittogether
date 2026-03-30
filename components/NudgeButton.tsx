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
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{
        backgroundColor: sent ? 'rgba(232, 0, 45, 0.15)' : '#E8002D',
        color: sent ? '#E8002D' : '#ffffff',
        border: sent ? '1px solid #E8002D' : 'none',
      }}
    >
      <Zap size={15} fill={sent ? 'none' : 'currentColor'} />
      {sent ? `Nudge sent to ${partnerName}!` : `Nudge ${partnerName}`}
    </button>
  )
}
