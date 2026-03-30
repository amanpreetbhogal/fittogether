'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, X, ChevronDown, ChevronUp, Dumbbell, Clock } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

interface SearchedExercise {
  id: string
  name: string
  type: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
  source: string
  gifUrl: string
}

interface ActiveSet {
  reps: string
  weight: string
}

interface ActiveExercise {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
  gifUrl: string
  sets: ActiveSet[]
}

interface RecentWorkout {
  id: string
  name: string
  date: string
  durationMinutes: number
  exercises: {
    id: string
    name: string
    muscle: string
    setsCount: number
  }[]
}

type WorkoutRow = Database['public']['Tables']['workouts']['Row']
type WorkoutExerciseRow = Database['public']['Tables']['workout_exercises']['Row']
type ExerciseSetRow = Database['public']['Tables']['exercise_sets']['Row']

const difficultyColor: Record<string, string> = {
  beginner: '#4ade80',
  intermediate: '#f59e0b',
  expert: '#E8002D',
}

export default function WorkoutPage() {
  const { user, loading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchedExercise[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([])
  const [loadingRecentWorkouts, setLoadingRecentWorkouts] = useState(true)
  const [savingWorkout, setSavingWorkout] = useState(false)
  const [workoutError, setWorkoutError] = useState<string | null>(null)
  const [workoutActive, setWorkoutActive] = useState(false)
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [workoutName, setWorkoutName] = useState('My Workout')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const loadRecentWorkouts = async () => {
      if (!user) {
        setRecentWorkouts([])
        setLoadingRecentWorkouts(false)
        return
      }

      setLoadingRecentWorkouts(true)
      setWorkoutError(null)

      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .order('workout_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (workoutsError) {
        console.error('Failed to load workouts', workoutsError)
        setWorkoutError('Could not load your recent workouts right now.')
        setRecentWorkouts([])
        setLoadingRecentWorkouts(false)
        return
      }

      if (!workouts || workouts.length === 0) {
        setRecentWorkouts([])
        setLoadingRecentWorkouts(false)
        return
      }

      const workoutIds = workouts.map(workout => workout.id)
      const { data: workoutExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*')
        .in('workout_id', workoutIds)
        .order('exercise_order', { ascending: true })

      if (exercisesError) {
        console.error('Failed to load workout exercises', exercisesError)
        setWorkoutError('Could not load your recent workouts right now.')
        setRecentWorkouts([])
        setLoadingRecentWorkouts(false)
        return
      }

      const exerciseIds = (workoutExercises || []).map(exercise => exercise.id)
      const { data: exerciseSets, error: setsError } = exerciseIds.length
        ? await supabase
            .from('exercise_sets')
            .select('*')
            .in('workout_exercise_id', exerciseIds)
            .order('set_order', { ascending: true })
        : { data: [] as ExerciseSetRow[], error: null }

      if (setsError) {
        console.error('Failed to load exercise sets', setsError)
        setWorkoutError('Could not load your recent workouts right now.')
        setRecentWorkouts([])
        setLoadingRecentWorkouts(false)
        return
      }

      setRecentWorkouts(mapRecentWorkouts(workouts, workoutExercises || [], exerciseSets || []))
      setLoadingRecentWorkouts(false)
    }

    if (!authLoading) {
      void loadRecentWorkouts()
    }
  }, [authLoading, user])

  useEffect(() => {
    if (!workoutActive || startedAt === null) {
      setElapsedSeconds(0)
      return
    }

    setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [startedAt, workoutActive])

  const searchExercises = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setSearchError(null)

    try {
      const res = await fetch(`/api/exercises/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()

      if (!res.ok) {
        setSearchResults([])
        setSearchError(
          typeof data?.error === 'string'
            ? data.error
            : 'Exercise search failed right now.'
        )
        return
      }

      setSearchResults(Array.isArray(data.results) ? data.results : [])
    } catch {
      setSearchResults([])
      setSearchError('Exercise search failed right now.')
    } finally {
      setSearching(false)
    }
  }

  const addExercise = (exercise: SearchedExercise) => {
    setActiveExercises(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: exercise.name,
        muscle: exercise.muscle,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions,
        gifUrl: exercise.gifUrl,
        sets: [{ reps: '', weight: '' }],
      },
    ])
    setSearchResults([])
    setSearchQuery('')
    setSearchError(null)

    if (!workoutActive) {
      setWorkoutActive(true)
    }

    if (startedAt === null) {
      setStartedAt(Date.now())
    }
  }

  const addSet = (exerciseId: string) => {
    setActiveExercises(prev =>
      prev.map(exercise =>
        exercise.id === exerciseId
          ? { ...exercise, sets: [...exercise.sets, { reps: '', weight: '' }] }
          : exercise
      )
    )
  }

  const updateSet = (
    exerciseId: string,
    setIdx: number,
    field: 'reps' | 'weight',
    value: string
  ) => {
    setActiveExercises(prev =>
      prev.map(exercise =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set, index) =>
                index === setIdx ? { ...set, [field]: value } : set
              ),
            }
          : exercise
      )
    )
  }

  const removeExercise = (exerciseId: string) => {
    setActiveExercises(prev => {
      const nextExercises = prev.filter(exercise => exercise.id !== exerciseId)

      if (expandedExercise === exerciseId) {
        setExpandedExercise(null)
      }

      if (nextExercises.length === 0) {
        setWorkoutActive(false)
        setStartedAt(null)
      }

      return nextExercises
    })
  }

  const finishWorkout = async () => {
    if (!user || activeExercises.length === 0) {
      return
    }

    setSavingWorkout(true)
    setWorkoutError(null)

    const durationMinutes =
      startedAt !== null
        ? Math.max(1, Math.round((Date.now() - startedAt) / 60000))
        : 0

    const { data: workout, error: workoutInsertError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        title: workoutName.trim() || 'My Workout',
        duration_minutes: durationMinutes,
      })
      .select('*')
      .single()

    if (workoutInsertError || !workout) {
      console.error('Failed to save workout', workoutInsertError)
      setWorkoutError('Could not save this workout. Please try again.')
      setSavingWorkout(false)
      return
    }

    const workoutExerciseRows = activeExercises.map((exercise, index) => ({
      workout_id: workout.id,
      exercise_name: exercise.name,
      muscle_group: exercise.muscle,
      exercise_order: index + 1,
    }))

    const { data: savedExercises, error: exercisesInsertError } = await supabase
      .from('workout_exercises')
      .insert(workoutExerciseRows)
      .select('*')

    if (exercisesInsertError || !savedExercises) {
      console.error('Failed to save workout exercises', exercisesInsertError)
      setWorkoutError('Workout saved, but some exercise details were not saved correctly.')
      setSavingWorkout(false)
      return
    }

    const exerciseSetsRows = savedExercises.flatMap((savedExercise, index) =>
      activeExercises[index].sets
        .filter(set => set.reps.trim() || set.weight.trim())
        .map((set, setIndex) => ({
          workout_exercise_id: savedExercise.id,
          set_order: setIndex + 1,
          reps: parseOptionalNumber(set.reps),
          weight: parseOptionalNumber(set.weight),
          unit: 'lbs',
        }))
    )

    if (exerciseSetsRows.length > 0) {
      const { error: setsInsertError } = await supabase
        .from('exercise_sets')
        .insert(exerciseSetsRows)

      if (setsInsertError) {
        console.error('Failed to save exercise sets', setsInsertError)
        setWorkoutError('Workout saved, but some sets were not saved correctly.')
        setSavingWorkout(false)
        return
      }
    }

    setRecentWorkouts(prev =>
      [
        ...mapRecentWorkouts(
          [workout],
          savedExercises,
          exerciseSetsRows.map((row, index) => ({
            id: `temp-${index}`,
            workout_exercise_id: row.workout_exercise_id,
            set_order: row.set_order,
            reps: row.reps,
            weight: row.weight,
            unit: row.unit,
            created_at: new Date().toISOString(),
          }))
        ),
        ...prev,
      ].slice(0, 5)
    )

    setActiveExercises([])
    setWorkoutActive(false)
    setExpandedExercise(null)
    setWorkoutName('My Workout')
    setStartedAt(null)
    setElapsedSeconds(0)
    setSavingWorkout(false)
  }

  const timerLabel = formatElapsedTime(elapsedSeconds)

  return (
    <>
      <style>{`
        .workout-wrapper { padding: 32px; max-width: 1152px; margin: 0 auto; }
        .workout-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .workout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; } .workout-section { margin-bottom: 24px; }
        @media (max-width: 1023px) {
          .workout-wrapper { padding: 72px 16px 24px; }
          .workout-header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
          .workout-grid { grid-template-columns: 1fr; gap: 24px; }
        }
      `}</style>
      <div className="workout-wrapper">
        <div className="workout-header">
          <div>
            <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Workout Log</h1>
            <p style={{ color: '#A0A0A0', marginTop: 4 }}>Search exercises and build your workout</p>
          </div>
          {workoutActive && (
            <button
              onClick={() => void finishWorkout()}
              disabled={savingWorkout}
              style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {savingWorkout ? 'Saving...' : 'Finish Workout'}
            </button>
          )}
        </div>

        {(searchError || workoutError) && (
          <div style={{ marginBottom: 24, borderRadius: 12, padding: 14, backgroundColor: 'rgba(232,0,45,0.12)', border: '0.5px solid rgba(232,0,45,0.4)', color: '#fff', fontSize: 13 }}>
            {searchError || workoutError}
          </div>
        )}

        <div className="workout-grid">
          <div>
            <div style={{ marginBottom: 24, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-bold text-lg mb-4">Find Exercises</h2>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search exercises (e.g. bench press)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void searchExercises()}
                    style={{
                      backgroundColor: '#252525',
                      border: '0.5px solid rgba(255,255,255,0.08)',
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
                  onClick={() => void searchExercises()}
                  disabled={searching}
                  style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {searching ? '...' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map(exercise => (
                    <div
                      key={exercise.id}
                      className="flex items-center justify-between p-4 rounded-xl gap-3"
                      style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}
                    >
                      {exercise.gifUrl ? (
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 10,
                            overflow: 'hidden',
                            backgroundColor: '#1E1E1E',
                            border: '0.5px solid rgba(255,255,255,0.08)',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={exercise.gifUrl}
                            alt={exercise.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-white font-semibold text-sm capitalize">{exercise.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs capitalize" style={{ color: '#A0A0A0' }}>{exercise.muscle}</span>
                          <span style={{ color: '#2A2A2A' }}>·</span>
                          <span className="text-xs capitalize" style={{ color: '#A0A0A0' }}>{exercise.equipment}</span>
                          <span style={{ color: '#2A2A2A' }}>·</span>
                          <span className="text-xs capitalize" style={{ color: difficultyColor[exercise.difficulty] || '#A0A0A0' }}>{exercise.difficulty}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addExercise(exercise)}
                        style={{ backgroundColor: 'rgba(232,0,45,0.12)', color: '#E8002D', border: '0.5px solid rgba(232,0,45,0.4)', borderRadius: 6, padding: '6px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
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

            <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-bold text-lg mb-4">Recent Workouts</h2>
              {loadingRecentWorkouts ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Loading your recent workouts...</p>
              ) : recentWorkouts.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Your saved workouts will show up here.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentWorkouts.map(workout => (
                    <div key={workout.id} style={{ padding: 16, borderRadius: 10, backgroundColor: '#252525' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ color: '#fff', fontWeight: 600 }}>{workout.name}</p>
                        <span style={{ fontSize: 12, color: '#A0A0A0' }}>{workout.date}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#A0A0A0' }}>
                          <Clock size={12} /> {workout.durationMinutes} min
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#A0A0A0' }}>
                          <Dumbbell size={12} /> {workout.exercises.length} exercises
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={{ position: 'sticky', top: 32, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
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
                {workoutActive ? (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(232,0,45,0.12)' }}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#E8002D' }} />
                    <span className="text-xs font-semibold" style={{ color: '#E8002D' }}>{timerLabel}</span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>Ready</span>
                )}
              </div>

              {activeExercises.length === 0 ? (
                <div className="py-16 text-center">
                  <Plus size={32} style={{ color: '#2A2A2A', margin: '0 auto 12px' }} />
                  <p style={{ color: '#A0A0A0', fontSize: 14 }}>Add exercises from the search to start your workout</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {activeExercises.map(exercise => (
                    <div key={exercise.id} className="rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer"
                        style={{ backgroundColor: '#252525' }}
                        onClick={() => setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)}
                      >
                        <div>
                          <p className="text-white font-semibold text-sm capitalize">{exercise.name}</p>
                          <p className="text-xs capitalize" style={{ color: '#A0A0A0' }}>{exercise.muscle} · {exercise.equipment} · {exercise.sets.length} sets</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={event => { event.stopPropagation(); removeExercise(exercise.id) }} style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <X size={15} />
                          </button>
                          {expandedExercise === exercise.id ? <ChevronUp size={15} style={{ color: '#A0A0A0' }} /> : <ChevronDown size={15} style={{ color: '#A0A0A0' }} />}
                        </div>
                      </div>

                      {expandedExercise === exercise.id && (
                        <div className="p-4" style={{ backgroundColor: '#141414' }}>
                          {exercise.instructions && (
                            <p style={{ color: '#A0A0A0', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                              {exercise.instructions}
                            </p>
                          )}
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <span className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>SET</span>
                            <span className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>WEIGHT (lbs)</span>
                            <span className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>REPS</span>
                          </div>
                          {exercise.sets.map((set, idx) => (
                            <div key={idx} className="grid grid-cols-3 gap-2 mb-2 items-center">
                              <span className="text-sm font-bold" style={{ color: '#E8002D' }}>{idx + 1}</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={set.weight}
                                onChange={e => updateSet(exercise.id, idx, 'weight', e.target.value)}
                                style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 14, outline: 'none' }}
                              />
                              <input
                                type="number"
                                placeholder="0"
                                value={set.reps}
                                onChange={e => updateSet(exercise.id, idx, 'reps', e.target.value)}
                                style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 14, outline: 'none' }}
                              />
                            </div>
                          ))}
                          <button
                            onClick={() => addSet(exercise.id)}
                            style={{ color: '#E8002D', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginTop: 4, fontFamily: 'inherit' }}
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
    </>
  )
}

function parseOptionalNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function mapRecentWorkouts(
  workouts: WorkoutRow[],
  workoutExercises: WorkoutExerciseRow[],
  exerciseSets: ExerciseSetRow[]
): RecentWorkout[] {
  return workouts.map(workout => {
    const exercises = workoutExercises
      .filter(exercise => exercise.workout_id === workout.id)
      .map(exercise => ({
        id: exercise.id,
        name: exercise.exercise_name,
        muscle: exercise.muscle_group ?? 'full body',
        setsCount: exerciseSets.filter(set => set.workout_exercise_id === exercise.id).length,
      }))

    return {
      id: workout.id,
      name: workout.title,
      date: workout.workout_date,
      durationMinutes: workout.duration_minutes,
      exercises,
    }
  })
}
