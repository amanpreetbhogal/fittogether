'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Target, Plus, Users, Lock, Calendar, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

type GoalRow = Database['public']['Tables']['goals']['Row']
type GoalCategory = 'fitness' | 'weight' | 'nutrition'

type GoalCard = {
  id: string
  title: string
  current: number
  target: number
  unit: string
  shared: boolean
  category: GoalCategory
  targetDate?: string
  partnerCurrent?: number
}

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  fitness: '#E8002D',
  weight: '#3B82F6',
  nutrition: '#22C55E',
}

const CATEGORY_BG: Record<GoalCategory, string> = {
  fitness: 'rgba(232,0,45,0.12)',
  weight: 'rgba(59,130,246,0.12)',
  nutrition: 'rgba(34,197,94,0.12)',
}

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  fitness: 'Fitness',
  weight: 'Weight',
  nutrition: 'Nutrition',
}

const UNITS = ['g', 'lbs', 'kg', 'min', 'km', 'miles', 'reps', 'kcal', 'glasses', 'steps', '%']

// Mock partner goals for Priyana's tab
const PARTNER_GOALS: GoalCard[] = [
  { id: 'p1', title: 'Bench Press 225 lbs', current: 205, target: 225, unit: 'lbs', shared: true, category: 'fitness', partnerCurrent: 185 },
  { id: 'p2', title: 'Run 5K under 25 min', current: 26, target: 25, unit: 'min', shared: true, category: 'fitness', partnerCurrent: 27 },
  { id: 'p3', title: 'Lose 8 lbs', current: 5, target: 8, unit: 'lbs', shared: false, category: 'weight' },
  { id: 'p4', title: 'Hit 120g protein daily', current: 100, target: 120, unit: 'g', shared: false, category: 'nutrition' },
]

// ── Circular ring component ────────────────────────────────────────────────
function CircularRing({
  pct,
  color,
  size = 84,
  label,
}: {
  pct: number
  color: string
  size?: number
  label?: string
}) {
  const strokeWidth = 7
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const capped = Math.min(pct, 100)
  const offset = circumference - (capped / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2A2A2A" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.5px' }}>
            {capped}%
          </span>
        </div>
      </div>
      {label && (
        <span style={{ color: '#606060', fontSize: 11, fontWeight: 500 }}>{label}</span>
      )}
    </div>
  )
}

