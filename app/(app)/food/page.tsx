'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Search, Flame, Star, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

interface FoodResult {
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

interface LoggedFood {
  id: string
  name: string
  brand?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  meal: string
  servingAmount: number
  servingUnit: string
}

interface FoodShortcut {
  key: string
  name: string
  brand?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingAmount: number
  servingUnit: string
  useCount: number
  lastLoggedAt: string
}

type FoodEntryRow = Database['public']['Tables']['food_entries']['Row']
type MealType = Database['public']['Enums']['meal_type']

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
const MEAL_TYPE_TO_DB: Record<typeof MEAL_TYPES[number], MealType> = {
  Breakfast: 'breakfast',
  Lunch: 'lunch',
  Dinner: 'dinner',
  Snack: 'snack',
}
const DB_TO_MEAL_TYPE: Record<MealType, typeof MEAL_TYPES[number]> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}
const FAVORITE_FOODS_KEY = 'fittogether.favoriteFoods'

export default function FoodPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [loggedFoods, setLoggedFoods] = useState<LoggedFood[]>([])
  const [selectedMeal, setSelectedMeal] = useState('Breakfast')
  const [addingFood, setAddingFood] = useState<FoodResult | null>(null)
  const [servingSize, setServingSize] = useState('1')
  const [loadingFoods, setLoadingFoods] = useState(true)
  const [savingFood, setSavingFood] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null)
  const [editServingAmount, setEditServingAmount] = useState('1')
  const [editMeal, setEditMeal] = useState<typeof MEAL_TYPES[number]>('Breakfast')
  const [updatingFood, setUpdatingFood] = useState(false)
  const [recentShortcuts, setRecentShortcuts] = useState<FoodShortcut[]>([])
  const [frequentShortcuts, setFrequentShortcuts] = useState<FoodShortcut[]>([])
  const [quickAddingKey, setQuickAddingKey] = useState<string | null>(null)
  const [favoriteShortcuts, setFavoriteShortcuts] = useState<FoodShortcut[]>(() => loadFavoriteShortcuts())
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const dailyCalorieGoal = profile?.daily_calorie_goal ?? 2000
  const dateLabel = useMemo(() => formatSelectedDateLabel(selectedDate), [selectedDate])

  useEffect(() => {
    const loadFoods = async () => {
      if (!user) {
        setLoggedFoods([])
        setLoadingFoods(false)
        return
      }

      setLoadingFoods(true)

      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', selectedDate)
        .order('created_at', { ascending: false })

      const { data: historyData, error: historyError } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80)

      if (error || historyError) {
        console.error('Failed to load food entries', error || historyError)
        setErrorMessage('Could not load your food log right now.')
        setLoggedFoods([])
        setRecentShortcuts([])
        setFrequentShortcuts([])
        setLoadingFoods(false)
        return
      }

      setLoggedFoods(data.map(mapFoodEntryToLoggedFood))
      const shortcuts = buildFoodShortcuts(historyData || [])
      setRecentShortcuts(shortcuts.recent)
      setFrequentShortcuts(shortcuts.frequent)
      setLoadingFoods(false)
    }

    if (!authLoading) {
      void loadFoods()
    }
  }, [authLoading, selectedDate, user])

  const searchFood = async () => {
    if (!query.trim()) return
    setSearching(true)
    setHasSearched(true)
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      if (!res.ok) {
        setResults([])
        setErrorMessage(
          typeof data?.error === 'string'
            ? data.error
            : 'Food search failed right now. Please try again in a moment.'
        )
        return
      }

      setResults(Array.isArray(data.results) ? data.results : [])
    } catch {
      setResults([])
      setErrorMessage('Food search failed right now. Please try again in a moment.')
    } finally {
      setSearching(false)
    }
  }

  const confirmAdd = async (food: FoodResult) => {
    if (!user) {
      return
    }

    setSavingFood(true)
    setErrorMessage(null)

    const quantity = Number.parseFloat(servingSize)
    const quantityMultiplier = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    const { data, error } = await supabase
      .from('food_entries')
      .insert({
        user_id: user.id,
        entry_date: selectedDate,
        meal_type: MEAL_TYPE_TO_DB[selectedMeal as keyof typeof MEAL_TYPE_TO_DB],
        food_name: food.name,
        brand: food.brand ?? null,
        external_food_id: food.id,
        source: 'usda',
        serving_amount: Number((food.servingAmount * quantityMultiplier).toFixed(2)),
        serving_unit: food.servingUnit,
        calories: Math.round(food.calories * quantityMultiplier),
        protein: Number((food.protein * quantityMultiplier).toFixed(1)),
        carbs: Number((food.carbs * quantityMultiplier).toFixed(1)),
        fat: Number((food.fat * quantityMultiplier).toFixed(1)),
        fiber: food.fiber != null ? Number((food.fiber * quantityMultiplier).toFixed(1)) : null,
        sugar: food.sugar != null ? Number((food.sugar * quantityMultiplier).toFixed(1)) : null,
        sodium: food.sodium != null ? Number((food.sodium * quantityMultiplier).toFixed(1)) : null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Failed to save food entry', error)
      setErrorMessage('Could not save this food entry. Please try again.')
      setSavingFood(false)
      return
    }

    setLoggedFoods(prev => [mapFoodEntryToLoggedFood(data), ...prev])
    setAddingFood(null)
    setResults([])
    setQuery('')
    setServingSize('1')
    setHasSearched(false)
    setSavingFood(false)
  }

  const quickAddShortcut = async (shortcut: FoodShortcut) => {
    if (!user) {
      return
    }

    setQuickAddingKey(shortcut.key)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from('food_entries')
      .insert({
        user_id: user.id,
        entry_date: selectedDate,
        meal_type: MEAL_TYPE_TO_DB[selectedMeal as keyof typeof MEAL_TYPE_TO_DB],
        food_name: shortcut.name,
        brand: shortcut.brand ?? null,
        source: 'history',
        serving_amount: Number(shortcut.servingAmount.toFixed(2)),
        serving_unit: shortcut.servingUnit,
        calories: shortcut.calories,
        protein: Number(shortcut.protein.toFixed(1)),
        carbs: Number(shortcut.carbs.toFixed(1)),
        fat: Number(shortcut.fat.toFixed(1)),
      })
      .select('*')
      .single()

    if (error) {
      console.error('Failed to quick add food entry', error)
      setErrorMessage('Could not quick add this food right now.')
      setQuickAddingKey(null)
      return
    }

    setLoggedFoods(prev => [mapFoodEntryToLoggedFood(data), ...prev])
    setQuickAddingKey(null)
  }

  const toggleFavoriteShortcut = (shortcut: FoodShortcut) => {
    setFavoriteShortcuts(prev => {
      const exists = prev.some(item => item.key === shortcut.key)
      const next = exists
        ? prev.filter(item => item.key !== shortcut.key)
        : [shortcut, ...prev].slice(0, 12)

      persistFavoriteShortcuts(next)
      return next
    })
  }

  const isFavoriteShortcut = (shortcutKey: string) => favoriteShortcuts.some(item => item.key === shortcutKey)

  const removeFood = async (id: string) => {
    setErrorMessage(null)

    const { error } = await supabase
      .from('food_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete food entry', error)
      setErrorMessage('Could not remove this food entry. Please try again.')
      return
    }

    setLoggedFoods(prev => prev.filter(f => f.id !== id))
  }

  const startEditingFood = (food: LoggedFood) => {
    setEditingFoodId(food.id)
    setEditServingAmount(String(food.servingAmount))
    setEditMeal(food.meal as typeof MEAL_TYPES[number])
    setErrorMessage(null)
  }

  const cancelEditingFood = () => {
    setEditingFoodId(null)
    setEditServingAmount('1')
    setEditMeal('Breakfast')
  }

  const saveFoodEdit = async (food: LoggedFood) => {
    const nextServingAmount = Number.parseFloat(editServingAmount)

    if (!Number.isFinite(nextServingAmount) || nextServingAmount <= 0) {
      setErrorMessage('Enter a valid serving amount greater than 0.')
      return
    }

    const scale = nextServingAmount / Math.max(food.servingAmount, 0.01)
    setUpdatingFood(true)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from('food_entries')
      .update({
        meal_type: MEAL_TYPE_TO_DB[editMeal],
        serving_amount: Number(nextServingAmount.toFixed(2)),
        calories: Math.round(food.calories * scale),
        protein: Number((food.protein * scale).toFixed(1)),
        carbs: Number((food.carbs * scale).toFixed(1)),
        fat: Number((food.fat * scale).toFixed(1)),
      })
      .eq('id', food.id)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to update food entry', error)
      setErrorMessage('Could not update this food entry. Please try again.')
      setUpdatingFood(false)
      return
    }

    setLoggedFoods(prev => prev.map(entry => entry.id === food.id ? mapFoodEntryToLoggedFood(data) : entry))
    setUpdatingFood(false)
    cancelEditingFood()
  }

  const totals = loggedFoods.reduce((acc, f) => ({
    calories: acc.calories + f.calories,
    protein: acc.protein + f.protein,
    carbs: acc.carbs + f.carbs,
    fat: acc.fat + f.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const grouped = MEAL_TYPES.map(meal => ({
    meal,
    foods: loggedFoods.filter(f => f.meal === meal),
  }))

  return (
    <>
      <style>{`
        .food-wrapper {
          padding: 32px;
          max-width: 1152px;
          margin: 0 auto;
        }
        .food-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        .food-macro-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1023px) {
          .food-wrapper {
            padding: 72px 16px 24px;
          }
          .food-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .food-macro-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      <div className="food-wrapper">
        <div className="mb-8">
          <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Food Log</h1>
          <p style={{ color: '#A0A0A0' }} className="mt-1">Track your nutrition for any day, not just today</p>
        </div>

        <div style={{ marginBottom: 24, borderRadius: 16, padding: 16, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarDays size={18} style={{ color: '#E8002D' }} />
            <div>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Log Date</p>
              <p style={{ color: '#A0A0A0', fontSize: 12 }}>{dateLabel}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedDate(shiftDateString(selectedDate, -1))}
              style={dateNavButtonStyle}
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
              style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', colorScheme: 'dark' }}
            />
            <button
              onClick={() => setSelectedDate(shiftDateString(selectedDate, 1))}
              style={dateNavButtonStyle}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div style={{ marginBottom: 24, borderRadius: 12, padding: 14, backgroundColor: 'rgba(232,0,45,0.12)', border: '0.5px solid rgba(232,0,45,0.4)', color: '#fff', fontSize: 13 }}>
            {errorMessage}
          </div>
        )}

        {/* Daily summary */}
        <div style={{ marginBottom: 32, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 20 }}>Summary for {dateLabel}</h2>
          {/* Calories - centered on top */}
          {(() => {
            const pct = Math.min(100, Math.round((totals.calories / Math.max(dailyCalorieGoal, 1)) * 100))
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 12 }}>
                  <svg style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }} viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#2A2A2A" strokeWidth="6" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#E8002D" strokeWidth="6"
                      strokeDasharray={`${pct * 1.634} 163.4`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{pct}%</span>
                  </div>
                </div>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: 28 }}>{totals.calories}</p>
                <p style={{ color: '#A0A0A0', fontSize: 13 }}>Calories (kcal)</p>
                <p style={{ color: '#E8002D', fontSize: 12, marginTop: 4 }}>of {dailyCalorieGoal} kcal</p>
              </div>
            )
          })()}
          {/* Protein, Carbs, Fat - 3 col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Protein', value: totals.protein, unit: 'g', color: '#3b82f6', goal: 150 },
              { label: 'Carbs', value: totals.carbs, unit: 'g', color: '#f59e0b', goal: 200 },
              { label: 'Fat', value: totals.fat, unit: 'g', color: '#8b5cf6', goal: 65 },
            ].map(item => {
              const pct = Math.min(100, Math.round((item.value / item.goal) * 100))
              return (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 10px' }}>
                    <svg style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }} viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#2A2A2A" strokeWidth="6" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke={item.color} strokeWidth="6"
                        strokeDasharray={`${pct * 1.634} 163.4`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{pct}%</span>
                    </div>
                  </div>
                  <p style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{item.value}</p>
                  <p style={{ color: '#A0A0A0', fontSize: 12 }}>{item.label} ({item.unit})</p>
                  <p style={{ color: item.color, fontSize: 11, marginTop: 2 }}>of {item.goal}{item.unit}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="food-grid">
          {/* Search panel */}
          <div>
            <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.125rem', marginBottom: 12 }}>Add Food</h2>

              {/* Meal selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {MEAL_TYPES.map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMeal(m)}
                    style={{
                      backgroundColor: selectedMeal === m ? '#E8002D' : '#2A2A2A',
                      color: selectedMeal === m ? '#fff' : '#A0A0A0',
                      border: '0.5px solid',
                      borderColor: selectedMeal === m ? '#E8002D' : 'rgba(255,255,255,0.08)',
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search food (e.g. Greek yogurt)"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchFood()}
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
                  onClick={() => void searchFood()}
                  disabled={searching}
                  style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {searching ? '...' : 'Search'}
                </button>
              </div>

              {/* ── Search results appear immediately below the search bar ── */}
              {searching && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ color: '#A0A0A0', fontSize: 14 }}>Searching...</p>
                </div>
              )}

              {results.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Results for &ldquo;{query}&rdquo;</p>
                    <button
                      onClick={() => { setResults([]); setHasSearched(false); setQuery('') }}
                      style={{ background: 'none', border: 'none', color: '#A0A0A0', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                    >
                      Clear
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                    {results.map((food, i) => {
                      const shortcut = foodResultToShortcut(food)
                      const favorite = isFavoriteShortcut(shortcut.key)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
                            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.name}</p>
                            <p style={{ color: '#A0A0A0', fontSize: 11, marginTop: 2 }}>
                              {food.brand && `${food.brand} · `}{Math.round(food.calories)} kcal · {food.servingDescription}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <button
                              onClick={() => toggleFavoriteShortcut(shortcut)}
                              style={{ background: 'none', border: 'none', color: favorite ? '#E8002D' : '#A0A0A0', cursor: 'pointer', padding: 0 }}
                              aria-label={`${favorite ? 'Remove' : 'Add'} ${food.name} favorite`}
                            >
                              <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => { setServingSize('1'); setAddingFood(food) }}
                              style={{ backgroundColor: 'rgba(232,0,45,0.12)', color: '#E8002D', border: '0.5px solid rgba(232,0,45,0.4)', borderRadius: 6, padding: '6px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {results.length === 0 && !searching && hasSearched && query.trim() && (
                <div style={{ textAlign: 'center', padding: '32px 0', marginBottom: 16 }}>
                  <Flame size={28} style={{ color: '#2A2A2A', margin: '0 auto 10px' }} />
                  <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No foods found for &ldquo;{query}&rdquo;</p>
                  <p style={{ color: '#A0A0A0', fontSize: 13 }}>Try a more specific brand name or singular term like &ldquo;egg&rdquo;.</p>
                </div>
              )}

              {/* Add serving size input when a food is selected */}
              {addingFood && (
                <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#252525', border: '1px solid #E8002D' }}>
                  <p className="text-white font-semibold text-sm mb-1">{addingFood.name}</p>
                  {addingFood.brand && (
                    <p className="text-xs mb-1" style={{ color: '#A0A0A0' }}>{addingFood.brand}</p>
                  )}
                  <p className="text-xs mb-3" style={{ color: '#A0A0A0' }}>Adding to: {selectedMeal}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>Number of servings</label>
                      <input
                        type="number"
                        value={servingSize}
                        onChange={e => setServingSize(e.target.value)}
                        min="0.25"
                        step="0.25"
                        style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 6, padding: '8px 12px', width: '100%', outline: 'none', fontSize: 14 }}
                      />
                    </div>
                    <div style={{ color: '#A0A0A0', fontSize: 13, marginTop: 20 }}>
                      ~{Math.round(addingFood.calories * Math.max(Number.parseFloat(servingSize) || 1, 0.25))} kcal
                    </div>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#A0A0A0' }}>
                    Base serving: {addingFood.servingDescription}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => void confirmAdd(addingFood)}
                      disabled={savingFood}
                      style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {savingFood ? 'Saving...' : `Add to ${selectedMeal}`}
                    </button>
                    <button
                      onClick={() => setAddingFood(null)}
                      style={{ backgroundColor: '#2A2A2A', color: '#A0A0A0', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ── Shortcuts: only visible when no search is active ── */}
              {results.length === 0 && !searching && !hasSearched && (
                <>
                  {favoriteShortcuts.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Pinned Favorites</p>
                        <span style={{ color: '#606060', fontSize: 11 }}>One-tap foods you reuse often</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {favoriteShortcuts.map(shortcut => (
                          <div key={`favorite-${shortcut.key}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                            <button onClick={() => void quickAddShortcut(shortcut)} disabled={quickAddingKey === shortcut.key} style={{ background: 'none', border: 'none', color: '#fff', cursor: quickAddingKey === shortcut.key ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'left', padding: 0 }}>
                              {shortcut.name}
                            </button>
                            <button onClick={() => toggleFavoriteShortcut(shortcut)} style={{ background: 'none', border: 'none', color: '#E8002D', cursor: 'pointer', padding: 0 }} aria-label={`Remove ${shortcut.name} from favorites`}>
                              <Star size={14} fill="currentColor" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(recentShortcuts.length > 0 || frequentShortcuts.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                      {recentShortcuts.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Recent Foods</p>
                            <span style={{ color: '#606060', fontSize: 11 }}>Quick add to {selectedMeal}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {recentShortcuts.map(shortcut => (
                              <div key={`recent-${shortcut.key}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', minWidth: 150 }}>
                                <button onClick={() => void quickAddShortcut(shortcut)} disabled={quickAddingKey === shortcut.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, background: 'none', border: 'none', cursor: quickAddingKey === shortcut.key ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: quickAddingKey === shortcut.key ? 0.7 : 1, padding: 0, flex: 1 }}>
                                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{shortcut.name}</span>
                                  <span style={{ color: '#A0A0A0', fontSize: 11, textAlign: 'left' }}>{shortcut.calories} kcal · {shortcut.servingAmount} {shortcut.servingUnit}</span>
                                </button>
                                <button onClick={() => toggleFavoriteShortcut(shortcut)} style={{ background: 'none', border: 'none', color: isFavoriteShortcut(shortcut.key) ? '#E8002D' : '#A0A0A0', cursor: 'pointer', padding: 0 }} aria-label={`${isFavoriteShortcut(shortcut.key) ? 'Remove' : 'Add'} ${shortcut.name} favorite`}>
                                  <Star size={14} fill={isFavoriteShortcut(shortcut.key) ? 'currentColor' : 'none'} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {frequentShortcuts.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Most Logged</p>
                            <span style={{ color: '#606060', fontSize: 11 }}>Your go-to foods</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {frequentShortcuts.map(shortcut => (
                              <div key={`frequent-${shortcut.key}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', backgroundColor: '#252525', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortcut.name}</p>
                                  <p style={{ color: '#A0A0A0', fontSize: 11 }}>Logged {shortcut.useCount} times · {shortcut.calories} kcal</p>
                                </div>
                                <button onClick={() => void quickAddShortcut(shortcut)} disabled={quickAddingKey === shortcut.key} style={{ backgroundColor: 'rgba(232,0,45,0.12)', color: '#E8002D', border: '0.5px solid rgba(232,0,45,0.4)', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: 12, cursor: quickAddingKey === shortcut.key ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: quickAddingKey === shortcut.key ? 0.7 : 1 }}>
                                  {quickAddingKey === shortcut.key ? 'Adding...' : '+ Quick Add'}
                                </button>
                                <button onClick={() => toggleFavoriteShortcut(shortcut)} style={{ background: 'none', border: 'none', color: isFavoriteShortcut(shortcut.key) ? '#E8002D' : '#A0A0A0', cursor: 'pointer', padding: 0 }} aria-label={`${isFavoriteShortcut(shortcut.key) ? 'Remove' : 'Add'} ${shortcut.name} favorite`}>
                                  <Star size={14} fill={isFavoriteShortcut(shortcut.key) ? 'currentColor' : 'none'} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Food log by meal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {loadingFoods && (
              <div style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Loading your food log...</p>
              </div>
            )}
            {grouped.map(({ meal, foods }) => {
              const mealCals = foods.reduce((a, f) => a + f.calories, 0)
              return (
                <div key={meal} style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ color: '#fff', fontWeight: 700 }}>{meal}</h3>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#E8002D' }}>{mealCals} kcal</span>
                  </div>
                  {foods.length === 0 ? (
                    <p style={{ fontSize: 14, padding: '8px 0', color: '#A0A0A0' }}>No foods logged</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {foods.map(f => (
                        (() => {
                          const shortcut = loggedFoodToShortcut(f)
                          const favorite = isFavoriteShortcut(shortcut.key)
                          return (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: '#252525' }}>
                          {editingFoodId === f.id ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div>
                                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{f.name}</p>
                                <p style={{ fontSize: 12, color: '#A0A0A0', marginTop: 2 }}>
                                  Update servings or move this item to a different meal.
                                </p>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <input
                                  type="number"
                                  min="0.25"
                                  step="0.25"
                                  value={editServingAmount}
                                  onChange={event => setEditServingAmount(event.target.value)}
                                  style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 8, padding: '10px 12px', outline: 'none', fontSize: 13 }}
                                />
                                <select
                                  value={editMeal}
                                  onChange={event => setEditMeal(event.target.value as typeof MEAL_TYPES[number])}
                                  style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 8, padding: '10px 12px', outline: 'none', fontSize: 13, fontFamily: 'inherit' }}
                                >
                                  {MEAL_TYPES.map(mealOption => (
                                    <option key={mealOption} value={mealOption}>{mealOption}</option>
                                  ))}
                                </select>
                              </div>
                              <p style={{ fontSize: 12, color: '#A0A0A0' }}>
                                Current serving: {f.servingAmount} {f.servingUnit}
                              </p>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => void saveFoodEdit(f)}
                                  disabled={updatingFood}
                                  style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: updatingFood ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: updatingFood ? 0.7 : 1 }}
                                >
                                  {updatingFood ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={cancelEditingFood}
                                  style={{ backgroundColor: 'transparent', color: '#A0A0A0', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ color: '#fff', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                                <p style={{ fontSize: 12, color: '#A0A0A0', marginTop: 2 }}>
                                  {f.servingAmount} {f.servingUnit} · P: {f.protein}g · C: {f.carbs}g · F: {f.fat}g
                                </p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#E8002D' }}>{f.calories}</span>
                                <button
                                  onClick={() => startEditingFood(f)}
                                  style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => toggleFavoriteShortcut(shortcut)}
                                  style={{ background: 'none', border: 'none', color: favorite ? '#E8002D' : '#A0A0A0', cursor: 'pointer', padding: 0 }}
                                  aria-label={`${favorite ? 'Remove' : 'Add'} ${f.name} favorite`}
                                >
                                  <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
                                </button>
                                <button onClick={() => void removeFood(f.id)} style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer' }}>
                                  <X size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                          )
                        })()
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

function mapFoodEntryToLoggedFood(entry: FoodEntryRow): LoggedFood {
  return {
    id: entry.id,
    name: entry.food_name,
    brand: entry.brand ?? undefined,
    calories: entry.calories,
    protein: Number(entry.protein),
    carbs: Number(entry.carbs),
    fat: Number(entry.fat),
    meal: DB_TO_MEAL_TYPE[entry.meal_type],
    servingAmount: Number(entry.serving_amount),
    servingUnit: entry.serving_unit,
  }
}

function buildShortcutKey(name: string, brand: string | undefined, servingUnit: string) {
  return `${name.trim().toLowerCase()}::${(brand ?? '').trim().toLowerCase()}::${servingUnit.trim().toLowerCase()}`
}

function foodResultToShortcut(food: FoodResult): FoodShortcut {
  return {
    key: buildShortcutKey(food.name, food.brand, food.servingUnit),
    name: food.name,
    brand: food.brand,
    calories: Math.round(food.calories),
    protein: Number(food.protein),
    carbs: Number(food.carbs),
    fat: Number(food.fat),
    servingAmount: Number(food.servingAmount),
    servingUnit: food.servingUnit,
    useCount: 1,
    lastLoggedAt: new Date().toISOString(),
  }
}

function loggedFoodToShortcut(food: LoggedFood): FoodShortcut {
  return {
    key: buildShortcutKey(food.name, food.brand, food.servingUnit),
    name: food.name,
    brand: food.brand,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    servingAmount: food.servingAmount,
    servingUnit: food.servingUnit,
    useCount: 1,
    lastLoggedAt: new Date().toISOString(),
  }
}

function buildFoodShortcuts(entries: FoodEntryRow[]) {
  const shortcutMap = new Map<string, FoodShortcut>()

  for (const entry of entries) {
    const key = `${entry.food_name.trim().toLowerCase()}::${(entry.brand ?? '').trim().toLowerCase()}::${entry.serving_unit.trim().toLowerCase()}`
    const existing = shortcutMap.get(key)

    if (!existing) {
      shortcutMap.set(key, {
        key,
        name: entry.food_name,
        brand: entry.brand ?? undefined,
        calories: entry.calories,
        protein: Number(entry.protein),
        carbs: Number(entry.carbs),
        fat: Number(entry.fat),
        servingAmount: Number(entry.serving_amount),
        servingUnit: entry.serving_unit,
        useCount: 1,
        lastLoggedAt: entry.created_at,
      })
      continue
    }

    existing.useCount += 1
    if (new Date(entry.created_at) > new Date(existing.lastLoggedAt)) {
      existing.lastLoggedAt = entry.created_at
      existing.calories = entry.calories
      existing.protein = Number(entry.protein)
      existing.carbs = Number(entry.carbs)
      existing.fat = Number(entry.fat)
      existing.servingAmount = Number(entry.serving_amount)
      existing.servingUnit = entry.serving_unit
    }
  }

  const shortcuts = Array.from(shortcutMap.values())
  const recent = [...shortcuts]
    .sort((a, b) => new Date(b.lastLoggedAt).getTime() - new Date(a.lastLoggedAt).getTime())
    .slice(0, 6)
  const frequent = [...shortcuts]
    .sort((a, b) => {
      if (b.useCount !== a.useCount) {
        return b.useCount - a.useCount
      }
      return new Date(b.lastLoggedAt).getTime() - new Date(a.lastLoggedAt).getTime()
    })
    .slice(0, 5)

  return { recent, frequent }
}

function loadFavoriteShortcuts(): FoodShortcut[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(FAVORITE_FOODS_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as FoodShortcut[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistFavoriteShortcuts(shortcuts: FoodShortcut[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(FAVORITE_FOODS_KEY, JSON.stringify(shortcuts))
}

const dateNavButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#252525',
  border: '0.5px solid rgba(255,255,255,0.08)',
  color: '#fff',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

function shiftDateString(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatSelectedDateLabel(dateString: string) {
  const selected = new Date(`${dateString}T12:00:00`)
  const today = new Date()
  const todayString = today.toISOString().slice(0, 10)
  const yesterdayString = shiftDateString(todayString, -1)
  const tomorrowString = shiftDateString(todayString, 1)

  if (dateString === todayString) return 'Today'
  if (dateString === yesterdayString) return 'Yesterday'
  if (dateString === tomorrowString) return 'Tomorrow'

  return selected.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
