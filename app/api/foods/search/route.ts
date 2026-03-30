import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type USDAFoodNutrient = {
  nutrientName?: string
  value?: number
}

type USDALabelNutrients = {
  calories?: { value?: number }
  protein?: { value?: number }
  carbohydrates?: { value?: number }
  fat?: { value?: number }
  fiber?: { value?: number }
  sugars?: { value?: number }
  sodium?: { value?: number }
}

type USDAFood = {
  fdcId?: number
  description?: string
  brandOwner?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  labelNutrients?: USDALabelNutrients
  foodNutrients?: USDAFoodNutrient[]
}

type USDAFoodSearchResponse = {
  foods?: USDAFood[]
}

type NormalizedFoodResult = {
  id: string
  name: string
  brand?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
  servingAmount: number
  servingUnit: string
  servingDescription: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const debug = searchParams.get('debug') === '1'

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY'

  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          pageSize: 8,
        }),
        cache: 'no-store',
      }
    )

    const payload = (await response.json().catch(() => null)) as USDAFoodSearchResponse | null

    if (!response.ok) {
      return NextResponse.json(
        { error: 'USDA food search failed.' },
        { status: response.status }
      )
    }

    if (debug) {
      return NextResponse.json({ payload })
    }

    const foods = normalizeUSDAResults(payload)
    return NextResponse.json({ results: foods })
  } catch (error) {
    console.error('USDA search request failed', error)

    return NextResponse.json(
      { error: 'Could not search USDA FoodData Central right now.' },
      { status: 500 }
    )
  }
}

function normalizeUSDAResults(payload: USDAFoodSearchResponse | null): NormalizedFoodResult[] {
  const foods = Array.isArray(payload?.foods) ? payload.foods : []

  return foods
    .filter(food => food.fdcId && food.description)
    .map(food => {
      const servingAmount = food.servingSize && food.servingSize > 0 ? food.servingSize : 100
      const servingUnit =
        food.servingSizeUnit?.trim() ||
        inferServingUnit(food.householdServingFullText) ||
        'g'

      return {
        id: String(food.fdcId),
        name: food.description!.trim(),
        brand: food.brandOwner?.trim() || undefined,
        calories: getCalories(food),
        protein: getNutrient(food, ['Protein']),
        carbs: getNutrient(food, ['Carbohydrate, by difference', 'Carbohydrate']),
        fat: getNutrient(food, ['Total lipid (fat)', 'Fatty acids, total saturated', 'Total fat']),
        fiber: optionalNumber(getNutrient(food, ['Fiber, total dietary', 'Fiber'])),
        sugar: optionalNumber(getNutrient(food, ['Sugars, total including NLEA', 'Sugars'])),
        sodium: optionalNumber(getNutrient(food, ['Sodium, Na', 'Sodium'])),
        servingAmount,
        servingUnit,
        servingDescription:
          food.householdServingFullText?.trim() ||
          `${servingAmount} ${servingUnit}`,
      }
    })
}

function getCalories(food: USDAFood) {
  return (
    food.labelNutrients?.calories?.value ??
    getNutrient(food, ['Energy'], 'KCAL')
  )
}

function getNutrient(food: USDAFood, names: string[], unitName?: string) {
  const nutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : []

  const byLabel = getFromLabelNutrients(food.labelNutrients, names)
  if (byLabel != null) {
    return byLabel
  }

  const match = nutrients.find(nutrient => {
    const nutrientName = nutrient.nutrientName?.trim()
    if (!nutrientName) {
      return false
    }

    return names.includes(nutrientName)
  })

  if (match?.value != null) {
    return Number(match.value)
  }

  if (unitName === 'KCAL') {
    const alt = nutrients.find(nutrient => nutrient.nutrientName?.trim() === 'Energy')
    return alt?.value != null ? Number(alt.value) : 0
  }

  return 0
}

function getFromLabelNutrients(labelNutrients: USDALabelNutrients | undefined, names: string[]) {
  if (!labelNutrients) {
    return null
  }

  if (names.includes('Protein') && labelNutrients.protein?.value != null) {
    return Number(labelNutrients.protein.value)
  }

  if (
    (names.includes('Carbohydrate, by difference') || names.includes('Carbohydrate')) &&
    labelNutrients.carbohydrates?.value != null
  ) {
    return Number(labelNutrients.carbohydrates.value)
  }

  if (
    (names.includes('Total lipid (fat)') || names.includes('Total fat')) &&
    labelNutrients.fat?.value != null
  ) {
    return Number(labelNutrients.fat.value)
  }

  if (
    (names.includes('Fiber, total dietary') || names.includes('Fiber')) &&
    labelNutrients.fiber?.value != null
  ) {
    return Number(labelNutrients.fiber.value)
  }

  if (
    (names.includes('Sugars, total including NLEA') || names.includes('Sugars')) &&
    labelNutrients.sugars?.value != null
  ) {
    return Number(labelNutrients.sugars.value)
  }

  if (
    (names.includes('Sodium, Na') || names.includes('Sodium')) &&
    labelNutrients.sodium?.value != null
  ) {
    return Number(labelNutrients.sodium.value)
  }

  return null
}

function inferServingUnit(servingText?: string) {
  const normalized = servingText?.trim()
  if (!normalized) {
    return null
  }

  const gramMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz)\b/i)
  if (gramMatch?.[2]) {
    return gramMatch[2].toLowerCase()
  }

  return 'serving'
}

function optionalNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? value : undefined
}
