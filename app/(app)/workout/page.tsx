'use client'

import { useState } from 'react'
import { Search, Plus, X, ChevronDown, ChevronUp, Dumbbell, Clock, Flame } from 'lucide-react'
import { mockRecentWorkouts } from '@/lib/mockData'

interface SearchedExercise {
  name: string
  type: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
}

interface ActiveSet {
  reps: string
  weight: string
}

interface ActiveExercise {
  name: string
  muscle: string
  sets: ActiveSet[]
}

const difficultyColor: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  expert: '#E8002D',
}

export default function WorkoutPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchedExercise[]>([])
  const [searching, setSearching] = useState(false)
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([])
  const [workoutActive, setWorkoutActive] = useState(false)
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [workoutName, setWorkoutName] = useState('My Workout')

  const searchExercises = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://api.api-ninjas.com/v1/exercises?name=${encodeURIComponent(searchQuery)}&limit=8`,
        { headers: { 'X-Api-Key': process.env.NEXT_PUBLIC_API_NINJAS_KEY || '' } }
      )
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const addExercise = (ex: SearchedExercise) => {
    setActiveExercises(prev => [...prev, {
      name: ex.name,
      muscle: ex.muscle,
      sets: [{ reps: '', weight: '' }]
    }])
    setSearchResults([])
    setSearchQuery('')
    setWorkoutActive(true)
  }

  const addSet = (exName: string) => {
    setActiveExercises(prev => prev.map(e =>
      e.name === exName ? { ...e, sets: [...e.sets, { reps: '', weight: '' }] } : e
    ))
  }

  const updateSet = (exName: string, setIdx: number, field: 'reps' | 'weight', value: string) => {
    setActiveExercises(prev => prev.map(e =>
      e.name === exName
        ? { ...e, sets: e.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s) }
        : e
    ))
  }

  const removeExercise = (exName: string) => {
    setActiveExercises(prev => prev.filter(e => e.name !== exName))
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1152px", margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Workout Log</h1>
          <p style={{ color: '#A0A0A0' }} className="mt-1">Search exercises and build your workout</p>
        </div>
        {workoutActive && (
          <button
            onClick={() => { setWorkoutActive(false); setActiveExercises([]) }}
            style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}
          >
            Finish Workout
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Search */}
        <div>
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
            <h2 className="text-white font-bold text-lg mb-4">Find Exercises</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search exercises (e.g. bench press)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchExercises()}
                  style={{
                    backgroundColor: '#252525',
                    border: '1px solid #2A2A2A',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '11px 14px 11px 38px',
                    width: '100%',
                    outline: 'none',
                    fontSize: 14,
                  }}
                />
              </div>
              <button
                onClick={searchExercises}
                disabled={searching}
                style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map(ex => (
                  <div
                    key={ex.name}
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{ backgroundColor: '#252525', border: '1px solid #2A2A2A' }}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-white font-semibold text-sm capitalize">{ex.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs capitalize" style={{ color: '#A0A0A0' }}>{ex.muscle}</span>
                        <span style={{ color: '#2A2A2A' }}>·</span>
                        <span className="text-xs capitalize" style={{ color: difficultyColor[ex.difficulty] || '#A0A0A0' }}>{ex.difficulty}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => addExercise(ex)}
                      style={{ backgroundColor: 'rgba(232,0,45,0.12)', color: '#E8002D', border: '1px solid rgba(232,0,45,0.2)', borderRadius: 8, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && !searching && (
              <div className="mt-6 text-center py-8">
                <Dumbbell size={32} style={{ color: '#2A2A2A', margin: '0 auto 12px' }} />
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Search for exercises to add to your workout</p>
              </div>
            )}
          </div>

          {/* Recent workouts */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
            <h2 className="text-white font-bold text-lg mb-4">Recent Workouts</h2>
            <div className="space-y-3">
              {mockRecentWorkouts.map(w => (
                <div key={w.id} className="p-4 rounded-xl" style={{ backgroundColor: '#252525' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold">{w.name}</p>
                    <span className="text-xs" style={{ color: '#A0A0A0' }}>{w.date}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-xs flex items-center gap-1" style={{ color: '#A0A0A0' }}>
                      <Clock size={12} /> {w.duration_minutes} min
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: '#A0A0A0' }}>
                      <Dumbbell size={12} /> {w.exercises.length} exercises
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Active workout */}
        <div>
          <div className="rounded-2xl p-6 sticky top-8" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <input
                  value={workoutName}
                  onChange={e => setWorkoutName(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: 700,
                    outline: 'none',
                    padding: 0,
                    width: '100%',
                  }}
                />
                <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>
                  {activeExercises.length} exercises
                </p>
              </div>
              {workoutActive && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(232,0,45,0.12)' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#E8002D' }} />
                  <span className="text-xs font-semibold" style={{ color: '#E8002D' }}>ACTIVE</span>
                </div>
              )}
            </div>

            {activeExercises.length === 0 ? (
              <div className="py-16 text-center">
                <Plus size={32} style={{ color: '#2A2A2A', margin: '0 auto 12px' }} />
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Add exercises from the search to start your workout</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {activeExercises.map(ex => (
                  <div key={ex.name} className="rounded-xl overflow-hidden" style={{ border: '1px solid #2A2A2A' }}>
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      style={{ backgroundColor: '#252525' }}
                      onClick={() => setExpandedExercise(expandedExercise === ex.name ? null : ex.name)}
                    >
                      <div>
                        <p className="text-white font-semibold text-sm capitalize">{ex.name}</p>
                        <p className="text-xs capitalize" style={{ color: '#A0A0A0' }}>{ex.muscle} · {ex.sets.length} sets</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); removeExercise(ex.name) }} style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X size={15} />
                        </button>
                        {expandedExercise === ex.name ? <ChevronUp size={15} style={{ color: '#A0A0A0' }} /> : <ChevronDown size={15} style={{ color: '#A0A0A0' }} />}
                      </div>
                    </div>

                    {expandedExercise === ex.name && (
                      <div className="p-4" style={{ backgroundColor: '#141414' }}>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <span className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>SET</span>
                          <span className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>WEIGHT (lbs)</span>
                          <span className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>REPS</span>
                        </div>
                        {ex.sets.map((set, idx) => (
                          <div key={idx} className="grid grid-cols-3 gap-2 mb-2 items-center">
                            <span className="text-sm font-bold" style={{ color: '#E8002D' }}>{idx + 1}</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={set.weight}
                              onChange={e => updateSet(ex.name, idx, 'weight', e.target.value)}
                              style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none' }}
                            />
                            <input
                              type="number"
                              placeholder="0"
                              value={set.reps}
                              onChange={e => updateSet(ex.name, idx, 'reps', e.target.value)}
                              style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none' }}
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => addSet(ex.name)}
                          style={{ color: '#E8002D', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginTop: 4 }}
                        >
                          + Add Set
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
