'use client'

import { useState } from 'react'
import { Search, Plus, Flame, X } from 'lucide-react'

interface FoodResult {
  product_name: string
  brands?: string
  nutriments: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
  serving_size?: string
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
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const mockLoggedFoods: LoggedFood[] = [
  { id: '1', name: 'Greek Yogurt', brand: 'Chobani', calories: 130, protein: 17, carbs: 9, fat: 2, meal: 'Breakfast' },
  { id: '2', name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0, meal: 'Breakfast' },
  { id: '3', name: 'Chicken Breast', brand: 'Tyson', calories: 165, protein: 31, carbs: 0, fat: 4, meal: 'Lunch' },
  { id: '4', name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 2, meal: 'Lunch' },
]

export default function FoodPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loggedFoods, setLoggedFoods] = useState<LoggedFood[]>(mockLoggedFoods)
  const [selectedMeal, setSelectedMeal] = useState('Breakfast')
  const [addingFood, setAddingFood] = useState<FoodResult | null>(null)
  const [servingSize, setServingSize] = useState('100')

  const searchFood = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,nutriments,serving_size`
      )
      const data = await res.json()
      const products = (data.products || []).filter((p: FoodResult) => p.product_name && p.nutriments)
      setResults(products)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const confirmAdd = (food: FoodResult) => {
    const factor = parseFloat(servingSize) / 100
    const entry: LoggedFood = {
      id: Date.now().toString(),
      name: food.product_name,
      brand: food.brands,
      calories: Math.round((food.nutriments['energy-kcal_100g'] || 0) * factor),
      protein: Math.round((food.nutriments.proteins_100g || 0) * factor),
      carbs: Math.round((food.nutriments.carbohydrates_100g || 0) * factor),
      fat: Math.round((food.nutriments.fat_100g || 0) * factor),
      meal: selectedMeal,
    }
    setLoggedFoods(prev => [...prev, entry])
    setAddingFood(null)
    setResults([])
    setQuery('')
    setServingSize('100')
  }

  const removeFood = (id: string) => setLoggedFoods(prev => prev.filter(f => f.id !== id))

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
          <h1 className="text-3xl font-black text-white">Food Log</h1>
          <p style={{ color: '#A0A0A0' }} className="mt-1">Track your nutrition for today</p>
        </div>

        {/* Daily summary */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
          <h2 className="text-white font-bold mb-5">Today&apos;s Summary</h2>
          <div className="food-macro-grid">
            {[
              { label: 'Calories', value: totals.calories, unit: 'kcal', color: '#E8002D', goal: 2000 },
              { label: 'Protein', value: totals.protein, unit: 'g', color: '#3b82f6', goal: 150 },
              { label: 'Carbs', value: totals.carbs, unit: 'g', color: '#f59e0b', goal: 200 },
              { label: 'Fat', value: totals.fat, unit: 'g', color: '#8b5cf6', goal: 65 },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-3">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#2A2A2A" strokeWidth="6" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke={item.color} strokeWidth="6"
                      strokeDasharray={`${Math.min(100, Math.round((item.value / item.goal) * 100)) * 1.634} 163.4`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{Math.min(100, Math.round((item.value / item.goal) * 100))}%</span>
                  </div>
                </div>
                <p className="text-white font-black text-lg">{item.value}</p>
                <p className="text-xs" style={{ color: '#A0A0A0' }}>{item.label} ({item.unit})</p>
                <p className="text-xs mt-0.5" style={{ color: item.color }}>of {item.goal}{item.unit}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="food-grid">
          {/* Search panel */}
          <div>
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
              <h2 className="text-white font-bold text-lg mb-4">Add Food</h2>

              {/* Meal selector */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {MEAL_TYPES.map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMeal(m)}
                    style={{
                      backgroundColor: selectedMeal === m ? '#E8002D' : '#252525',
                      color: selectedMeal === m ? '#fff' : '#A0A0A0',
                      border: '1px solid',
                      borderColor: selectedMeal === m ? '#E8002D' : '#2A2A2A',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search food (e.g. Greek yogurt)"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchFood()}
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
                  onClick={searchFood}
                  disabled={searching}
                  style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                >
                  {searching ? '...' : 'Search'}
                </button>
              </div>

              {/* Add serving size input when a food is selected */}
              {addingFood && (
                <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#252525', border: '1px solid #E8002D' }}>
                  <p className="text-white font-semibold text-sm mb-1">{addingFood.product_name}</p>
                  <p className="text-xs mb-3" style={{ color: '#A0A0A0' }}>Adding to: {selectedMeal}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>Serving size (g)</label>
                      <input
                        type="number"
                        value={servingSize}
                        onChange={e => setServingSize(e.target.value)}
                        style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', color: '#fff', borderRadius: 8, padding: '8px 12px', width: '100%', outline: 'none', fontSize: 14 }}
                      />
                    </div>
                    <div style={{ color: '#A0A0A0', fontSize: 13, marginTop: 20 }}>
                      ~{Math.round((addingFood.nutriments['energy-kcal_100g'] || 0) * parseFloat(servingSize || '0') / 100)} kcal
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => confirmAdd(addingFood)}
                      style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      Add to {selectedMeal}
                    </button>
                    <button
                      onClick={() => setAddingFood(null)}
                      style={{ backgroundColor: '#1E1E1E', color: '#A0A0A0', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {results.map((food, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#252525' }}>
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-white text-sm font-semibold truncate">{food.product_name}</p>
                        <p className="text-xs" style={{ color: '#A0A0A0' }}>
                          {food.brands && `${food.brands} · `}
                          {food.nutriments['energy-kcal_100g'] ? `${Math.round(food.nutriments['energy-kcal_100g'])} kcal/100g` : 'No calorie data'}
                        </p>
                      </div>
                      <button
                        onClick={() => setAddingFood(food)}
                        style={{ backgroundColor: 'rgba(232,0,45,0.12)', color: '#E8002D', border: '1px solid rgba(232,0,45,0.2)', borderRadius: 8, padding: '5px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {results.length === 0 && !searching && !query && (
                <div className="text-center py-8">
                  <Flame size={32} style={{ color: '#2A2A2A', margin: '0 auto 12px' }} />
                  <p style={{ color: '#A0A0A0', fontSize: 14 }}>Search for food to log your nutrition</p>
                </div>
              )}
            </div>
          </div>

          {/* Food log by meal */}
          <div className="space-y-4">
            {grouped.map(({ meal, foods }) => {
              const mealCals = foods.reduce((a, f) => a + f.calories, 0)
              return (
                <div key={meal} className="rounded-2xl p-5" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">{meal}</h3>
                    <span className="text-sm font-semibold" style={{ color: '#E8002D' }}>{mealCals} kcal</span>
                  </div>
                  {foods.length === 0 ? (
                    <p className="text-sm py-2" style={{ color: '#A0A0A0' }}>No foods logged</p>
                  ) : (
                    <div className="space-y-2">
                      {foods.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#252525' }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm font-medium truncate">{f.name}</p>
                            <p className="text-xs" style={{ color: '#A0A0A0' }}>
                              P: {f.protein}g · C: {f.carbs}g · F: {f.fat}g
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-3">
                            <span className="text-sm font-bold" style={{ color: '#E8002D' }}>{f.calories}</span>
                            <button onClick={() => removeFood(f.id)} style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer' }}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
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