// ── Goal card component ────────────────────────────────────────────────────
function GoalCard({
  g,
  showDualRing = false,
  editable = false,
  saving = false,
  deleting = false,
  onSaveProgress,
  onEditGoal,
  onDeleteGoal,
  progressDrafts,
  setProgressDrafts,
}: {
  g: GoalCard
  showDualRing?: boolean
  editable?: boolean
  saving?: boolean
  deleting?: boolean
  onSaveProgress?: (goalId: string, nextValue: number) => Promise<void>
  onEditGoal?: (goal: GoalCard) => void
  onDeleteGoal?: (goalId: string) => Promise<void>
  progressDrafts?: Record<string, string>
  setProgressDrafts?: Dispatch<SetStateAction<Record<string, string>>>
}) {
  const [todayMs] = useState(() => Date.now())
  const goalId = g.id
  const currentValue = g.current
  const pct = Math.min(100, Math.round((g.current / g.target) * 100))
  const partnerPct = showDualRing
    ? g.partnerCurrent !== undefined
      ? Math.min(100, Math.round((g.partnerCurrent / g.target) * 100))
      : 0
    : null
  const isCompleted = pct >= 100
  const color = isCompleted ? '#4ade80' : CATEGORY_COLORS[g.category]

  const daysLeft = () => {
    if (!g.targetDate) return null
    const diff = Math.ceil(
      (new Date(g.targetDate).getTime() - todayMs) / (1000 * 60 * 60 * 24)
    )
    if (diff > 0) return `${diff} days left`
    if (diff === 0) return 'Due today'
    return 'Overdue'
  }
  const days = daysLeft()
  const draftValue = progressDrafts?.[goalId] ?? String(currentValue)

  useEffect(() => {
    if (!editable || !setProgressDrafts) {
      return
    }

    setProgressDrafts(prev => {
      if (prev[goalId] === String(currentValue)) {
        return prev
      }

      return {
        ...prev,
        [goalId]: String(currentValue),
      }
    })
  }, [currentValue, editable, goalId, setProgressDrafts])

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 24,
        backgroundColor: '#1E1E1E',
        border: isCompleted
          ? '0.5px solid rgba(74,222,128,0.2)'
          : '0.5px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Top row: ring(s) + info */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Ring(s) */}
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          <CircularRing pct={pct} color={color} size={84} label={showDualRing ? 'You' : undefined} />
          {showDualRing && (
            <CircularRing
              pct={partnerPct ?? 0}
              color={CATEGORY_COLORS[g.category]}
              size={84}
              label="Priyana"
            />
          )}
        </div>

        {/* Text info */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.35 }}>
              {g.title}
            </p>
            <span
              style={{
                backgroundColor: isCompleted ? 'rgba(74,222,128,0.12)' : CATEGORY_BG[g.category],
                color: isCompleted ? '#4ade80' : CATEGORY_COLORS[g.category],
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              {isCompleted ? 'Done' : CATEGORY_LABELS[g.category]}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {g.shared ? (
                <>
                  <Users size={12} style={{ color: '#606060' }} />
                  <span style={{ color: '#606060', fontSize: 12 }}>Shared</span>
                </>
              ) : (
                <>
                  <Lock size={12} style={{ color: '#606060' }} />
                  <span style={{ color: '#606060', fontSize: 12 }}>Private</span>
                </>
              )}
            </div>
            {days && (
              <>
                <span style={{ color: '#2A2A2A', fontSize: 12 }}>·</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} style={{ color: '#606060' }} />
                  <span style={{ color: '#606060', fontSize: 12 }}>{days}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: '#606060', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Progress
          </span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
            {g.current} / {g.target} {g.unit}
          </span>
        </div>
        <div style={{ width: '100%', height: 6, borderRadius: 6, backgroundColor: '#2A2A2A' }}>
          <div
            style={{
              height: 6,
              borderRadius: 6,
              width: `${pct}%`,
              backgroundColor: color,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {editable && onSaveProgress && progressDrafts && setProgressDrafts && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: 'block', color: '#606060', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 8 }}>
              Update Current Value
            </label>
            <input
              type="number"
              step="any"
              value={draftValue}
              onChange={(e) => setProgressDrafts(prev => ({ ...prev, [goalId]: e.target.value }))}
              style={{
                backgroundColor: '#252525',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: '#fff',
                borderRadius: 10,
                padding: '10px 12px',
                width: '100%',
                outline: 'none',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            onClick={() => {
              const parsed = Number.parseFloat(draftValue)
              if (Number.isNaN(parsed) || parsed < 0) {
                return
              }
              void onSaveProgress(goalId, parsed)
            }}
            disabled={saving}
            style={{
              backgroundColor: '#E8002D',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: saving ? 0.7 : 1,
              marginTop: 20,
            }}
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      )}

      {editable && onEditGoal && onDeleteGoal && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => onEditGoal(g)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'transparent',
              color: '#A0A0A0',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Pencil size={14} />
            Edit Goal
          </button>
          <button
            onClick={() => void onDeleteGoal(goalId)}
            disabled={deleting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(232,0,45,0.12)',
              color: '#E8002D',
              border: '0.5px solid rgba(232,0,45,0.4)',
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 600,
              fontSize: 13,
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting...' : 'Delete Goal'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth()
  const [goals, setGoals] = useState<GoalCard[]>([])
  const [activeTab, setActiveTab] = useState<'mine' | 'partner' | 'shared'>('mine')
  const [showForm, setShowForm] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    current: '',
    target: '',
    unit: '',
    shared: false,
    category: 'fitness' as GoalCategory,
    targetDate: '',
  })
  const [loadingGoals, setLoadingGoals] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null)
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [progressDrafts, setProgressDrafts] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadGoals = async () => {
      if (!user) {
        setGoals([])
        setLoadingGoals(false)
        return
      }
      setLoadingGoals(true)
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load goals', error)
        setErrorMessage('Could not load your goals right now.')
        setGoals([])
        setLoadingGoals(false)
        return
      }
      setGoals(data.map(mapGoalRowToCard))
      setLoadingGoals(false)
    }
    if (!authLoading) void loadGoals()
  }, [authLoading, user])

  const addGoal = async () => {
    if (!user || !newGoal.title || !newGoal.target || !newGoal.unit) return
    setSubmitting(true)
    setErrorMessage(null)

    const payload = {
      title: newGoal.title.trim(),
      current_value: parseFloat(newGoal.current) || 0,
      target_value: parseFloat(newGoal.target),
      goal_type: newGoal.category,
      unit: newGoal.unit,
      deadline: newGoal.targetDate || null,
      is_shared: newGoal.shared,
      status: (parseFloat(newGoal.current) || 0) >= parseFloat(newGoal.target) ? 'completed' : 'active',
    } satisfies Database['public']['Tables']['goals']['Update']

    const response = editingGoalId
      ? await supabase
          .from('goals')
          .update(payload)
          .eq('id', editingGoalId)
          .select('*')
          .single()
      : await supabase
          .from('goals')
          .insert({
            owner_user_id: user.id,
            ...payload,
          })
          .select('*')
          .single()

    const { data, error } = response

    if (error) {
      console.error('Failed to save goal', error)
      setErrorMessage(editingGoalId ? 'Could not update your goal. Please try again.' : 'Could not create your goal. Please try again.')
      setSubmitting(false)
      return
    }

    const savedGoal = mapGoalRowToCard(data)
    setGoals(prev => editingGoalId
      ? prev.map(goal => (goal.id === editingGoalId ? savedGoal : goal))
      : [savedGoal, ...prev]
    )
    setNewGoal({ title: '', current: '', target: '', unit: '', shared: false, category: 'fitness', targetDate: '' })
    setEditingGoalId(null)
    setShowForm(false)
    setSubmitting(false)
  }

  const startEditingGoal = (goal: GoalCard) => {
    setErrorMessage(null)
    setEditingGoalId(goal.id)
    setNewGoal({
      title: goal.title,
      current: String(goal.current),
      target: String(goal.target),
      unit: goal.unit,
      shared: goal.shared,
      category: goal.category,
      targetDate: goal.targetDate ?? '',
    })
    setShowForm(true)
  }

  const cancelGoalForm = () => {
    setShowForm(false)
    setEditingGoalId(null)
    setNewGoal({ title: '', current: '', target: '', unit: '', shared: false, category: 'fitness', targetDate: '' })
  }

  const updateGoalProgress = async (goalId: string, nextValue: number) => {
    setSavingGoalId(goalId)
    setErrorMessage(null)

    const matchingGoal = goals.find(goal => goal.id === goalId)
    if (!matchingGoal) {
      setSavingGoalId(null)
      return
    }

    const nextStatus: Database['public']['Enums']['goal_status'] =
      nextValue >= matchingGoal.target ? 'completed' : 'active'

    const { data, error } = await supabase
      .from('goals')
      .update({
        current_value: nextValue,
        status: nextStatus,
      })
      .eq('id', goalId)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to update goal progress', error)
      setErrorMessage('Could not update your goal progress. Please try again.')
      setSavingGoalId(null)
      return
    }

    setGoals(prev => prev.map(goal => (goal.id === goalId ? mapGoalRowToCard(data) : goal)))
    setProgressDrafts(prev => ({ ...prev, [goalId]: String(nextValue) }))
    setSavingGoalId(null)
  }

  const deleteGoal = async (goalId: string) => {
    const goal = goals.find(item => item.id === goalId)
    if (!goal) {
      return
    }

    const confirmed = window.confirm(`Delete "${goal.title}"? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setDeletingGoalId(goalId)
    setErrorMessage(null)

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)

    if (error) {
      console.error('Failed to delete goal', error)
      setErrorMessage('Could not delete your goal. Please try again.')
      setDeletingGoalId(null)
      return
    }

    setGoals(prev => prev.filter(item => item.id !== goalId))
    setProgressDrafts(prev => {
      const next = { ...prev }
      delete next[goalId]
      return next
    })
    if (editingGoalId === goalId) {
      cancelGoalForm()
    }
    setDeletingGoalId(null)
  }

  const TABS: { key: 'mine' | 'partner' | 'shared'; label: string }[] = [
    { key: 'mine', label: 'My Goals' },
    { key: 'partner', label: "Priyana's Goals" },
    { key: 'shared', label: 'Shared' },
  ]

  const myActive = goals.filter(g => (g.current / g.target) * 100 < 100)
  const myCompleted = goals.filter(g => (g.current / g.target) * 100 >= 100)
  const partnerActive = PARTNER_GOALS.filter(g => (g.current / g.target) * 100 < 100)
  const partnerCompleted = PARTNER_GOALS.filter(g => (g.current / g.target) * 100 >= 100)
  const sharedGoals = goals
    .filter(g => g.shared)
    .map(g => {
      const match = PARTNER_GOALS.find(pg => pg.title === g.title)
      return match ? { ...g, partnerCurrent: match.current } : g
    })

  return (
    <>
      <style>{`
        .goals-wrapper {
          padding: 32px;
          max-width: 960px;
          margin: 0 auto;
        }
        .goals-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 1023px) {
          .goals-wrapper { padding: 72px 16px 24px; }
          .goals-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="goals-wrapper">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', marginBottom: 4 }}>
              Goals
            </h1>
            <p style={{ color: '#A0A0A0', fontSize: 14 }}>Track and crush your fitness goals</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <Plus size={16} /> New Goal
          </button>
        </div>

        {errorMessage && (
          <div style={{ borderRadius: 12, padding: 14, marginBottom: 20, backgroundColor: 'rgba(232,0,45,0.12)', border: '0.5px solid rgba(232,0,45,0.4)', color: '#fff', fontSize: 13 }}>
            {errorMessage}
          </div>
        )}

        {/* New goal form */}
        {showForm && (
          <div style={{ borderRadius: 16, padding: 24, marginBottom: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(232,0,45,0.4)' }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
              {editingGoalId ? 'Edit Goal' : 'Create New Goal'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Title */}
              <input
                placeholder="Goal title (e.g. Bench press 225 lbs)"
                value={newGoal.title}
                onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px', width: '100%', outline: 'none', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              {/* Category */}
              <select
                value={newGoal.category}
                onChange={e => setNewGoal(p => ({ ...p, category: e.target.value as GoalCategory }))}
                style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                <option value="fitness">Fitness</option>
                <option value="weight">Weight</option>
                <option value="nutrition">Nutrition</option>
              </select>
              {/* Values + unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <input
                  placeholder="Current value"
                  type="number"
                  value={newGoal.current}
                  onChange={e => setNewGoal(p => ({ ...p, current: e.target.value }))}
                  style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
                />
                <input
                  placeholder="Target value"
                  type="number"
                  value={newGoal.target}
                  onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                  style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
                />
                <select
                  value={newGoal.unit}
                  onChange={e => setNewGoal(p => ({ ...p, unit: e.target.value }))}
                  style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: newGoal.unit ? '#fff' : '#606060', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  <option value="" disabled>Unit</option>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {/* Target date */}
              <input
                type="date"
                value={newGoal.targetDate}
                onChange={e => setNewGoal(p => ({ ...p, targetDate: e.target.value }))}
                style={{ backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)', color: newGoal.targetDate ? '#fff' : '#606060', borderRadius: 10, padding: '11px 14px', outline: 'none', fontSize: 14, fontFamily: 'inherit', colorScheme: 'dark' }}
              />
              {/* Share toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newGoal.shared}
                  onChange={e => setNewGoal(p => ({ ...p, shared: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#E8002D' }}
                />
                <span style={{ color: '#A0A0A0', fontSize: 14 }}>Share with partner</span>
              </label>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={addGoal}
                  disabled={submitting}
                  style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? (editingGoalId ? 'Saving…' : 'Creating…') : (editingGoalId ? 'Save Changes' : 'Create Goal')}
                </button>
                <button
                  onClick={cancelGoalForm}
                  style={{ backgroundColor: 'transparent', color: '#A0A0A0', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, backgroundColor: '#1E1E1E', borderRadius: 12, padding: 4, border: '0.5px solid rgba(255,255,255,0.08)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                backgroundColor: activeTab === t.key ? '#2A2A2A' : 'transparent',
                color: activeTab === t.key ? '#fff' : '#606060',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── My Goals ── */}
        {loadingGoals ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Target size={40} style={{ color: '#2A2A2A', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Loading goals…</p>
          </div>
        ) : activeTab === 'mine' ? (
          myActive.length === 0 && myCompleted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Target size={40} style={{ color: '#2A2A2A', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No goals yet</p>
              <p style={{ color: '#A0A0A0', fontSize: 14 }}>Set your first goal and crush it with Priyana</p>
            </div>
          ) : (
            <>
              <div className="goals-grid">
                {myActive.map(g => (
                  <GoalCard
                    key={g.id}
                    g={g}
                    editable
                    saving={savingGoalId === g.id}
                    deleting={deletingGoalId === g.id}
                    onSaveProgress={updateGoalProgress}
                    onEditGoal={startEditingGoal}
                    onDeleteGoal={deleteGoal}
                    progressDrafts={progressDrafts}
                    setProgressDrafts={setProgressDrafts}
                  />
                ))}
              </div>
              {myCompleted.length > 0 && (
                <div style={{ marginTop: 40 }}>
                  <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Completed Goals 🎉</h2>
                  <div className="goals-grid">
                    {myCompleted.map(g => (
                      <GoalCard
                        key={g.id}
                        g={g}
                        editable
                        saving={savingGoalId === g.id}
                        deleting={deletingGoalId === g.id}
                        onSaveProgress={updateGoalProgress}
                        onEditGoal={startEditingGoal}
                        onDeleteGoal={deleteGoal}
                        progressDrafts={progressDrafts}
                        setProgressDrafts={setProgressDrafts}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        ) : activeTab === 'partner' ? (
          /* ── Priyana's Goals ── */
          <>
            <div className="goals-grid">
              {partnerActive.map(g => <GoalCard key={g.id} g={g} />)}
            </div>
            {partnerCompleted.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Completed Goals 🎉</h2>
                <div className="goals-grid">
                  {partnerCompleted.map(g => <GoalCard key={g.id} g={g} />)}
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Shared Goals ── */
          sharedGoals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Users size={40} style={{ color: '#2A2A2A', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No shared goals yet</p>
              <p style={{ color: '#A0A0A0', fontSize: 14 }}>Create a goal and toggle &quot;Share with partner&quot;</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sharedGoals.map(g => (
                <GoalCard
                  key={g.id}
                  g={g}
                  showDualRing
                  editable
                  saving={savingGoalId === g.id}
                  deleting={deletingGoalId === g.id}
                  onSaveProgress={updateGoalProgress}
                  onEditGoal={startEditingGoal}
                  onDeleteGoal={deleteGoal}
                  progressDrafts={progressDrafts}
                  setProgressDrafts={setProgressDrafts}
                />
              ))}
            </div>
          )
        )}
      </div>
    </>
  )
}

function mapGoalRowToCard(goal: GoalRow): GoalCard {
  const category = isGoalCategory(goal.goal_type) ? goal.goal_type : 'fitness'

  return {
    id: goal.id,
    title: goal.title,
    current: Number(goal.current_value),
    target: Number(goal.target_value),
    unit: goal.unit,
    shared: goal.is_shared,
    category,
    targetDate: goal.deadline ?? undefined,
  }
}

function isGoalCategory(value: string | null): value is GoalCategory {
  return value === 'fitness' || value === 'weight' || value === 'nutrition'
}
