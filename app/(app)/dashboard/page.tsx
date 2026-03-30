'use client'

import { Flame, Dumbbell, Target, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import StatCard from '@/components/StatCard'
import NudgeButton from '@/components/NudgeButton'
import { mockWorkoutHistory, mockNutritionHistory, mockRecentWorkouts, mockPartner, mockGoals } from '@/lib/mockData'
import Link from 'next/link'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 4 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color, fontWeight: 700, fontSize: 14 }}>
            {p.value} {p.name}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  return (
    <>
      <style>{`
        .dash-wrapper { padding: 32px; max-width: 1280px; margin: 0 auto; }
        .dash-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .dash-header h1 { font-size: 1.875rem; }
        .stat-grid { display: grid; gap: 20px; margin-bottom: 32px; }
        .charts-grid { display: grid; gap: 24px; margin-bottom: 32px; }
        .dash-bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        .dash-recent { grid-column: span 2; }
        @media (max-width: 1023px) {
          .dash-wrapper { padding: 72px 16px 32px; }
          .dash-header { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
          .dash-header h1 { font-size: 1.5rem; }
          .stat-grid { grid-template-columns: 1fr 1fr !important; margin-bottom: 24px; }
          .charts-grid { grid-template-columns: 1fr !important; margin-bottom: 24px; }
          .dash-bottom { grid-template-columns: 1fr; gap: 20px; }
          .dash-recent { grid-column: span 1; }
        }
      `}</style>
      <div className="dash-wrapper">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Good morning, Amanpreet 👋</h1>
            <p style={{ color: '#A0A0A0', marginTop: 4 }}>Sunday, March 29 · Rest day streak: <span style={{ color: '#E8002D', fontWeight: 700 }}>3 days</span></p>
          </div>
          <NudgeButton partnerName="Priyana" />
        </div>

        {/* Stat cards */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatCard label="Calories Burned" value="2,240" unit="kcal" icon={<Flame size={16} />} accent change="12% vs last week" changePositive />
          <StatCard label="Workouts This Week" value="4" unit="sessions" icon={<Dumbbell size={16} />} change="1 more than last week" changePositive />
          <StatCard label="Active Goals" value="3" unit="goals" icon={<Target size={16} />} />
          <StatCard label="Partner Streak" value="12" unit="days" icon={<Zap size={16} />} accent change="Personal best!" changePositive />
        </div>

        {/* Charts row */}
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>Weekly Calories Burned</h2>
            <p style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 24 }}>You vs Partner</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockWorkoutHistory} barGap={4}>
                <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="calories" name="kcal" fill="#E8002D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>Calorie Intake</h2>
            <p style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 24 }}>Daily totals this week</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockNutritionHistory}>
                <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="calories" name="kcal" stroke="#E8002D" strokeWidth={2} dot={{ fill: '#E8002D', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom row */}
        <div className="dash-bottom">
          <div className="dash-recent" style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem' }}>Recent Workouts</h2>
              <Link href="/workout" style={{ color: '#E8002D', fontSize: 14, fontWeight: 600, letterSpacing: '0.2px' }}>View all</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mockRecentWorkouts.map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 10, backgroundColor: '#252525' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,0,45,0.12)', flexShrink: 0 }}>
                      <Dumbbell size={18} style={{ color: '#E8002D' }} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{w.name}</p>
                      <p className="text-xs" style={{ color: '#A0A0A0' }}>{w.exercises.length} exercises · {w.duration_minutes} min</p>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: '#A0A0A0' }}>{w.date}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ color: '#fff', fontWeight: 600 }}>Partner Activity</h2>
                <Link href="/partner" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' }}>View</Link>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', backgroundColor: '#E8002D', flexShrink: 0 }}>
                  {mockPartner.avatar}
                </div>
                <div>
                  <p className="text-white font-semibold">{mockPartner.name}</p>
                  <p className="text-xs" style={{ color: '#4ade80' }}>✓ Worked out today</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ borderRadius: 10, padding: 12, textAlign: 'center', backgroundColor: '#252525' }}>
                  <p className="text-white font-black text-xl">{mockPartner.streak}</p>
                  <p className="text-xs" style={{ color: '#A0A0A0' }}>Day streak</p>
                </div>
                <div style={{ borderRadius: 10, padding: 12, textAlign: 'center', backgroundColor: '#252525' }}>
                  <p className="text-white font-black text-xl">{mockPartner.weeklyWorkouts}</p>
                  <p className="text-xs" style={{ color: '#A0A0A0' }}>This week</p>
                </div>
              </div>
            </div>

            <div style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ color: '#fff', fontWeight: 600 }}>Goals</h2>
                <Link href="/goals" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' }}>All goals</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {mockGoals.slice(0, 2).map(g => {
                  const pct = Math.min(100, Math.round((g.current / g.target) * 100))
                  return (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className="text-sm text-white">{g.title}</span>
                        <span className="text-sm font-bold" style={{ color: '#E8002D' }}>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#2A2A2A' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: '#E8002D' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
