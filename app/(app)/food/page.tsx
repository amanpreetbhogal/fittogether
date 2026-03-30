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
          <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Food Log</h1>
          <p style={{ color: '#A0A0A0' }} className="mt-1">Track your nutrition for today</p>
        </div>

        {/* Daily summary */}
        <div style={{ marginBottom: 32, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 20 }}>Today&apos;s Summary</h2>
          {/* Calories - centered on top */}
          {(() => {
            const pct = Math.min(100, Math.round((totals.calories / 2000) * 100))
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
                <p style={{ color: '#E8002D', fontSize: 12, marginTop: 4 }}>of 2000 kcal</p>
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
                  onClick={searchFood}
                  disabled={searching}
                  style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
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
                        style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 6, padding: '8px 12px', width: '100%', outline: 'none', fontSize: 14 }}
                      />
                    </div>
                    <div style={{ color: '#A0A0A0', fontSize: 13, marginTop: 20 }}>
                      ~{Math.round((addingFood.nutriments['energy-kcal_100g'] || 0) * parseFloat(servingSize || '0') / 100)} kcal
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => confirmAdd(addingFood)}
                      style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Add to {selectedMeal}
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
                        style={{ backgroundColor: 'rgba(232,0,45,0.12)', color: '#E8002D', border: '0.5px solid rgba(232,0,45,0.4)', borderRadius: 6, padding: '6px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: '#252525' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ color: '#fff', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                            <p style={{ fontSize: 12, color: '#A0A0A0', marginTop: 2 }}>
                              P: {f.protein}g · C: {f.carbs}g · F: {f.fat}g
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#E8002D' }}>{f.calories}</span>
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
