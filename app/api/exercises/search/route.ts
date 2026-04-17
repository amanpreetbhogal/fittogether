import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ExerciseDbExercise = {
  id?: string | number
  exerciseId?: string | number
  name?: string
  bodyPart?: string
  bodyParts?: string[]
  target?: string
  targetMuscles?: string[]
  equipment?: string
  equipments?: string[]
  gifUrl?: string
  imageUrl?: string
  secondaryMuscles?: string[]
  instructions?: string[]
  keywords?: string[]
  exerciseType?: string
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

const RAPID_API_HOST =
  process.env.EXERCISEDB_RAPIDAPI_HOST ||
  'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com'
const RAPID_API_KEY = process.env.EXERCISEDB_RAPIDAPI_KEY
const SEARCH_BASE_URL = 'https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const debug = searchParams.get('debug') === '1'

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  if (!RAPID_API_KEY) {
    return NextResponse.json(
      { error: 'ExerciseDB API key is missing on this deployment.' },
      { status: 500 }
    )
  }

  try {
    const result = await fetchMatchingExercises(query, debug)

    if (debug) {
      return NextResponse.json(result)
    }

    return NextResponse.json({ results: result })
  } catch (error) {
    console.error('Exercise search request failed', error)

    return NextResponse.json(
      { error: 'Could not search exercises right now.' },
      { status: 500 }
    )
  }
}

async function fetchMatchingExercises(query: string, debug = false) {
  const normalizedQuery = normalizeText(query)
  const candidateUrls = [
    `${SEARCH_BASE_URL}/api/v1/exercises?limit=12&offset=0&name=${encodeURIComponent(query)}`,
    `${SEARCH_BASE_URL}/api/v1/exercises?name=${encodeURIComponent(query)}&limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/exercises?search=${encodeURIComponent(query)}&limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/exercises/search?query=${encodeURIComponent(query)}&limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/exercises/search?search=${encodeURIComponent(query)}&limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/exercises/search?q=${encodeURIComponent(query)}&limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/exercises/search/${encodeURIComponent(query)}?limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/exercises-by-search/${encodeURIComponent(query)}?limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/search/${encodeURIComponent(query)}?limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=12&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/search?query=${encodeURIComponent(query)}&limit=12&offset=0`,
    `${SEARCH_BASE_URL}/exercises/search/${encodeURIComponent(query)}?limit=12&offset=0`,
    `${SEARCH_BASE_URL}/exercises/search?q=${encodeURIComponent(query)}&limit=12&offset=0`,
    `${SEARCH_BASE_URL}/search/${encodeURIComponent(query)}?limit=12&offset=0`,
  ]

  let lastError = 'ExerciseDB search failed.'
  let exercises: ExerciseDbExercise[] = []
  const debugAttempts: Array<{ url: string; ok: boolean; sample: unknown }> = []

  for (const url of candidateUrls) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPID_API_KEY as string,
        'x-rapidapi-host': RAPID_API_HOST as string,
      },
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as
      | ExerciseDbExercise[]
      | { results?: ExerciseDbExercise[]; data?: ExerciseDbExercise[]; message?: string }
      | null

    if (debug) {
      debugAttempts.push({
        url,
        ok: response.ok,
        sample: payload,
      })
    }

    if (!response.ok) {
      lastError =
        typeof payload === 'object' && payload && 'message' in payload && payload.message
          ? payload.message
          : lastError
      continue
    }

    exercises = extractExercises(payload)

    if (exercises.length > 0) {
      break
    }
  }

  if (exercises.length === 0) {
    const fallbackExercises = await fetchExerciseFallbackPool()
    exercises = fallbackExercises
      .map(exercise => ({
        exercise,
        score: scoreExercise(exercise, normalizedQuery),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.exercise)
  }

  if (debug) {
    return {
      results: exercises
        .map(normalizeExercise)
        .filter((exercise): exercise is NormalizedExercise => exercise !== null)
        .slice(0, 8),
      rawCount: exercises.length,
      lastError,
      debugAttempts,
    }
  }

  if (exercises.length === 0) {
    throw new Error(lastError)
  }

  return exercises
    .map(normalizeExercise)
    .filter((exercise): exercise is NormalizedExercise => exercise !== null)
    .slice(0, 8)
}

function extractExercises(
  payload: ExerciseDbExercise[] | { results?: ExerciseDbExercise[]; data?: ExerciseDbExercise[] } | null
) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload?.results && Array.isArray(payload.results)) {
    return payload.results
  }

  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

