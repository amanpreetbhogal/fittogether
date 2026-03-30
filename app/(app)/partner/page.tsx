'use client'

import { Zap, Dumbbell, Flame, Target, Trophy } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import NudgeButton from '@/components/NudgeButton'
import { mockWorkoutHistory, mockPartner, mockGoals, mockRecentWorkouts } from '@/lib/mockData'

const partnerWorkoutHistory = [
  { date: 'Mon', calories: 380 },
  { date: 'Tue', calories: 450 },
  { date: 'Wed', calories: 310 },
  { date: 'Thu', calories: 520 },
  { date: 'Fri', calories: 400 },
  { date: 'Sat', calories: 580 },
  { date: 'Sun', calories: 290 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#E8002D', fontWeight: 700, fontSize: 14 }}>{payload[0].value} kcal</p>
      </div>
    )
  }
  return null
}

export default function PartnerPage() {
  const sharedGoals = mockGoals.filter(g => g.shared)

  return (
    <>
      <style>{`
        .partner-wrapper {
          padding: 32px;
          max-width: 1024px;
          margin: 0 auto;
        }
        .partner-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        .partner-charts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .partner-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 24px;
        }
        @media (max-width: 1023px) {
          .partner-wrapper {
            padding: 72px 16px 24px;
          }
          .partner-header {
            flex-direction: column;
            gap: 16px;
            margin-bottom: 20px;
          }
          .partner-charts {
            grid-template-columns: 1fr;
          }
          .partner-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      <div className="partner-wrapper">
        {/* Header */}
        <div className="partner-header">
          <div>
            <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Partner View</h1>
            <p style={{ color: '#A0A0A0' }} className="mt-1">Stay connected with your partner&apos;s fitness journey</p>
          </div>
          <NudgeButton partnerName={mockPartner.name.split(' ')[0]} />
        </div>

        {/* Partner hero card */}
        <div style={{ marginBottom: 32, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white flex-shrink-0" style={{ backgroundColor: '#E8002D' }}>
              {mockPartner.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>{mockPartner.name}</h2>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4ade80' }} />
                  <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>Active today</span>
                </div>
              </div>
              <p style={{ color: '#A0A0A0', fontSize: 14 }}>Last workout: {mockPartner.lastWorkout}</p>
            </div>
          </div>

          <div className="partner-stats">
            {[
              { label: 'Day Streak', value: mockPartner.streak, icon: <Trophy size={16} />, unit: 'days' },
              { label: 'This Week', value: mockPartner.weeklyWorkouts, icon: <Dumbbell size={16} />, unit: 'workouts' },
              { label: "Today's Calories", value: mockPartner.todayCalories.toLocaleString(), icon: <Flame size={16} />, unit: 'kcal' },
            ].map(item => (
              <div key={item.label} style={{ borderRadius: 10, padding: 16, textAlign: 'center', backgroundColor: '#252525' }}>
                <div className="flex justify-center mb-2" style={{ color: '#E8002D' }}>{item.icon}</div>
                <p className="text-white font-black text-2xl">{item.value}</p>
                <p className="text-xs" style={{ color: '#A0A0A0' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="partner-charts">
          {/* Partner workout chart */}
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-white font-bold text-lg mb-1">{mockPartner.name.split(' ')[0]}&apos;s Weekly Calories</h2>
            <p className="text-sm mb-5" style={{ color: '#A0A0A0' }}>Calories burned this week</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={partnerWorkoutHistory}>
                <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="calories" fill="#E8002D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison */}
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-white font-bold text-lg mb-5">Head-to-Head</h2>
            <div className="space-y-5">
              {[
                { label: 'Weekly Workouts', you: 4, partner: mockPartner.weeklyWorkouts, unit: '' },
                { label: 'Avg Calories Burned', you: 378, partner: 419, unit: 'kcal' },
                { label: 'Current Streak', you: 2, partner: mockPartner.streak, unit: 'days' },
              ].map(item => {
                const total = item.you + item.partner
                const youPct = Math.round((item.you / total) * 100)
                const partnerPct = 100 - youPct
                return (
                  <div key={item.label}>
                    <div className="flex justify-between mb-2 text-sm">
                      <span style={{ color: '#A0A0A0' }}>You: <span className="text-white font-bold">{item.you}{item.unit && ` ${item.unit}`}</span></span>
                      <span className="text-white font-semibold">{item.label}</span>
                      <span style={{ color: '#A0A0A0' }}>Partner: <span style={{ color: '#E8002D', fontWeight: 700 }}>{item.partner}{item.unit && ` ${item.unit}`}</span></span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                      <div style={{ width: `${youPct}%`, backgroundColor: '#ffffff', borderRadius: '4px 0 0 4px' }} />
                      <div style={{ width: `${partnerPct}%`, backgroundColor: '#E8002D', borderRadius: '0 4px 4px 0' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Shared goals */}
        <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Target size={18} style={{ color: '#E8002D' }} />
            <h2 className="text-white font-bold text-lg">Shared Goals</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {sharedGoals.map(g => {
              const pct = Math.min(100, Math.round((g.current / g.target) * 100))
              return (
                <div key={g.id} className="p-4 rounded-xl" style={{ backgroundColor: '#252525' }}>
                  <div className="flex justify-between mb-2">
                    <p className="text-white font-semibold text-sm">{g.title}</p>
                    <span className="text-sm font-bold" style={{ color: '#E8002D' }}>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#2A2A2A' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: '#E8002D' }} />
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#A0A0A0' }}>{g.current} / {g.target} {g.unit}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
