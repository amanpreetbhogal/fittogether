'use client'

import { useCallback, useEffect, useState } from 'react'
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
  unit: 'lbs' | 'kg'
  completed: boolean
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
  previousPerformance: ExercisePreviousPerformance | null
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
    sets: {
      id: string
      reps: number | null
      weight: number | null
      unit: string
    }[]
  }[]
}

interface WorkoutTemplate {
  id: string
  name: string
  createdAt: string
  exercises: {
    name: string
    muscle: string
    equipment: string
    difficulty: string
    instructions: string
    gifUrl: string
    sets: {
      reps: string
      weight: string
      unit: 'lbs' | 'kg'
    }[]
  }[]
}

type WorkoutRow = Database['public']['Tables']['workouts']['Row']
type WorkoutExerciseRow = Database['public']['Tables']['workout_exercises']['Row']
type ExerciseSetRow = Database['public']['Tables']['exercise_sets']['Row']

interface BuilderExercise {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
  gifUrl: string
  targetSets: number
}
type ExercisePreviousPerformance = {
  lastWorkoutDate: string
  lastSets: string[]
  bestSet: string | null
}

type PreviousSetLookup = Record<string, ExercisePreviousPerformance>

const difficultyColor: Record<string, string> = {
  beginner: '#4ade80',
  intermediate: '#f59e0b',
  expert: '#E8002D',
}
const WORKOUT_TEMPLATES_KEY = 'fittogether.workoutTemplates'