function normalizeExercise(exercise: ExerciseDbExercise): NormalizedExercise | null {
  const name = exercise.name?.trim()
  const id = exercise.id != null ? String(exercise.id) : exercise.exerciseId != null ? String(exercise.exerciseId) : ''

  if (!name || !id) {
    return null
  }

  const instructions = Array.isArray(exercise.instructions)
    ? exercise.instructions.filter(Boolean).join(' ')
    : ''

  return {
    id,
    name,
    type:
      exercise.exerciseType?.trim().toLowerCase() ||
      exercise.bodyPart?.trim().toLowerCase() ||
      exercise.bodyParts?.[0]?.trim().toLowerCase() ||
      'strength',
    muscle:
      exercise.target?.trim().toLowerCase() ||
      exercise.targetMuscles?.[0]?.trim().toLowerCase() ||
      exercise.secondaryMuscles?.[0]?.trim().toLowerCase() ||
      'full body',
    equipment:
      exercise.equipment?.trim().toLowerCase() ||
      exercise.equipments?.[0]?.trim().toLowerCase() ||
      'bodyweight',
    difficulty: inferDifficulty(exercise),
    instructions,
    source: 'exercisedb',
    gifUrl: exercise.gifUrl?.trim() || exercise.imageUrl?.trim() || '',
  }
}

async function fetchExerciseFallbackPool() {
  const fallbackUrls = [
    `${SEARCH_BASE_URL}/api/v1/exercises?limit=100&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/exercises?limit=200&offset=0`,
    `${SEARCH_BASE_URL}/api/v1/exercises`,
    `${SEARCH_BASE_URL}/exercises?limit=100&offset=0`,
    `${SEARCH_BASE_URL}/exercises`,
  ]

  for (const url of fallbackUrls) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPID_API_KEY as string,
        'x-rapidapi-host': RAPID_API_HOST as string,
      },
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as
      | ExerciseDbExercise[]
      | { results?: ExerciseDbExercise[]; data?: ExerciseDbExercise[] }
      | null

    if (!response.ok) {
      continue
    }

    const extracted = extractExercises(payload)
    if (extracted.length > 0) {
      return extracted
    }
  }

  return []
}

function scoreExercise(exercise: ExerciseDbExercise, normalizedQuery: string) {
  const haystack = normalizeText(
    [
      exercise.name,
      exercise.target,
      exercise.bodyPart,
      ...(exercise.bodyParts || []),
      exercise.equipment,
      ...(exercise.equipments || []),
      ...(exercise.targetMuscles || []),
      ...(exercise.secondaryMuscles || []),
      ...(exercise.instructions || []),
      ...(exercise.keywords || []),
    ]
      .filter(Boolean)
      .join(' ')
  )

  const normalizedName = normalizeText(exercise.name || '')
  if (!normalizedName) return 0

  if (normalizedName === normalizedQuery) return 100
  if (normalizedName.startsWith(normalizedQuery)) return 80
  if (normalizedName.includes(normalizedQuery)) return 60

  const queryWords = normalizedQuery.split(' ').filter(Boolean)
  if (queryWords.length === 0) return 0

  const matchingWords = queryWords.filter(word => haystack.includes(word)).length
  return matchingWords > 0 ? matchingWords * 8 : 0
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function inferDifficulty(exercise: ExerciseDbExercise) {
  const keywordText = normalizeText([...(exercise.keywords || []), exercise.name || ''].join(' '))

  if (keywordText.includes('beginner')) return 'beginner'
  if (keywordText.includes('advanced') || keywordText.includes('expert')) return 'expert'
  return 'intermediate'
}
