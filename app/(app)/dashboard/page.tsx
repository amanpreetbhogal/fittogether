'use client'

import { useEffect, useState } from 'react'
import { Flame, Dumbbell, Target, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import StatCard from '@/components/StatCard'
import NudgeButton from '@/components/NudgeButton'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import { mockWorkoutHistory, mockNutritionHistory, mockRecentWorkouts, mockPartner } from '@/lib/mockData'
import Link from 'next/link'

type GoalRow = Database['public']['Tables']['goals']['Row']

type ChartTooltipPayload = {
  dataKey?: string
  name?: string
  value?: number | string
}

type ChartTooltipProps = {
  active?: boolean
  payload?: ChartTooltipPayload[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 4 }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.dataKey === 'calories' ? '#ffffff' : '#E8002D', fontWeight: 700, fontSize: 14 }}>
            {p.value} kcal · {p.name}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const LineTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 4 }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.dataKey === 'calories' ? '#ffffff' : '#E8002D', fontWeight: 700, fontSize: 14 }}>
            {p.value} kcal · {p.name}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const { profile, user, loading: authLoading } = useAuth()
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there'
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [loadingGoals, setLoadingGoals] = useState(true)

  useEffect(() => {
    const loadGoals = async () => {
      if (!user) {
        setGoals([])
        setLoadingGoals(false)
        return
      }

      setLoadingGoals(true)

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load dashboard goals', error)
        setGoals([])
        setLoadingGoals(false)
        return
      }

      setGoals(data)
      setLoadingGoals(false)
    }

    if (!authLoading) {
      void loadGoals()
    }
  }, [authLoading, user])

  const activeGoalCount = goals.filter(goal => goal.status === 'active').length
  const dashboardGoals = goals.slice(0, 2)

  return (
    <>
      <style>{`
        .dash-wrapper { padding: 32px; max-width: 1280px; margin: 0 auto; }
        .dash-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .dash-header h1 { font-size: 1.875rem; }
        .stat-grid { display: grid; gap: 20px; margin-bottom: 32px; }
        .charts-grid { display: grid; gap: 24px; margin-bottom: 32px; }
        .dash-bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        .dash-wide { grid-column: span 2; }
        @media (max-width: 1023px) {
          .dash-wrapper { padding: 72px 16px 32px; }
          .dash-header { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
          .dash-header h1 { font-size: 1.5rem; }
          .stat-grid { grid-template-columns: 1fr 1fr !important; margin-bottom: 24px; }
          .charts-grid { grid-template-columns: 1fr !important; margin-bottom: 24px; }
          .dash-bottom { grid-template-columns: 1fr; gap: 20px; }
          .dash-wide { grid-column: span 1; }
        }
      `}</style>
      <div className="dash-wrapper">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Good morning, {firstName} 👋</h1>
            <p style={{ color: '#A0A0A0', marginTop: 4 }}>Sunday, March 29 · Active streak: <span style={{ color: '#E8002D', fontWeight: 700 }}>3 days</span></p>
          </div>
          <NudgeButton partnerName="Priyana" />
        </div>

        {/* Stat cards */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatCard label="Calories Burned" value="2,240" unit="kcal" icon={<Flame size={16} />} accent change="12% vs last week" changePositive />
          <StatCard label="Workouts This Week" value="4" unit="sessions" icon={<Dumbbell size={16} />} change="1 more than last week" changePositive />
          <StatCard label="Active Goals" value={loadingGoals ? '...' : activeGoalCount} unit="goals" icon={<Target size={16} />} />
          <StatCard label="My Streak" value="3" unit="days" icon={<Zap size={16} />} accent change="Keep it going!" changePositive />
        </div>

        {/* Charts row */}
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>Weekly Calories Burned</h2>
            <p style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 14 }}>You vs Partner</p>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ffffff' }} />
                <span style={{ fontSize: 12, color: '#A0A0A0' }}>You</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#E8002D' }} />
                <span style={{ fontSize: 12, color: '#A0A0A0' }}>Priyana</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockWorkoutHistory} barGap={4}>
                <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="calories" name="You" fill="#ffffff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="partnerCalories" name="Priyana" fill="#E8002D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>Calorie Intake</h2>
            <p style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 14 }}>Daily totals this week</p>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ffffff' }} />
                <span style={{ fontSize: 12, color: '#A0A0A0' }}>You</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#E8002D' }} />
                <span style={{ fontSize: 12, color: '#A0A0A0' }}>Priyana</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockNutritionHistory}>
                <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<LineTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                <Line type="monotone" dataKey="calories" name="You" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#ffffff', r: 4 }} activeDot={{ fill: '#E8002D', r: 6 }} />
                <Line type="monotone" dataKey="partnerCalories" name="Priyana" stroke="#E8002D" strokeWidth={2} dot={{ fill: '#E8002D', r: 4 }} activeDot={{ fill: '#E8002D', r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom row */}
        <div className="dash-bottom">
          {/* Recent Workouts - narrow (1 col) */}
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem' }}>Recent Workouts</h2>
              <Link href="/workout" style={{ color: '#E8002D', fontSize: 14, fontWeight: 600, letterSpacing: '0.2px' }}>View all</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mockRecentWorkouts.map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, backgroundColor: '#252525' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,0,45,0.12)', flexShrink: 0 }}>
                    <Dumbbell size={16} style={{ color: '#E8002D' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</p>
                    <p style={{ color: '#A0A0A0', fontSize: 12 }}>{w.exercises.length} ex · {w.duration_minutes} min</p>
                  </div>
                  <span style={{ color: '#A0A0A0', fontSize: 11, flexShrink: 0 }}>{w.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Partner Activity + Goals - wide (span 2) */}
          <div className="dash-wide" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Partner Activity with Head-to-Head */}
            <div style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ color: '#fff', fontWeight: 600 }}>Partner Activity</h2>
                <Link href="/partner" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' }}>View</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left: partner info + stats */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', backgroundColor: '#E8002D', flexShrink: 0, fontSize: 13 }}>
                      {mockPartner.avatar}
                    </div>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{mockPartner.name}</p>
                      <p style={{ color: '#4ade80', fontSize: 12 }}>✓ Worked out today</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ borderRadius: 10, padding: 12, textAlign: 'center', backgroundColor: '#252525' }}>
                      <p style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{mockPartner.streak}</p>
                      <p style={{ color: '#A0A0A0', fontSize: 11 }}>Day streak</p>
                    </div>
                    <div style={{ borderRadius: 10, padding: 12, textAlign: 'center', backgroundColor: '#252525' }}>
                      <p style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{mockPartner.weeklyWorkouts}</p>
                      <p style={{ color: '#A0A0A0', fontSize: 11 }}>This week</p>
                    </div>
                  </div>
                </div>
                {/* Right: Head-to-Head */}
                <div>
                  <p style={{ color: '#A0A0A0', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Head-to-Head</p>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ffffff' }} />
                      <span style={{ fontSize: 11, color: '#A0A0A0' }}>You</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#E8002D' }} />
                      <span style={{ fontSize: 11, color: '#A0A0A0' }}>Priyana</span>
                    </div>
                  </div>
                  {[
                    { label: 'Weekly Workouts', you: 4, partner: mockPartner.weeklyWorkouts },
                    { label: 'Avg Cal Burned', you: 378, partner: 419 },
                    { label: 'Current Streak', you: 3, partner: mockPartner.streak },
                  ].map(item => {
                    const total = item.you + item.partner || 1
                    const youPct = Math.round((item.you / total) * 100)
                    return (
                      <div key={item.label} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: '#A0A0A0' }}>{item.label}</span>
                          <span style={{ fontSize: 11, color: '#A0A0A0' }}>
                            <span style={{ color: '#fff' }}>{item.you}</span>
                            {' vs '}
                            <span style={{ color: '#E8002D' }}>{item.partner}</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', height: 4, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                          <div style={{ width: `${youPct}%`, backgroundColor: '#ffffff', borderRadius: '4px 0 0 4px' }} />
                          <div style={{ width: `${100 - youPct}%`, backgroundColor: '#E8002D', borderRadius: '0 4px 4px 0' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Goals */}
            <div style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ color: '#fff', fontWeight: 600 }}>Goals</h2>
                <Link href="/goals" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' }}>All goals</Link>
              </div>
              {loadingGoals ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Loading goals...</p>
              ) : dashboardGoals.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>No goals yet. Create your first goal to see it here.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {dashboardGoals.map(goal => {
                    const pct = Math.min(100, Math.round((Number(goal.current_value) / Number(goal.target_value)) * 100))
                    return (
                      <div key={goal.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: '#fff', fontSize: 14 }}>{goal.title}</span>
                          <span style={{ color: goal.status === 'completed' ? '#4ade80' : '#E8002D', fontWeight: 700, fontSize: 14 }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: 6, borderRadius: 6, backgroundColor: '#2A2A2A' }}>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 6,
                              width: `${pct}%`,
                              backgroundColor: goal.status === 'completed' ? '#4ade80' : '#E8002D',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
