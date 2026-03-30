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
    <>
      <style>{`
        .goals-wrapper {
          padding: 32px;
          max-width: 896px;
          margin: 0 auto;
        }
        .goals-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        @media (max-width: 1023px) {
          .goals-wrapper {
            padding: 72px 16px 24px;
          }
          .goals-header {
            margin-bottom: 20px;
          }
        }
      `}</style>
      <div className="goals-wrapper">
        <div className="goals-header">
          <div>
            <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Goals</h1>
            <p style={{ color: '#A0A0A0' }} className="mt-1">Track and crush your fitness goals</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> New Goal
          </button>
        </div>

        {/* New goal form */}
        {showForm && (
          <div style={{ borderRadius: 16, padding: 24, marginBottom: 24, backgroundColor: '#1E1E1E', border: '1px solid #E8002D' }}>
            <h2 className="text-white font-bold text-lg mb-4">Create New Goal</h2>
            <div className="space-y-3">
              <input
                placeholder="Goal title (e.g. Bench press 225 lbs)"
                value={newGoal.title}
                onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px', width: '100%', outline: 'none', fontSize: 14 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <input
                  placeholder="Current value"
                  type="number"
                  value={newGoal.current}
                  onChange={e => setNewGoal(p => ({ ...p, current: e.target.value }))}
                  style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
                />
                <input
                  placeholder="Target value"
                  type="number"
                  value={newGoal.target}
                  onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                  style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
                />
                <select
                  value={newGoal.unit}
                  onChange={e => setNewGoal(p => ({ ...p, unit: e.target.value }))}
                  style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: newGoal.unit ? '#fff' : '#606060', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  <option value="" disabled>Unit</option>
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                  <option value="min">min</option>
                  <option value="km">km</option>
                  <option value="miles">miles</option>
                  <option value="reps">reps</option>
                  <option value="%">%</option>
                </select>
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
                  style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Create Goal
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ backgroundColor: '#2A2A2A', color: '#fff', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Goals list */}
        {(() => {
          const activeGoals = goals.filter(g => Math.round((g.current / g.target) * 100) < 100)
          const completedGoals = goals.filter(g => Math.round((g.current / g.target) * 100) >= 100)
          return (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activeGoals.map(g => {
                  const pct = Math.min(100, Math.round((g.current / g.target) * 100))
                  return (
                    <div key={g.id} style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,0,45,0.12)', flexShrink: 0 }}>
                            <Target size={18} style={{ color: '#E8002D' }} />
                          </div>
                          <div>
                            <p style={{ color: '#fff', fontWeight: 700 }}>{g.title}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              {g.shared ? (
                                <><Users size={12} style={{ color: '#A0A0A0' }} /><span style={{ color: '#A0A0A0', fontSize: 12 }}>Shared with partner</span></>
                              ) : (
                                <><Lock size={12} style={{ color: '#A0A0A0' }} /><span style={{ color: '#A0A0A0', fontSize: 12 }}>Private</span></>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ color: '#E8002D', fontWeight: 900, fontSize: 24 }}>{pct}%</p>
                          <p style={{ color: '#A0A0A0', fontSize: 12 }}>complete</p>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: '#A0A0A0', fontSize: 14 }}>Progress</span>
                          <span style={{ color: '#fff', fontSize: 14 }}>{g.current} / {g.target} {g.unit}</span>
                        </div>
                        <div style={{ width: '100%', height: 8, borderRadius: 8, backgroundColor: '#2A2A2A' }}>
                          <div style={{ height: 8, borderRadius: 8, width: `${pct}%`, backgroundColor: '#E8002D', transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {activeGoals.length === 0 && completedGoals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '96px 0' }}>
                  <Target size={48} style={{ color: '#2A2A2A', margin: '0 auto 16px' }} />
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>No goals yet</p>
                  <p style={{ color: '#A0A0A0' }}>Set your first goal and crush it with your partner</p>
                </div>
              )}

              {/* Completed Goals */}
              {completedGoals.length > 0 && (
                <div style={{ marginTop: 40 }}>
                  <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.125rem', marginBottom: 16 }}>Completed Goals 🎉</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {completedGoals.map(g => (
                      <div key={g.id} style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(74,222,128,0.2)', opacity: 0.85 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,222,128,0.12)', flexShrink: 0, fontSize: 18 }}>
                              ✓
                            </div>
                            <div>
                              <p style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{g.title}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                {g.shared ? (
                                  <><Users size={12} style={{ color: '#4ade80' }} /><span style={{ color: '#4ade80', fontSize: 12 }}>Shared with partner</span></>
                                ) : (
                                  <><Lock size={12} style={{ color: '#A0A0A0' }} /><span style={{ color: '#A0A0A0', fontSize: 12 }}>Private</span></>
                                )}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ color: '#4ade80', fontWeight: 900, fontSize: 20 }}>100%</p>
                            <p style={{ color: '#A0A0A0', fontSize: 12 }}>{g.current} / {g.target} {g.unit}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </>
  )
}
