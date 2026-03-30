import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ExerciseDbExercise = {
  exerciseId?: string
  name?: string
  gifUrl?: string
  targetMuscles?: string[]
  bodyParts?: string[]
  equipments?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
}

type NormalizedExercise = {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const response = await fetch(
      `https://exercisedb-api.vercel.app/api/v1/exercises/search?q=${encodeURIComponent(query)}&limit=8&offset=0&threshold=0.3`,
      {
        cache: 'no-store',
      }
    )

    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; data?: ExerciseDbExercise[]; message?: string; error?: string }
      | null

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            payload && typeof payload === 'object' && typeof payload.error === 'string'
              ? payload.error
              : payload && typeof payload === 'object' && typeof payload.message === 'string'
                ? payload.message
              : 'Exercise search failed.',
        },
        { status: response.status }
      )
    }

    const results = Array.isArray(payload?.data)
      ? payload.data
          .filter(exercise => exercise.name)
          .map(normalizeExercise)
      : []

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Exercise search request failed', error)

    return NextResponse.json(
      { error: 'Could not search exercises right now.' },
      { status: 500 }
    )
  }
}

function normalizeExercise(exercise: ExerciseDbExercise): NormalizedExercise {
  const name = exercise.name?.trim() || 'Exercise'
  const muscle = firstValue(exercise.targetMuscles) || firstValue(exercise.bodyParts) || 'full body'
  const equipment = firstValue(exercise.equipments) || 'bodyweight'
  const instructions = Array.isArray(exercise.instructions)
    ? exercise.instructions.join(' ')
    : ''

  return {
    id: exercise.exerciseId || `${name}-${muscle}-${equipment}`.toLowerCase().replace(/\s+/g, '-'),
    name,
    type: 'strength',
    muscle,
    equipment,
    difficulty: 'intermediate',
    instructions,
    source: 'exercisedb',
    gifUrl: exercise.gifUrl?.trim() || '',
  }
}

function firstValue(values: string[] | undefined) {
  return Array.isArray(values) && values.length > 0 ? values[0].trim() : ''
}
