'use client'

import { useState } from 'react'
import { Target, Plus, Users, Lock } from 'lucide-react'
import { mockGoals } from '@/lib/mockData'

interface Goal {
  id: string
  title: string
  current: number
  target: number
  unit: string
  shared: boolean
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(mockGoals)
  const [showForm, setShowForm] = useState(false)
  const [newGoal, setNewGoal] = useState({ title: '', current: '', target: '', unit: '', shared: false })

  const addGoal = () => {
    if (!newGoal.title || !newGoal.target) return
    setGoals(prev => [...prev, {
      id: Date.now().toString(),
      title: newGoal.title,
      current: parseFloat(newGoal.current) || 0,
      target: parseFloat(newGoal.target),
      unit: newGoal.unit,
      shared: newGoal.shared,
    }])
    setNewGoal({ title: '', current: '', target: '', unit: '', shared: false })
    setShowForm(false)
  }

  return (
    <div style={{ padding: "32px", maxWidth: "896px", margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Goals</h1>
          <p style={{ color: '#A0A0A0' }} className="mt-1">Track and crush your fitness goals</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
        >
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* New goal form */}
      {showForm && (
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#1E1E1E', border: '1px solid #E8002D' }}>
          <h2 className="text-white font-bold text-lg mb-4">Create New Goal</h2>
          <div className="space-y-3">
            <input
              placeholder="Goal title (e.g. Bench press 225 lbs)"
              value={newGoal.title}
              onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
              style={{ backgroundColor: '#252525', border: '1px solid #2A2A2A', color: '#fff', borderRadius: 10, padding: '11px 14px', width: '100%', outline: 'none', fontSize: 14 }}
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                placeholder="Current value"
                type="number"
                value={newGoal.current}
                onChange={e => setNewGoal(p => ({ ...p, current: e.target.value }))}
                style={{ backgroundColor: '#252525', border: '1px solid #2A2A2A', color: '#fff', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14 }}
              />
              <input
                placeholder="Target value"
                type="number"
                value={newGoal.target}
                onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                style={{ backgroundColor: '#252525', border: '1px solid #2A2A2A', color: '#fff', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14 }}
              />
              <input
                placeholder="Unit (lbs, min, km...)"
                value={newGoal.unit}
                onChange={e => setNewGoal(p => ({ ...p, unit: e.target.value }))}
                style={{ backgroundColor: '#252525', border: '1px solid #2A2A2A', color: '#fff', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14 }}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newGoal.shared}
                onChange={e => setNewGoal(p => ({ ...p, shared: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: '#E8002D' }}
              />
              <span style={{ color: '#A0A0A0', fontSize: 14 }}>Share with partner</span>
            </label>
            <div className="flex gap-3 pt-1">
              <button
                onClick={addGoal}
                style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              >
                Create Goal
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{ backgroundColor: '#252525', color: '#A0A0A0', border: '1px solid #2A2A2A', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals list */}
      <div className="space-y-4">
        {goals.map(g => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100))
          return (
            <div key={g.id} className="rounded-2xl p-6" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(232,0,45,0.12)' }}>
                    <Target size={18} style={{ color: '#E8002D' }} />
                  </div>
                  <div>
                    <p className="text-white font-bold">{g.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {g.shared ? (
                        <><Users size={12} style={{ color: '#A0A0A0' }} /><span className="text-xs" style={{ color: '#A0A0A0' }}>Shared with partner</span></>
                      ) : (
                        <><Lock size={12} style={{ color: '#A0A0A0' }} /><span className="text-xs" style={{ color: '#A0A0A0' }}>Private</span></>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black" style={{ color: '#E8002D' }}>{pct}%</p>
                  <p className="text-xs" style={{ color: '#A0A0A0' }}>complete</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between mb-2">
                  <span className="text-sm" style={{ color: '#A0A0A0' }}>Progress</span>
                  <span className="text-sm text-white">{g.current} / {g.target} {g.unit}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#2A2A2A' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: '#E8002D' }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-24">
          <Target size={48} style={{ color: '#2A2A2A', margin: '0 auto 16px' }} />
          <p className="text-white font-bold text-xl mb-2">No goals yet</p>
          <p style={{ color: '#A0A0A0' }}>Set your first goal and crush it with your partner</p>
        </div>
      )}
    </div>
  )
}
