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
      <div style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '10px 14px' }}>
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
    <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Good morning, Amanpreet 👋</h1>
          <p style={{ color: '#A0A0A0' }} className="mt-1">Sunday, March 29 · Rest day streak: <span style={{ color: '#E8002D', fontWeight: 700 }}>3 days</span></p>
        </div>
        <NudgeButton partnerName="Alex" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Calories Burned" value="2,240" unit="kcal" icon={<Flame size={16} />} accent change="12% vs last week" changePositive />
        <StatCard label="Workouts This Week" value="4" unit="sessions" icon={<Dumbbell size={16} />} change="1 more than last week" changePositive />
        <StatCard label="Active Goals" value="3" unit="goals" icon={<Target size={16} />} />
        <StatCard label="Partner Streak" value="12" unit="days" icon={<Zap size={16} />} accent change="Personal best!" changePositive />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly workout chart */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
          <h2 className="text-white font-bold text-lg mb-1">Weekly Calories Burned</h2>
          <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>You vs Partner</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockWorkoutHistory} barGap={4}>
              <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="calories" name="kcal" fill="#E8002D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Nutrition chart */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
          <h2 className="text-white font-bold text-lg mb-1">Calorie Intake</h2>
          <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>Daily totals this week</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent workouts */}
        <div className="lg:col-span-2 rounded-2xl p-6" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-lg">Recent Workouts</h2>
            <Link href="/workout" style={{ color: '#E8002D', fontSize: 14, fontWeight: 600 }}>View all</Link>
          </div>
          <div className="space-y-3">
            {mockRecentWorkouts.map(w => (
              <div key={w.id} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#252525' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(232,0,45,0.12)' }}>
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

        {/* Partner + Goals */}
        <div className="space-y-4">
          {/* Partner card */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold">Partner Activity</h2>
              <Link href="/partner" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600 }}>View</Link>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: '#E8002D' }}>
                {mockPartner.avatar}
              </div>
              <div>
                <p className="text-white font-semibold">{mockPartner.name}</p>
                <p className="text-xs" style={{ color: '#22c55e' }}>✓ Worked out today</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#252525' }}>
                <p className="text-white font-black text-xl">{mockPartner.streak}</p>
                <p className="text-xs" style={{ color: '#A0A0A0' }}>Day streak</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#252525' }}>
                <p className="text-white font-black text-xl">{mockPartner.weeklyWorkouts}</p>
                <p className="text-xs" style={{ color: '#A0A0A0' }}>This week</p>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold">Goals</h2>
              <Link href="/goals" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600 }}>All goals</Link>
            </div>
            <div className="space-y-3">
              {mockGoals.slice(0, 2).map(g => {
                const pct = Math.min(100, Math.round((g.current / g.target) * 100))
                return (
                  <div key={g.id}>
                    <div className="flex justify-between mb-1">
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
  )
}