export default function WorkoutPage() {
  const { user, profile, loading: authLoading } = useAuth()
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
  const [expandedRecentWorkout, setExpandedRecentWorkout] = useState<string | null>(null)
  const [workoutName, setWorkoutName] = useState('My Workout')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0)
  const [restActive, setRestActive] = useState(false)
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null)
  const [previousPerformanceLookup, setPreviousPerformanceLookup] = useState<PreviousSetLookup>({})
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => loadWorkoutTemplates())
  const defaultWeightUnit: 'lbs' | 'kg' = profile?.preferred_weight_unit === 'kg' ? 'kg' : 'lbs'

  // View state: routines = landing page, building = routine builder, active = live session
  const [view, setView] = useState<'routines' | 'building' | 'active'>('routines')
  const [builderName, setBuilderName] = useState('')
  const [builderExercises, setBuilderExercises] = useState<BuilderExercise[]>([])

  const loadRecentWorkouts = useCallback(async () => {
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
      .eq('user_id', user.id)
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

    const previousSetLookup = buildPreviousSetLookup(workouts, workoutExercises || [], exerciseSets || [])

    setPreviousPerformanceLookup(previousSetLookup)
    setRecentWorkouts(mapRecentWorkouts(workouts, workoutExercises || [], exerciseSets || []))
    setActiveExercises(prev =>
      prev.map(exercise => ({
        ...exercise,
        previousPerformance: previousSetLookup[normalizeExerciseKey(exercise.name)] || null,
      }))
    )
    setLoadingRecentWorkouts(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      void loadRecentWorkouts()
    }
  }, [authLoading, loadRecentWorkouts])

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

  useEffect(() => {
    if (!restActive) {
      return
    }

    if (restSecondsRemaining <= 0) {
      setRestActive(false)
      return
    }

    const intervalId = window.setInterval(() => {
      setRestSecondsRemaining(prev => {
        if (prev <= 1) {
          window.clearInterval(intervalId)
          setRestActive(false)
          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [restActive, restSecondsRemaining])

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
        sets: [{ reps: '', weight: '', unit: defaultWeightUnit, completed: false }],
        previousPerformance: previousPerformanceLookup[normalizeExerciseKey(exercise.name)] || null,
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
          ? {
              ...exercise,
              sets: [
                ...exercise.sets,
                {
                  reps: '',
                  weight: '',
                  unit: exercise.sets[exercise.sets.length - 1]?.unit ?? defaultWeightUnit,
                  completed: false,
                },
              ],
            }
          : exercise
      )
    )
  }

  const updateSet = (
    exerciseId: string,
    setIdx: number,
    field: 'reps' | 'weight' | 'unit',
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

  const removeSet = (exerciseId: string, setIdx: number) => {
    setActiveExercises(prev =>
      prev.map(exercise => {
        if (exercise.id !== exerciseId) {
          return exercise
        }

        const nextSets = exercise.sets.filter((_, index) => index !== setIdx)

        return {
          ...exercise,
          sets: nextSets.length > 0 ? nextSets : [{ reps: '', weight: '', unit: defaultWeightUnit, completed: false }],
        }
      })
    )
  }

  const duplicateSet = (exerciseId: string, setIdx: number) => {
    setActiveExercises(prev =>
      prev.map(exercise => {
        if (exercise.id !== exerciseId) {
          return exercise
        }

        const targetSet = exercise.sets[setIdx]
        const nextSets = [...exercise.sets]
        nextSets.splice(setIdx + 1, 0, {
          ...targetSet,
          completed: false,
        })

        return {
          ...exercise,
          sets: nextSets,
        }
      })
    )
  }

  const toggleSetCompleted = (exerciseId: string, setIdx: number) => {
    let completedNow = false

    setActiveExercises(prev =>
      prev.map(exercise => {
        if (exercise.id !== exerciseId) {
          return exercise
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set, index) => {
            if (index !== setIdx) {
              return set
            }

            completedNow = !set.completed
            return { ...set, completed: !set.completed }
          }),
        }
      })
    )

    if (completedNow) {
      startRestTimer(90)
    }
  }

  const startRestTimer = (seconds: number) => {
    setRestSecondsRemaining(seconds)
    setRestActive(true)
  }

  const stopRestTimer = () => {
    setRestActive(false)
    setRestSecondsRemaining(0)
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

  const moveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    setActiveExercises(prev => {
      const currentIndex = prev.findIndex(exercise => exercise.id === exerciseId)

      if (currentIndex === -1) {
        return prev
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev
      }

      const nextExercises = [...prev]
      const [movedExercise] = nextExercises.splice(currentIndex, 1)
      nextExercises.splice(targetIndex, 0, movedExercise)

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
          unit: set.unit,
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
    stopRestTimer()
    setSavingWorkout(false)
    setView('routines')
  }

  const repeatRecentWorkout = (workout: RecentWorkout) => {
    if (activeExercises.length > 0) {
      const confirmed = window.confirm('Replace your current active workout with this previous workout?')

      if (!confirmed) {
        return
      }
    }

    const repeatedExercises = workout.exercises.map(exercise => {
      const normalizedName = normalizeExerciseKey(exercise.name)

      return {
        id: crypto.randomUUID(),
        name: exercise.name,
        muscle: exercise.muscle,
        equipment: '',
        difficulty: 'intermediate',
        instructions: '',
        gifUrl: '',
        sets: exercise.sets.length > 0
          ? exercise.sets.map(set => ({
              reps: set.reps !== null ? String(set.reps) : '',
              weight: set.weight !== null ? String(set.weight) : '',
              unit: set.unit === 'kg' ? 'kg' : 'lbs',
              completed: false,
            }))
          : [{ reps: '', weight: '', unit: defaultWeightUnit, completed: false }],
        previousPerformance: previousPerformanceLookup[normalizedName] || null,
      } satisfies ActiveExercise
    })

    setWorkoutName(workout.name)
    setActiveExercises(repeatedExercises)
    setWorkoutActive(true)
    setStartedAt(Date.now())
    setElapsedSeconds(0)
    stopRestTimer()
    setExpandedExercise(repeatedExercises[0]?.id ?? null)
    setWorkoutError(null)
    setView('active')
  }

  const saveCurrentWorkoutAsTemplate = () => {
    if (activeExercises.length === 0) {
      setWorkoutError('Add at least one exercise before saving a template.')
      return
    }

    const suggestedName = workoutName.trim() || 'My Template'
    const templateName = window.prompt('Template name', suggestedName)?.trim()

    if (!templateName) {
      return
    }

    const nextTemplate: WorkoutTemplate = {
      id: crypto.randomUUID(),
      name: templateName,
      createdAt: new Date().toISOString(),
      exercises: activeExercises.map(exercise => ({
        name: exercise.name,
        muscle: exercise.muscle,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions,
        gifUrl: exercise.gifUrl,
        sets: exercise.sets.map(set => ({
          reps: set.reps,
          weight: set.weight,
          unit: set.unit,
        })),
      })),
    }

    setTemplates(prev => {
      const next = [nextTemplate, ...prev.filter(template => template.name !== templateName)].slice(0, 12)
      persistWorkoutTemplates(next)
      return next
    })
    setWorkoutError(null)
  }

  const applyTemplate = (template: WorkoutTemplate) => {
    if (activeExercises.length > 0) {
      const confirmed = window.confirm('Replace your current active workout with this template?')

      if (!confirmed) {
        return
      }
    }

    const templatedExercises = template.exercises.map(exercise => ({
      id: crypto.randomUUID(),
      name: exercise.name,
      muscle: exercise.muscle,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      gifUrl: exercise.gifUrl,
      sets: exercise.sets.length > 0
        ? exercise.sets.map(set => ({
            reps: set.reps,
            weight: set.weight,
            unit: set.unit,
            completed: false,
          }))
        : [{ reps: '', weight: '', unit: defaultWeightUnit, completed: false }],
      previousPerformance: previousPerformanceLookup[normalizeExerciseKey(exercise.name)] || null,
    }))

    setWorkoutName(template.name)
    setActiveExercises(templatedExercises)
    setWorkoutActive(true)
    setStartedAt(Date.now())
    setElapsedSeconds(0)
    stopRestTimer()
    setExpandedExercise(templatedExercises[0]?.id ?? null)
    setWorkoutError(null)
    setView('active')
  }

  const deleteTemplate = (templateId: string) => {
    setTemplates(prev => {
      const next = prev.filter(template => template.id !== templateId)
      persistWorkoutTemplates(next)
      return next
    })
  }

  const deleteRecentWorkout = async (workoutId: string, workoutTitle: string) => {
    const confirmed = window.confirm(`Delete "${workoutTitle}" from your workout history?`)

    if (!confirmed) {
      return
    }

    setDeletingWorkoutId(workoutId)
    setWorkoutError(null)

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId)

    if (error) {
      console.error('Failed to delete workout', error)
      setWorkoutError('Could not delete that workout right now.')
      setDeletingWorkoutId(null)
      return
    }

    setRecentWorkouts(prev => prev.filter(workout => workout.id !== workoutId))
    if (expandedRecentWorkout === workoutId) {
      setExpandedRecentWorkout(null)
    }
    setDeletingWorkoutId(null)
    await loadRecentWorkouts()
  }

  // ── Routine Builder functions ──────────────────────────────────────────
  const openBuilder = (template?: WorkoutTemplate) => {
    if (template) {
      setBuilderName(template.name)
      setBuilderExercises(template.exercises.map(ex => ({
        id: crypto.randomUUID(),
        name: ex.name,
        muscle: ex.muscle,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        instructions: ex.instructions,
        gifUrl: ex.gifUrl,
        targetSets: ex.sets.length > 0 ? ex.sets.length : 3,
      })))
    } else {
      setBuilderName('')
      setBuilderExercises([])
    }
    setSearchQuery('')
    setSearchResults([])
    setView('building')
  }

  const addExerciseToBuilder = (exercise: SearchedExercise) => {
    if (builderExercises.find(e => e.name === exercise.name)) return
    setBuilderExercises(prev => [...prev, {
      id: crypto.randomUUID(),
      name: exercise.name,
      muscle: exercise.muscle,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      gifUrl: exercise.gifUrl,
      targetSets: 3,
    }])
  }

  const saveRoutineAsTemplate = () => {
    if (!builderName.trim() || builderExercises.length === 0) return
    const nextTemplate: WorkoutTemplate = {
      id: crypto.randomUUID(),
      name: builderName.trim(),
      createdAt: new Date().toISOString(),
      exercises: builderExercises.map(ex => ({
        name: ex.name,
        muscle: ex.muscle,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        instructions: ex.instructions,
        gifUrl: ex.gifUrl,
        sets: Array.from({ length: ex.targetSets }, () => ({ reps: '', weight: '', unit: defaultWeightUnit })),
      })),
    }
    setTemplates(prev => {
      const next = [nextTemplate, ...prev.filter(t => t.name !== builderName.trim())].slice(0, 12)
      persistWorkoutTemplates(next)
      return next
    })
    setBuilderName('')
    setBuilderExercises([])
    setView('routines')
  }
  // ────────────────────────────────────────────────────────────────────────

  const timerLabel = formatElapsedTime(elapsedSeconds)
  const restTimerLabel = formatElapsedTime(restSecondsRemaining)
  const totalSetCount = activeExercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  const completedSetCount = activeExercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0)

  return (
    <>
      <style>{`
        .workout-wrapper { padding: 32px; max-width: 1152px; margin: 0 auto; }
        .workout-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
        .workout-grid { display: grid; grid-template-columns: minmax(320px, 0.78fr) minmax(0, 1.22fr); gap: 28px; align-items: start; }
        .workout-grid-equal { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start; }
        .routines-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .workout-primary { order: 2; }
        .workout-secondary { order: 1; }
        .workout-section { margin-bottom: 24px; }
        .session-shell { position: sticky; top: 32px; border-radius: 18px; padding: 24px; background: linear-gradient(180deg, #1E1E1E 0%, #171717 100%); border: 0.5px solid rgba(255,255,255,0.08); box-shadow: 0 24px 48px rgba(0,0,0,0.22); }
        .session-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
        .session-summary-card { border-radius: 12px; padding: 12px 14px; background-color: #202020; border: 0.5px solid rgba(255,255,255,0.06); }
        .session-summary-label { color: #7A7A7A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .session-summary-value { color: #fff; font-size: 20px; font-weight: 800; line-height: 1; }
        .exercise-card { border: 0.5px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; background: linear-gradient(180deg, #252525 0%, #1D1D1D 100%); }
        .exercise-card + .exercise-card { margin-top: 12px; }
        .exercise-card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; cursor: pointer; }
        .exercise-card-body { padding: 16px; background-color: #141414; border-top: 0.5px solid rgba(255,255,255,0.06); }
        .set-list { display: flex; flex-direction: column; gap: 12px; }
        .set-row { padding: 14px; border-radius: 14px; background: linear-gradient(180deg, #191919 0%, #171717 100%); border: 0.5px solid rgba(255,255,255,0.06); }
        .set-row-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .set-label-cell { display: flex; align-items: center; gap: 10px; }
        .set-actions { display: flex; align-items: center; gap: 8px; }
        .set-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; border-radius: 999px; background-color: rgba(232,0,45,0.12); color: #E8002D; font-size: 13px; font-weight: 700; }
        .set-row-grid { display: grid; grid-template-columns: 1.25fr 1fr 1fr 0.9fr 1fr; gap: 10px; align-items: end; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label { color: #7A7A7A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .previous-cell { min-height: 48px; border-radius: 12px; padding: 0 12px; display: flex; align-items: center; color: #A0A0A0; font-size: 13px; background-color: #1E1E1E; border: 0.5px solid rgba(255,255,255,0.05); }
        .set-input, .set-select { width: 100%; min-height: 48px; background-color: #1E1E1E; border: 0.5px solid rgba(255,255,255,0.08); color: #fff; border-radius: 12px; padding: 10px 12px; font-size: 16px; outline: none; }
        .set-select { appearance: none; }
        .set-done-btn { min-height: 48px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease; }
        .set-row-complete .set-input, .set-row-complete .set-select, .set-row-complete .previous-cell { border-color: rgba(74,222,128,0.18); }
        .set-row-complete .previous-cell { color: #B4F5C8; }
        .session-toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
        .session-link-btn { color: #A0A0A0; background: none; border: none; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; padding: 0; }
        .mini-meta { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background-color: rgba(255,255,255,0.05); color: #A0A0A0; font-size: 12px; }
        @media (max-width: 1023px) {
          .workout-wrapper { padding: 72px 16px 24px; }
          .workout-header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
          .workout-grid { grid-template-columns: 1fr; gap: 24px; }
          .workout-primary { order: 1; }
          .workout-secondary { order: 2; }
          .session-shell { position: static; }
          .session-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .set-row-grid { grid-template-columns: 1fr 1fr; }
          .field-group.previous-group { grid-column: span 2; }
          .field-group.done-group { grid-column: span 2; }
        }
      `}</style>
      <div className="workout-wrapper">
        {/* ── HEADER ── */}
        <div className="workout-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {view !== 'routines' && (
              <button
                onClick={() => { setView('routines'); setSearchResults([]) }}
                style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontFamily: 'inherit', padding: 0, flexShrink: 0 }}
              >
                <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} /> Back
              </button>
            )}
            <div>
              <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>
                {view === 'routines' ? 'Workout' : view === 'building' ? (builderExercises.length > 0 || builderName ? (builderName || 'New Routine') : 'New Routine') : workoutName}
              </h1>
              <p style={{ color: '#A0A0A0', marginTop: 4, fontSize: 14 }}>
                {view === 'routines' ? 'Your saved workout routines' : view === 'building' ? 'Name your routine and add exercises' : 'Log your sets — stay locked in'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {view === 'routines' && (
              <button
                onClick={() => openBuilder()}
                style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} /> New Routine
              </button>
            )}
            {view === 'building' && (
              <button
                onClick={saveRoutineAsTemplate}
                disabled={!builderName.trim() || builderExercises.length === 0}
                style={{ backgroundColor: builderName.trim() && builderExercises.length > 0 ? '#E8002D' : '#2A2A2A', color: builderName.trim() && builderExercises.length > 0 ? '#fff' : '#606060', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: builderName.trim() && builderExercises.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              >
                Save Routine
              </button>
            )}
            {view === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {restActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <span style={{ color: '#A0A0A0', fontSize: 12, fontWeight: 600 }}>Rest</span>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{restTimerLabel}</span>
                    <button onClick={stopRestTimer} style={{ background: 'none', border: 'none', color: '#A0A0A0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>Stop</button>
                  </div>
                )}
                <button
                  onClick={() => void finishWorkout()}
                  disabled={savingWorkout}
                  style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {savingWorkout ? 'Saving...' : 'Finish Workout'}
                </button>
              </div>
            )}
          </div>
        </div>

        {(searchError || workoutError) && (
          <div style={{ marginBottom: 24, borderRadius: 12, padding: 14, backgroundColor: 'rgba(232,0,45,0.12)', border: '0.5px solid rgba(232,0,45,0.4)', color: '#fff', fontSize: 13 }}>
            {searchError || workoutError}
          </div>
        )}

        {/* ── ROUTINES VIEW ── */}
        {view === 'routines' && (
          <>
            {templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <Dumbbell size={48} style={{ color: '#2A2A2A', margin: '0 auto 16px' }} />
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>No routines yet</p>
                <p style={{ color: '#A0A0A0', marginBottom: 24 }}>Create your first routine to get started</p>
                <button onClick={() => openBuilder()} style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Create Routine
                </button>
              </div>
            ) : (
              <div className="routines-grid" style={{ marginBottom: 40 }}>
                {templates.map(template => (
                  <div key={template.id} style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{template.name}</p>
                        <p style={{ color: '#A0A0A0', fontSize: 13 }}>{template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => openBuilder(template)} style={{ color: '#A0A0A0', background: 'none', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Edit</button>
                        <button onClick={() => deleteTemplate(template.id)} style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, flex: 1 }}>
                      {template.exercises.map(ex => (
                        <div key={ex.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#E8002D', flexShrink: 0 }} />
                          <span style={{ color: '#A0A0A0', fontSize: 13, textTransform: 'capitalize', flex: 1 }}>{ex.name}</span>
                          <span style={{ color: '#606060', fontSize: 12 }}>{ex.sets.length} sets</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => applyTemplate(template)}
                      style={{ width: '100%', backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      ▶ Start Workout
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recent workouts */}
            <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Recent Workouts</h2>
              {loadingRecentWorkouts ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Loading...</p>
              ) : recentWorkouts.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Your saved workouts will appear here.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentWorkouts.map(workout => (
                    <div key={workout.id} style={{ padding: 16, borderRadius: 12, backgroundColor: '#252525' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, cursor: 'pointer' }} onClick={() => setExpandedRecentWorkout(expandedRecentWorkout === workout.id ? null : workout.id)}>
                        <p style={{ color: '#fff', fontWeight: 600 }}>{workout.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: '#A0A0A0' }}>{workout.date}</span>
                          {expandedRecentWorkout === workout.id ? <ChevronUp size={14} style={{ color: '#A0A0A0' }} /> : <ChevronDown size={14} style={{ color: '#A0A0A0' }} />}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#A0A0A0' }}>
                          <Clock size={12} /> {workout.durationMinutes} min
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#A0A0A0' }}>
                          <Dumbbell size={12} /> {workout.exercises.length} exercises
                        </span>
                        <button onClick={() => repeatRecentWorkout(workout)} style={{ color: '#E8002D', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>Repeat</button>
                        <button onClick={() => void deleteRecentWorkout(workout.id, workout.name)} disabled={deletingWorkoutId === workout.id} style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', padding: 0 }}>
                          {deletingWorkoutId === workout.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                      {expandedRecentWorkout === workout.id && (
                        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {workout.exercises.map(exercise => (
                            <div key={exercise.id} style={{ padding: 12, borderRadius: 10, backgroundColor: '#1E1E1E' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{exercise.name}</p>
                                <span style={{ color: '#A0A0A0', fontSize: 12 }}>{exercise.setsCount} sets</span>
                              </div>
                              <p style={{ color: '#A0A0A0', fontSize: 12 }}>{exercise.muscle}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── BUILDING VIEW ── */}
        {view === 'building' && (
          <div className="workout-grid-equal">
            {/* Left: exercise search */}
            <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Find Exercises</h2>
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
                        onClick={() => view === 'building' ? addExerciseToBuilder(exercise) : addExercise(exercise)}
                        style={{ backgroundColor: (view === 'building' && builderExercises.find(e => e.name === exercise.name)) ? '#2A2A2A' : 'rgba(232,0,45,0.12)', color: (view === 'building' && builderExercises.find(e => e.name === exercise.name)) ? '#606060' : '#E8002D', border: `0.5px solid ${(view === 'building' && builderExercises.find(e => e.name === exercise.name)) ? 'rgba(255,255,255,0.06)' : 'rgba(232,0,45,0.4)'}`, borderRadius: 6, padding: '6px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        {view === 'building' && builderExercises.find(e => e.name === exercise.name) ? 'Added ✓' : '+ Add'}
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

            {/* ── Builder right panel: routine name + exercise list ── */}
            <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Your Routine</h2>
              <input
                placeholder="Routine name (e.g. Arms Day)"
                value={builderName}
                onChange={e => setBuilderName(e.target.value)}
                style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px', width: '100%', outline: 'none', fontSize: 14, fontFamily: 'inherit', marginBottom: 16 }}
              />
              {builderExercises.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 12, border: '0.5px dashed rgba(255,255,255,0.1)', backgroundColor: '#252525' }}>
                  <Plus size={28} style={{ color: '#2A2A2A', margin: '0 auto 10px' }} />
                  <p style={{ color: '#A0A0A0', fontSize: 13 }}>Search and add exercises on the left</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {builderExercises.map((ex, i) => (
                    <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, backgroundColor: '#252525' }}>
                      <span style={{ color: '#E8002D', fontWeight: 700, fontSize: 13, width: 18, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{ex.name}</p>
                        <p style={{ color: '#A0A0A0', fontSize: 12, textTransform: 'capitalize', marginTop: 1 }}>{ex.muscle}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => setBuilderExercises(prev => prev.map((e, idx) => idx === i ? { ...e, targetSets: Math.max(1, e.targetSets - 1) } : e))}
                          style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontFamily: 'inherit' }}
                        >−</button>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{ex.targetSets}</span>
                        <button
                          onClick={() => setBuilderExercises(prev => prev.map((e, idx) => idx === i ? { ...e, targetSets: e.targetSets + 1 } : e))}
                          style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontFamily: 'inherit' }}
                        >+</button>
                        <span style={{ color: '#606060', fontSize: 12 }}>sets</span>
                      </div>
                      <button
                        onClick={() => setBuilderExercises(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVE VIEW ── */}
        {view === 'active' && (
          <div className="workout-grid">
            <div className="workout-secondary">
              {/* Search to add more exercises mid-workout */}
              <div style={{ marginBottom: 24, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Add Another Exercise</h2>
                <p style={{ color: '#A0A0A0', fontSize: 13, marginBottom: 16 }}>Search and add more movements to your session.</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search exercises"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && void searchExercises()}
                      style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px 11px 38px', width: '100%', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
                    />
                  </div>
                  <button
                    onClick={() => void searchExercises()}
                    disabled={searching}
                    style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    {searching ? '...' : 'Search'}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                    {searchResults.map(exercise => (
                      <div key={exercise.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{exercise.name}</p>
                          <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                            <span style={{ color: '#A0A0A0', fontSize: 12, textTransform: 'capitalize' }}>{exercise.muscle}</span>
                            <span style={{ color: '#3A3A3A' }}>·</span>
                            <span style={{ color: difficultyColor[exercise.difficulty] || '#A0A0A0', fontSize: 12, textTransform: 'capitalize' }}>{exercise.difficulty}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => addExercise(exercise)}
                          style={{ backgroundColor: 'rgba(232,0,45,0.12)', color: '#E8002D', border: '0.5px solid rgba(232,0,45,0.4)', borderRadius: 6, padding: '6px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && !searching && (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <Dumbbell size={28} style={{ color: '#2A2A2A', margin: '0 auto 10px' }} />
                    <p style={{ color: '#A0A0A0', fontSize: 13 }}>Search to add exercises</p>
                  </div>
                )}
              </div>
            </div>

            <div className="workout-primary">
              <div className="session-shell">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <input
                      value={workoutName}
                      onChange={e => setWorkoutName(e.target.value)}
                      style={{ background: 'none', border: 'none', color: '#fff', fontSize: 26, fontWeight: 800, outline: 'none', padding: 0, width: '100%', letterSpacing: '-0.03em', fontFamily: 'inherit' }}
                    />
                    <p style={{ color: '#A0A0A0', fontSize: 13, marginTop: 4 }}>{activeExercises.length} exercises in this session</p>
                  </div>
                  <div className="mini-meta">
                    {workoutActive ? (
                      <>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#E8002D' }} />
                        <span className="text-xs font-semibold" style={{ color: '#E8002D' }}>{timerLabel}</span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold">Ready</span>
                  )}
                </div>
              </div>

              <div className="session-summary">
                <div className="session-summary-card">
                  <div className="session-summary-label">Exercises</div>
                  <div className="session-summary-value">{activeExercises.length}</div>
                </div>
                <div className="session-summary-card">
                  <div className="session-summary-label">Total Sets</div>
                  <div className="session-summary-value">{totalSetCount}</div>
                </div>
                <div className="session-summary-card">
                  <div className="session-summary-label">Completed</div>
                  <div className="session-summary-value">{completedSetCount}</div>
                </div>
                <div className="session-summary-card">
                  <div className="session-summary-label">Rest</div>
                  <div className="session-summary-value" style={{ color: restActive ? '#E8002D' : '#fff' }}>
                    {restActive ? restTimerLabel : 'Off'}
                  </div>
                </div>
              </div>

              {activeExercises.length === 0 ? (
                <div className="py-16 text-center">
                  <Plus size={32} style={{ color: '#2A2A2A', margin: '0 auto 12px' }} />
                  <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Start by adding your first exercise</p>
                  <p style={{ color: '#A0A0A0', fontSize: 14 }}>Use the search panel to build your workout session.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                  {activeExercises.map((exercise, exerciseIndex) => (
                    <div key={exercise.id} className="exercise-card">
                      <div
                        className="exercise-card-header"
                        onClick={() => setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)}
                      >
                        <div>
                          <p className="text-white font-semibold text-sm capitalize">{exercise.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs" style={{ color: '#606060' }}>#{exerciseIndex + 1}</span>
                            <span style={{ color: '#3A3A3A' }}>•</span>
                            <span className="text-xs capitalize" style={{ color: '#A0A0A0' }}>{exercise.muscle}</span>
                            <span style={{ color: '#3A3A3A' }}>•</span>
                            <span className="text-xs capitalize" style={{ color: '#A0A0A0' }}>{exercise.equipment}</span>
                            <span style={{ color: '#3A3A3A' }}>•</span>
                            <span className="text-xs" style={{ color: '#A0A0A0' }}>{exercise.sets.length} sets</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={event => {
                              event.stopPropagation()
                              moveExercise(exercise.id, 'up')
                            }}
                            disabled={exerciseIndex === 0}
                            style={{
                              color: exerciseIndex === 0 ? '#505050' : '#A0A0A0',
                              background: 'none',
                              border: 'none',
                              cursor: exerciseIndex === 0 ? 'not-allowed' : 'pointer',
                              fontSize: 13,
                              fontFamily: 'inherit',
                              padding: 0,
                            }}
                            aria-label={`Move ${exercise.name} up`}
                          >
                            ↑
                          </button>
                          <button
                            onClick={event => {
                              event.stopPropagation()
                              moveExercise(exercise.id, 'down')
                            }}
                            disabled={exerciseIndex === activeExercises.length - 1}
                            style={{
                              color: exerciseIndex === activeExercises.length - 1 ? '#505050' : '#A0A0A0',
                              background: 'none',
                              border: 'none',
                              cursor: exerciseIndex === activeExercises.length - 1 ? 'not-allowed' : 'pointer',
                              fontSize: 13,
                              fontFamily: 'inherit',
                              padding: 0,
                            }}
                            aria-label={`Move ${exercise.name} down`}
                          >
                            ↓
                          </button>
                          <button onClick={event => { event.stopPropagation(); removeExercise(exercise.id) }} style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <X size={15} />
                          </button>
                          {expandedExercise === exercise.id ? <ChevronUp size={15} style={{ color: '#A0A0A0' }} /> : <ChevronDown size={15} style={{ color: '#A0A0A0' }} />}
                        </div>
                      </div>

                      {expandedExercise === exercise.id && (
                        <div className="exercise-card-body">
                          <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, backgroundColor: '#1E1E1E' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#A0A0A0' }}>PREVIOUS</p>
                            {!exercise.previousPerformance ? (
                              <p style={{ color: '#606060', fontSize: 12 }}>No previous sets recorded yet</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <p style={{ color: '#A0A0A0', fontSize: 12 }}>
                                  Last workout: {exercise.previousPerformance.lastWorkoutDate}
                                </p>
                                {exercise.previousPerformance.bestSet ? (
                                  <p style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
                                    Best set: {exercise.previousPerformance.bestSet}
                                  </p>
                                ) : null}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {exercise.previousPerformance.lastSets.map((entry, index) => (
                                    <p key={`${exercise.id}-previous-${index}`} style={{ color: '#A0A0A0', fontSize: 12 }}>
                                      Set {index + 1}: {entry}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {exercise.instructions && (
                            <p style={{ color: '#A0A0A0', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                              {exercise.instructions}
                            </p>
                          )}
                          <div className="set-list">
                            {exercise.sets.map((set, idx) => (
                              <div key={idx} className={`set-row ${set.completed ? 'set-row-complete' : ''}`}>
                                <div className="set-row-top">
                                  <div className="set-label-cell">
                                    <span className="set-pill">{idx + 1}</span>
                                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Set {idx + 1}</span>
                                  </div>
                                  <div className="set-actions">
                                    <button
                                      onClick={() => duplicateSet(exercise.id, idx)}
                                      style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, fontFamily: 'inherit' }}
                                      aria-label={`Duplicate set ${idx + 1}`}
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      onClick={() => removeSet(exercise.id, idx)}
                                      style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                      aria-label={`Remove set ${idx + 1}`}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div className="set-row-grid">
                                  <div className="field-group previous-group">
                                    <span className="field-label">Previous</span>
                                    <div className="previous-cell">
                                      {exercise.previousPerformance?.lastSets[idx] || '--'}
                                    </div>
                                  </div>
                                  <label className="field-group">
                                    <span className="field-label">Weight</span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={set.weight}
                                      onChange={e => updateSet(exercise.id, idx, 'weight', e.target.value)}
                                      className="set-input"
                                    />
                                  </label>
                                  <label className="field-group">
                                    <span className="field-label">Reps</span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={set.reps}
                                      onChange={e => updateSet(exercise.id, idx, 'reps', e.target.value)}
                                      className="set-input"
                                    />
                                  </label>
                                  <label className="field-group">
                                    <span className="field-label">Unit</span>
                                    <select
                                      value={set.unit}
                                      onChange={e => updateSet(exercise.id, idx, 'unit', e.target.value)}
                                      className="set-select"
                                    >
                                      <option value="lbs">lbs</option>
                                      <option value="kg">kg</option>
                                    </select>
                                  </label>
                                  <div className="field-group done-group">
                                    <span className="field-label">Status</span>
                                    <button
                                      onClick={() => toggleSetCompleted(exercise.id, idx)}
                                      className="set-done-btn"
                                      style={{
                                        backgroundColor: set.completed ? 'rgba(74,222,128,0.12)' : '#1E1E1E',
                                        border: set.completed ? '0.5px solid rgba(74,222,128,0.35)' : '0.5px solid rgba(255,255,255,0.08)',
                                        color: set.completed ? '#4ade80' : '#A0A0A0',
                                      }}
                                    >
                                      {set.completed ? 'Completed' : 'Mark Complete'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="session-toolbar">
                            <button
                              onClick={saveCurrentWorkoutAsTemplate}
                              className="session-link-btn"
                            >
                              Save Template
                            </button>
                            <button
                              onClick={() => addSet(exercise.id)}
                              className="session-link-btn"
                              style={{ color: '#E8002D' }}
                            >
                              + Add Set
                            </button>
                            <button
                              onClick={() => startRestTimer(60)}
                              className="session-link-btn"
                            >
                              Rest 60s
                            </button>
                            <button
                              onClick={() => startRestTimer(90)}
                              className="session-link-btn"
                            >
                              Rest 90s
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  )
}

function parseOptionalNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function loadWorkoutTemplates(): WorkoutTemplate[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(WORKOUT_TEMPLATES_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistWorkoutTemplates(templates: WorkoutTemplate[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(WORKOUT_TEMPLATES_KEY, JSON.stringify(templates))
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
        sets: exerciseSets
          .filter(set => set.workout_exercise_id === exercise.id)
          .map(set => ({
            id: set.id,
            reps: set.reps,
            weight: set.weight,
            unit: set.unit,
          })),
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

function buildPreviousSetLookup(
  workouts: WorkoutRow[],
  workoutExercises: WorkoutExerciseRow[],
  exerciseSets: ExerciseSetRow[]
): PreviousSetLookup {
  const sortedWorkouts = [...workouts].sort((a, b) => {
    const dateCompare = b.workout_date.localeCompare(a.workout_date)
    if (dateCompare !== 0) {
      return dateCompare
    }

    return b.created_at.localeCompare(a.created_at)
  })

  const lookup: PreviousSetLookup = {}

  for (const workout of sortedWorkouts) {
    const exercisesForWorkout = workoutExercises.filter(exercise => exercise.workout_id === workout.id)

    for (const exercise of exercisesForWorkout) {
      const key = normalizeExerciseKey(exercise.exercise_name)

      if (lookup[key]) {
        continue
      }

      const formattedSets = exerciseSets
        .filter(set => set.workout_exercise_id === exercise.id)
        .sort((a, b) => a.set_order - b.set_order)
        .map(set => formatSetSummary(set.weight, set.unit, set.reps))

      const allSetsForExerciseName = workoutExercises
        .filter(candidate => normalizeExerciseKey(candidate.exercise_name) === key)
        .flatMap(candidate =>
          exerciseSets.filter(set => set.workout_exercise_id === candidate.id)
        )

      if (formattedSets.length > 0) {
        lookup[key] = {
          lastWorkoutDate: formatWorkoutDate(workout.workout_date),
          lastSets: formattedSets,
          bestSet: findBestSetSummary(allSetsForExerciseName),
        }
      }
    }
  }

  return lookup
}

function formatSetSummary(weight: number | null, unit: string, reps: number | null) {
  const weightPart = weight !== null ? `${weight} ${unit}` : 'weight not logged'
  const repsPart = reps !== null ? `${reps} reps` : 'reps not logged'

  return `${weightPart} · ${repsPart}`
}

function normalizeExerciseKey(value: string) {
  return value.trim().toLowerCase()
}

function findBestSetSummary(sets: ExerciseSetRow[]) {
  if (sets.length === 0) {
    return null
  }

  const bestSet = [...sets].sort((a, b) => {
    const weightA = a.weight ?? 0
    const weightB = b.weight ?? 0

    if (weightA !== weightB) {
      return weightB - weightA
    }

    const repsA = a.reps ?? 0
    const repsB = b.reps ?? 0

    return repsB - repsA
  })[0]

  return formatSetSummary(bestSet.weight, bestSet.unit, bestSet.reps)
}

function formatWorkoutDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}
