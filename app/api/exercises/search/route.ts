import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type WgerExerciseTranslation = {
  language?: number
  name?: string
  description?: string
}

type WgerNamedEntity = {
  name?: string
  name_en?: string
}

type WgerExerciseImage = {
  image?: string
  is_main?: boolean
}

type WgerExercise = {
  id?: number
  category?: WgerNamedEntity
  muscles?: WgerNamedEntity[]
  muscles_secondary?: WgerNamedEntity[]
  equipment?: WgerNamedEntity[]
  images?: WgerExerciseImage[]
  translations?: WgerExerciseTranslation[]
}

type WgerResponse = {
  results?: WgerExercise[]
  next?: string | null
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

const ENGLISH_LANGUAGE_ID = 2
const PAGE_LIMIT = 40
const MAX_PAGES = 6

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const exercises = await fetchMatchingExercises(query)
    return NextResponse.json({ results: exercises })
  } catch (error) {
    console.error('Exercise search request failed', error)

    return NextResponse.json(
      { error: 'Could not search exercises right now.' },
      { status: 500 }
    )
  }
}

async function fetchMatchingExercises(query: string) {
  const normalizedQuery = normalizeText(query)
  const collected: NormalizedExercise[] = []
  let nextUrl = `https://wger.de/api/v2/exerciseinfo/?language=${ENGLISH_LANGUAGE_ID}&limit=${PAGE_LIMIT}`
  let page = 0

  while (nextUrl && page < MAX_PAGES && collected.length < 12) {
    const response = await fetch(nextUrl, { cache: 'no-store' })
    const payload = (await response.json().catch(() => null)) as WgerResponse | null

    if (!response.ok) {
      throw new Error('wger exercise search failed.')
    }

    const pageMatches = (payload?.results || [])
      .map(exercise => normalizeExercise(exercise))
      .filter((exercise): exercise is NormalizedExercise => exercise !== null)
      .map(exercise => ({
        exercise,
        score: scoreExercise(exercise, normalizedQuery),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.exercise)

    for (const exercise of pageMatches) {
      if (!collected.some(existing => existing.id === exercise.id)) {
        collected.push(exercise)
      }
      if (collected.length >= 8) {
        break
      }
    }

    nextUrl = payload?.next || null
    page += 1
  }

  return collected.slice(0, 8)
}

function normalizeExercise(exercise: WgerExercise): NormalizedExercise | null {
  const translation = pickEnglishTranslation(exercise.translations)
  const name = translation?.name?.trim()

  if (!exercise.id || !name) {
    return null
  }

  const mainImage = pickExerciseImage(exercise.images)

  return {
    id: String(exercise.id),
    name,
    type: exercise.category?.name?.trim() || 'strength',
    muscle: pickMuscleName(exercise.muscles, exercise.muscles_secondary) || 'full body',
    equipment: pickEquipmentName(exercise.equipment) || 'bodyweight',
    difficulty: 'intermediate',
    instructions: stripHtml(translation.description || ''),
    source: 'wger',
    gifUrl: mainImage || '',
  }
}

function pickEnglishTranslation(translations: WgerExerciseTranslation[] | undefined) {
  if (!Array.isArray(translations)) {
    return null
  }

  return (
    translations.find(translation => translation.language === ENGLISH_LANGUAGE_ID && translation.name) ||
    translations.find(translation => !!translation.name) ||
    null
  )
}

function pickExerciseImage(images: WgerExerciseImage[] | undefined) {
  if (!Array.isArray(images) || images.length === 0) {
    return ''
  }

  return images.find(image => image.is_main)?.image || images[0].image || ''
}

function pickMuscleName(primary: WgerNamedEntity[] | undefined, secondary: WgerNamedEntity[] | undefined) {
  const candidate = [...(primary || []), ...(secondary || [])].find(muscle => muscle.name_en || muscle.name)
  return candidate?.name_en?.trim() || candidate?.name?.trim() || ''
}

function pickEquipmentName(equipment: WgerNamedEntity[] | undefined) {
  const candidate = (equipment || []).find(item => item.name)
  return candidate?.name?.trim() || ''
}

function scoreExercise(exercise: NormalizedExercise, normalizedQuery: string) {
  const normalizedName = normalizeText(exercise.name)
  const normalizedMuscle = normalizeText(exercise.muscle)
  const normalizedEquipment = normalizeText(exercise.equipment)
  const normalizedInstructions = normalizeText(exercise.instructions)

  if (normalizedName === normalizedQuery) return 100
  if (normalizedName.startsWith(normalizedQuery)) return 80
  if (normalizedName.includes(normalizedQuery)) return 60
  if (normalizedMuscle.includes(normalizedQuery)) return 30
  if (normalizedEquipment.includes(normalizedQuery)) return 20
  if (normalizedInstructions.includes(normalizedQuery)) return 10

  const queryWords = normalizedQuery.split(' ').filter(Boolean)
  if (queryWords.length === 0) return 0

  const haystack = `${normalizedName} ${normalizedMuscle} ${normalizedEquipment} ${normalizedInstructions}`
  const matchingWords = queryWords.filter(word => haystack.includes(word)).length

  return matchingWords > 0 ? matchingWords * 8 : 0
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}
