'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Flame, Dumbbell, Target, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Label } from 'recharts'
import StatCard from '@/components/StatCard'
import NudgeButton from '@/components/NudgeButton'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type GoalRow = Database['public']['Tables']['goals']['Row']
type WorkoutRow = Database['public']['Tables']['workouts']['Row']
type FoodEntryRow = Database['public']['Tables']['food_entries']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type PartnershipRow = Database['public']['Tables']['partnerships']['Row']
type NudgeRow = Database['public']['Tables']['nudges']['Row']

type ChartTooltipPayload = {
  dataKey?: string
  name?: string
  value?: number | string
}

type ChartTooltipProps = {
  active?: boolean
  payload?: ChartTooltipPayload[]
  label?: string
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map(item => (
        <p key={item.dataKey} style={{ color: item.name === 'You' ? '#ffffff' : '#E8002D', fontWeight: 700, fontSize: 14 }}>
          {item.value} · {item.name}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { profile, user, loading: authLoading } = useAuth()
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there'

  const [loadingData, setLoadingData] = useState(true)
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [yourWorkouts, setYourWorkouts] = useState<WorkoutRow[]>([])
  const [yourFoodEntries, setYourFoodEntries] = useState<FoodEntryRow[]>([])
  const [activePartnership, setActivePartnership] = useState<PartnershipRow | null>(null)
  const [partnerProfile, setPartnerProfile] = useState<ProfileRow | null>(null)
  const [partnerWorkouts, setPartnerWorkouts] = useState<WorkoutRow[]>([])
  const [partnerFoodEntries, setPartnerFoodEntries] = useState<FoodEntryRow[]>([])
  const [recentNudges, setRecentNudges] = useState<NudgeRow[]>([])

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setGoals([])
      setYourWorkouts([])
      setYourFoodEntries([])
      setActivePartnership(null)
      setPartnerProfile(null)
      setPartnerWorkouts([])
      setPartnerFoodEntries([])
      setRecentNudges([])
      setLoadingData(false)
      return
    }

    setLoadingData(true)

    const today = new Date()
    const weekStart = startOfWeek(today)
    const weekStartString = toDateString(weekStart)

    const [goalsResult, workoutsResult, foodResult, partnershipsResult] = await Promise.all([
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false })
        .limit(20),
      supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', weekStartString)
        .order('entry_date', { ascending: false }),
      supabase
        .from('partnerships')
        .select('*')
        .eq('status', 'active')
        .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
        .limit(1),
    ])

    if (goalsResult.error || workoutsResult.error || foodResult.error || partnershipsResult.error) {
      console.error('Failed to load dashboard data', {
        goalsError: goalsResult.error,
        workoutsError: workoutsResult.error,
        foodError: foodResult.error,
        partnershipsError: partnershipsResult.error,
      })
      setLoadingData(false)
      return
    }

    setGoals(goalsResult.data || [])
    setYourWorkouts(workoutsResult.data || [])
    setYourFoodEntries(foodResult.data || [])

    const partnership = partnershipsResult.data?.[0] ?? null
    setActivePartnership(partnership)

    if (!partnership) {
      setPartnerProfile(null)
      setPartnerWorkouts([])
      setPartnerFoodEntries([])
      setRecentNudges([])
      setLoadingData(false)
      return
    }

    const partnerId = partnership.user_one_id === user.id ? partnership.user_two_id : partnership.user_one_id

    const [partnerProfileResult, partnerWorkoutsResult, partnerFoodResult, nudgesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', partnerId).single(),
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', partnerId)
        .order('workout_date', { ascending: false })
        .limit(20),
      supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', partnerId)
        .gte('entry_date', weekStartString)
        .order('entry_date', { ascending: false }),
      supabase
        .from('nudges')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (partnerProfileResult.error || partnerWorkoutsResult.error || partnerFoodResult.error || nudgesResult.error) {
      console.error('Failed to load partner dashboard data', {
        partnerProfileError: partnerProfileResult.error,
        partnerWorkoutsError: partnerWorkoutsResult.error,
        partnerFoodError: partnerFoodResult.error,
        nudgesError: nudgesResult.error,
      })
      setPartnerProfile(null)
      setPartnerWorkouts([])
      setPartnerFoodEntries([])
      setRecentNudges([])
      setLoadingData(false)
      return
    }

    setPartnerProfile(partnerProfileResult.data)
    setPartnerWorkouts(partnerWorkoutsResult.data || [])
    setPartnerFoodEntries(partnerFoodResult.data || [])
    setRecentNudges(nudgesResult.data || [])
    setLoadingData(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      const timeoutId = window.setTimeout(() => {
        void loadDashboard()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [authLoading, loadDashboard])

  const activeGoalCount = goals.filter(goal => goal.status === 'active').length
  const completedGoalCount = goals.filter(goal => goal.status === 'completed').length
  const dailyCalorieGoal = profile?.daily_calorie_goal ?? 2000
  const dashboardGoals = goals.slice(0, 2)
  const weeklyWorkoutCount = countWorkoutsThisWeek(yourWorkouts)
  const workoutMinutesThisWeek = sumWorkoutMinutesThisWeek(yourWorkouts)
  const workoutStreak = calculateWorkoutStreak(yourWorkouts)
  const recentWorkouts = yourWorkouts.slice(0, 3)
  const todayString = toDateString(new Date())
  const todayCalories = yourFoodEntries
    .filter(entry => entry.entry_date === todayString)
    .reduce((sum, entry) => sum + entry.calories, 0)
  const todayCaloriesPercent = Math.min(100, Math.round((todayCalories / Math.max(dailyCalorieGoal, 1)) * 100))
  const workedOutToday = yourHasWorkoutOnDate(yourWorkouts, todayString)
  const loggedFoodToday = yourFoodEntries.some(entry => entry.entry_date === todayString)
  const workoutConsistency = calculateWeeklyConsistency(yourWorkouts)
  const nutritionConsistency = calculateNutritionConsistency(yourFoodEntries)
  const checkInItems = [
    {
      label: 'Workout',
      complete: workedOutToday,
      description: workedOutToday ? 'You logged a workout today.' : 'No workout logged yet today.',
    },
    {
      label: 'Nutrition',
      complete: loggedFoodToday,
      description: loggedFoodToday ? 'You logged food today.' : 'No food entries logged yet today.',
    },
    {
      label: 'Goals',
      complete: activeGoalCount > 0,
      description: activeGoalCount > 0 ? `${activeGoalCount} active goals in progress.` : 'Create a goal to start tracking progress.',
    },
  ]

  const partnerId = activePartnership && user
    ? activePartnership.user_one_id === user.id
      ? activePartnership.user_two_id
      : activePartnership.user_one_id
    : null
  const partnerName = partnerProfile?.display_name || 'your partner'
  const partnerFirstName = partnerProfile?.display_name.split(' ')[0] || 'Partner'
  const partnerInitials = getInitials(partnerProfile?.display_name || partnerProfile?.email || 'FT')
  const partnerWorkoutCount = countWorkoutsThisWeek(partnerWorkouts)
  const partnerStreak = calculateWorkoutStreak(partnerWorkouts)
  const partnerWorkedOutToday = yourHasWorkoutOnDate(partnerWorkouts, toDateString(new Date()))
  const partnerTodayCalories = partnerFoodEntries
    .filter(entry => entry.entry_date === todayString)
    .reduce((sum, entry) => sum + entry.calories, 0)
  const recentActivity = buildRecentActivityFeed({
    recentWorkouts,
    recentNudges,
    partnerProfile,
    partnerWorkouts,
    partnerFoodEntries,
  })

  const weeklyWorkoutData = useMemo(
    () => buildWeeklyWorkoutMinutes(yourWorkouts, partnerWorkouts),
    [yourWorkouts, partnerWorkouts]
  )
  const nutritionData = useMemo(
    () => buildWeeklyNutritionData(yourFoodEntries, partnerFoodEntries),
    [yourFoodEntries, partnerFoodEntries]
  )

  return (
    <>
      <style>{`
        .dash-wrapper { padding: 32px; max-width: 1280px; margin: 0 auto; }
        .dash-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .dash-header h1 { font-size: 1.875rem; }
        .stat-grid { display: grid; gap: 20px; margin-bottom: 32px; }
        .charts-grid { display: grid; gap: 24px; margin-bottom: 32px; }
        .dash-bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        .dash-wide { grid-column: span 2; }
        @media (max-width: 1023px) {
          .dash-wrapper { padding: 72px 16px 32px; }
          .dash-header { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
          .dash-header h1 { font-size: 1.5rem; }
          .stat-grid { grid-template-columns: 1fr 1fr !important; margin-bottom: 24px; }
          .charts-grid { grid-template-columns: 1fr !important; margin-bottom: 24px; }
          .dash-bottom { grid-template-columns: 1fr; gap: 20px; }
          .dash-wide { grid-column: span 1; }
        }
      `}</style>
      <div className="dash-wrapper">
        <div className="dash-header">
          <div>
            <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>
              Good morning, {firstName} 👋
            </h1>
            <p style={{ color: '#A0A0A0', marginTop: 4 }}>
              {partnerProfile
                ? `Shared fitness dashboard — you & ${partnerName}`
                : 'Your personal fitness dashboard'}
            </p>
          </div>
          {partnerId && user && partnerProfile ? (
            <NudgeButton
              partnerName={partnerFirstName}
              senderId={user.id}
              recipientId={partnerId}
            />
          ) : null}
        </div>

        {/* ── Partnership identity banner ── */}
        {!loadingData && partnerProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, borderRadius: 14, overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            {/* Your side */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', backgroundColor: '#1A1A1A' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#2A2A2A', border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {getInitials(profile?.display_name || profile?.email || 'Me')}
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{firstName}</p>
                <p style={{ color: '#A0A0A0', fontSize: 12 }}>
                  {workedOutToday ? '✓ Worked out today' : 'No workout yet'}
                </p>
              </div>
            </div>
            {/* Center divider */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px', backgroundColor: '#161616', alignSelf: 'stretch', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: 18 }}>❤️</span>
              <span style={{ color: '#4ade80', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>CONNECTED</span>
            </div>
            {/* Partner side */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '14px 20px', backgroundColor: '#1A1A1A' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#E8002D', fontWeight: 700, fontSize: 14 }}>{partnerName}</p>
                <p style={{ color: '#A0A0A0', fontSize: 12 }}>
                  {partnerWorkedOutToday ? '✓ Worked out today' : 'No workout yet'}
                </p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#E8002D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {partnerInitials}
              </div>
            </div>
          </div>
        )}
        {!loadingData && !partnerProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, borderRadius: 14, padding: '14px 20px', backgroundColor: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#A0A0A0', flexShrink: 0 }} />
            <p style={{ color: '#A0A0A0', fontSize: 14 }}>No partner connected yet —</p>
            <Link href="/partner" style={{ color: '#E8002D', fontSize: 14, fontWeight: 600 }}>invite your partner</Link>
            <p style={{ color: '#A0A0A0', fontSize: 14 }}>to unlock shared stats, head-to-head charts, and nudges.</p>
          </div>
        )}

        <p style={{ color: '#606060', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Your Stats</p>
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatCard
            label="Workout Minutes"
            value={loadingData ? '...' : workoutMinutesThisWeek}
            unit="min"
            icon={<Flame size={16} />}
            accent
            change="This week"
            changePositive
          />
          <StatCard
            label="Workouts This Week"
            value={loadingData ? '...' : weeklyWorkoutCount}
            unit="sessions"
            icon={<Dumbbell size={16} />}
            change={weeklyWorkoutCount > 0 ? 'Live from your workout log' : 'Log your first workout'}
            changePositive={weeklyWorkoutCount > 0}
          />
          <StatCard
            label="Active Goals"
            value={loadingData ? '...' : activeGoalCount}
            unit="goals"
            icon={<Target size={16} />}
          />
          <StatCard
            label="My Streak"
            value={loadingData ? '...' : workoutStreak}
            unit="days"
            icon={<Zap size={16} />}
            accent
            change={workoutStreak > 0 ? 'Based on workout dates' : 'Start with one workout'}
            changePositive={workoutStreak > 0}
          />
          <StatCard
            label="Today Calories"
            value={loadingData ? '...' : todayCalories}
            unit="kcal"
            icon={<Flame size={16} />}
            change={`Goal ${dailyCalorieGoal} kcal`}
            changePositive={todayCalories > 0}
          />
        </div>

        <p style={{ color: '#606060', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Your Check-In</p>
        <div className="charts-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', marginBottom: 24 }}>
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>Today&apos;s Check-In</h2>
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Your three signals for today.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{todayCaloriesPercent}%</p>
                <p style={{ color: '#A0A0A0', fontSize: 12 }}>calorie goal reached</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {checkInItems.map(item => (
                <div key={item.label} style={{ borderRadius: 12, padding: 16, backgroundColor: '#252525' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{item.label}</span>
                    <span style={{ color: item.complete ? '#4ade80' : '#A0A0A0', fontSize: 12, fontWeight: 700 }}>
                      {item.complete ? 'Done' : 'Pending'}
                    </span>
                  </div>
                  <p style={{ color: '#A0A0A0', fontSize: 13, lineHeight: 1.5 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>Weekly Consistency</h2>
            <p style={{ color: '#A0A0A0', fontSize: 14, marginBottom: 16 }}>How steady your habits have been so far this week.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Workout consistency', value: workoutConsistency, accent: '#E8002D' },
                { label: 'Nutrition consistency', value: nutritionConsistency, accent: '#ffffff' },
                { label: 'Completed goals', value: activeGoalCount + completedGoalCount === 0 ? 0 : Math.round((completedGoalCount / Math.max(activeGoalCount + completedGoalCount, 1)) * 100), accent: '#4ade80' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#A0A0A0', fontSize: 12 }}>{item.label}</span>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{item.value}%</span>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 999, backgroundColor: '#252525' }}>
                    <div style={{ width: `${item.value}%`, height: '100%', borderRadius: 999, backgroundColor: item.accent }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ color: '#606060', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          {partnerProfile ? `Joint Activity — You & ${partnerFirstName}` : 'Your Activity'}
        </p>
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>Weekly Workout Minutes</h2>
            <p style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 14 }}>
              {partnerProfile ? 'You vs your partner' : 'Your activity this week'}
            </p>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ffffff' }} />
                <span style={{ fontSize: 12, color: '#A0A0A0' }}>You</span>
              </div>
              {partnerProfile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#E8002D' }} />
                  <span style={{ fontSize: 12, color: '#A0A0A0' }}>{partnerFirstName}</span>
                </div>
              ) : null}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyWorkoutData} barGap={4} margin={{ top: 8, right: 8, bottom: 0, left: 12 }}>
                <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} width={54}>
                  <Label
                    value="Minutes"
                    angle={-90}
                    position="insideLeft"
                    offset={-6}
                    style={{ fill: '#A0A0A0', fontSize: 12, fontWeight: 600 }}
                  />
                </YAxis>
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="you" name="You" fill="#ffffff" radius={[4, 4, 0, 0]} />
                {partnerProfile ? <Bar dataKey="partner" name={partnerFirstName} fill="#E8002D" radius={[4, 4, 0, 0]} /> : null}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>Calorie Intake</h2>
            <p style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 14 }}>
              {partnerProfile ? 'Daily totals this week' : 'Your logged food totals this week'}
            </p>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ffffff' }} />
                <span style={{ fontSize: 12, color: '#A0A0A0' }}>You</span>
              </div>
              {partnerProfile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#E8002D' }} />
                  <span style={{ fontSize: 12, color: '#A0A0A0' }}>{partnerFirstName}</span>
                </div>
              ) : null}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={nutritionData} margin={{ top: 8, right: 8, bottom: 0, left: 18 }}>
                <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} width={64}>
                  <Label
                    value="Calories"
                    angle={-90}
                    position="insideLeft"
                    offset={-10}
                    style={{ fill: '#A0A0A0', fontSize: 12, fontWeight: 600 }}
                  />
                </YAxis>
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                <Line type="monotone" dataKey="you" name="You" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#ffffff', r: 4 }} activeDot={{ fill: '#ffffff', r: 6 }} />
                {partnerProfile ? (
                  <Line type="monotone" dataKey="partner" name={partnerFirstName} stroke="#E8002D" strokeWidth={2} dot={{ fill: '#E8002D', r: 4 }} activeDot={{ fill: '#E8002D', r: 6 }} />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-bottom">
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.125rem' }}>Recent Workouts</h2>
              <Link href="/workout" style={{ color: '#E8002D', fontSize: 14, fontWeight: 600, letterSpacing: '0.2px' }}>View all</Link>
            </div>
            {recentWorkouts.length === 0 ? (
              <p style={{ color: '#A0A0A0', fontSize: 14 }}>No workouts yet. Start logging to see them here.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentWorkouts.map(workout => (
                  <div key={workout.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, backgroundColor: '#252525' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,0,45,0.12)', flexShrink: 0 }}>
                      <Dumbbell size={16} style={{ color: '#E8002D' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {workout.title}
                      </p>
                      <p style={{ color: '#A0A0A0', fontSize: 12 }}>{workout.duration_minutes} min</p>
                    </div>
                    <span style={{ color: '#A0A0A0', fontSize: 11, flexShrink: 0 }}>{workout.workout_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-wide" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ color: '#fff', fontWeight: 600 }}>Partner Activity</h2>
                <Link href="/partner" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' }}>View</Link>
              </div>

              {!partnerProfile ? (
                <div style={{ padding: 18, borderRadius: 12, backgroundColor: '#252525' }}>
                  <p style={{ color: '#fff', fontWeight: 600, marginBottom: 6 }}>No partner connected yet</p>
                  <p style={{ color: '#A0A0A0', fontSize: 14, marginBottom: 12 }}>
                    Invite your partner from the partner page to unlock nudges, comparisons, and shared accountability.
                  </p>
                  <Link href="/partner" style={{ color: '#E8002D', fontSize: 14, fontWeight: 600 }}>
                    Set up partner connection
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', backgroundColor: '#E8002D', flexShrink: 0, fontSize: 13 }}>
                        {partnerInitials}
                      </div>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{partnerName}</p>
                        <p style={{ color: partnerWorkedOutToday ? '#4ade80' : '#A0A0A0', fontSize: 12 }}>
                          {partnerWorkedOutToday ? 'Worked out today' : 'No workout logged today'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ borderRadius: 10, padding: 12, textAlign: 'center', backgroundColor: '#252525' }}>
                        <p style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{partnerStreak}</p>
                        <p style={{ color: '#A0A0A0', fontSize: 11 }}>Day streak</p>
                      </div>
                      <div style={{ borderRadius: 10, padding: 12, textAlign: 'center', backgroundColor: '#252525' }}>
                        <p style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{partnerWorkoutCount}</p>
                        <p style={{ color: '#A0A0A0', fontSize: 11 }}>This week</p>
                      </div>
                      <div style={{ borderRadius: 10, padding: 12, textAlign: 'center', backgroundColor: '#252525', gridColumn: 'span 2' }}>
                        <p style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{partnerTodayCalories}</p>
                        <p style={{ color: '#A0A0A0', fontSize: 11 }}>Calories logged today</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p style={{ color: '#A0A0A0', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Head-to-Head</p>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ffffff' }} />
                        <span style={{ fontSize: 11, color: '#A0A0A0' }}>You</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#E8002D' }} />
                        <span style={{ fontSize: 11, color: '#A0A0A0' }}>{partnerFirstName}</span>
                      </div>
                    </div>
                    {[
                      { label: 'Weekly Workouts', you: weeklyWorkoutCount, partner: partnerWorkoutCount },
                      { label: 'Workout Minutes', you: workoutMinutesThisWeek, partner: sumWorkoutMinutesThisWeek(partnerWorkouts) },
                      { label: 'Current Streak', you: workoutStreak, partner: partnerStreak },
                    ].map(item => {
                      const total = item.you + item.partner || 1
                      const youPct = Math.round((item.you / total) * 100)
                      return (
                        <div key={item.label} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 11, color: '#A0A0A0' }}>{item.label}</span>
                            <span style={{ fontSize: 11, color: '#A0A0A0' }}>
                              <span style={{ color: '#fff' }}>{item.you}</span>
                              {' vs '}
                              <span style={{ color: '#E8002D' }}>{item.partner}</span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', height: 4, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                            <div style={{ width: `${youPct}%`, backgroundColor: '#ffffff', borderRadius: '4px 0 0 4px' }} />
                            <div style={{ width: `${100 - youPct}%`, backgroundColor: '#E8002D', borderRadius: '0 4px 4px 0' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ color: '#fff', fontWeight: 600 }}>Goals</h2>
                <Link href="/goals" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' }}>All goals</Link>
              </div>
              {loadingData ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Loading goals...</p>
              ) : dashboardGoals.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>No goals yet. Create your first goal to see it here.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {dashboardGoals.map(goal => {
                    const pct = Math.min(100, Math.round((Number(goal.current_value) / Math.max(Number(goal.target_value), 1)) * 100))
                    return (
                      <div key={goal.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: '#fff', fontSize: 14 }}>{goal.title}</span>
                          <span style={{ color: goal.status === 'completed' ? '#4ade80' : '#E8002D', fontWeight: 700, fontSize: 14 }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 6, borderRadius: 6, backgroundColor: '#2A2A2A' }}>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 6,
                              width: `${pct}%`,
                              backgroundColor: goal.status === 'completed' ? '#4ade80' : '#E8002D',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ borderRadius: 16, padding: 20, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ color: '#fff', fontWeight: 600 }}>Recent Activity</h2>
                <Link href="/partner" style={{ color: '#E8002D', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' }}>Partner view</Link>
              </div>
              {recentActivity.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Log workouts, food, or send a nudge to start filling your activity feed.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentActivity.map((item, index) => (
                    <div key={`${item.label}-${index}`} style={{ borderRadius: 12, padding: 14, backgroundColor: '#252525' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{item.label}</p>
                        <span style={{ color: '#A0A0A0', fontSize: 11 }}>{item.time}</span>
                      </div>
                      <p style={{ color: '#A0A0A0', fontSize: 13, lineHeight: 1.45 }}>{item.description}</p>
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

function startOfWeek(reference: Date) {
  const date = new Date(reference)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + diff)
  return date
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10)
}

function countWorkoutsThisWeek(workouts: WorkoutRow[]) {
  const start = startOfWeek(new Date())
  return workouts.filter(workout => new Date(workout.workout_date) >= start).length
}

function sumWorkoutMinutesThisWeek(workouts: WorkoutRow[]) {
  const start = startOfWeek(new Date())
  return workouts
    .filter(workout => new Date(workout.workout_date) >= start)
    .reduce((sum, workout) => sum + workout.duration_minutes, 0)
}

function buildWeeklyWorkoutMinutes(yourWorkouts: WorkoutRow[], partnerWorkouts: WorkoutRow[]) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const monday = startOfWeek(new Date())

  return labels.map((label, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    const dateString = toDateString(day)

    return {
      date: label,
      you: yourWorkouts
        .filter(workout => workout.workout_date === dateString)
        .reduce((sum, workout) => sum + workout.duration_minutes, 0),
      partner: partnerWorkouts
        .filter(workout => workout.workout_date === dateString)
        .reduce((sum, workout) => sum + workout.duration_minutes, 0),
    }
  })
}

function buildWeeklyNutritionData(yourEntries: FoodEntryRow[], partnerEntries: FoodEntryRow[]) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const monday = startOfWeek(new Date())

  return labels.map((label, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    const dateString = toDateString(day)

    return {
      date: label,
      you: yourEntries
        .filter(entry => entry.entry_date === dateString)
        .reduce((sum, entry) => sum + entry.calories, 0),
      partner: partnerEntries
        .filter(entry => entry.entry_date === dateString)
        .reduce((sum, entry) => sum + entry.calories, 0),
    }
  })
}

function calculateWorkoutStreak(workouts: WorkoutRow[]) {
  const uniqueDates = new Set(workouts.map(workout => workout.workout_date))
  let streak = 0
  const currentDate = new Date()

  while (true) {
    const dateString = toDateString(currentDate)
    if (!uniqueDates.has(dateString)) {
      if (streak === 0) {
        currentDate.setDate(currentDate.getDate() - 1)
        const yesterdayString = toDateString(currentDate)
        if (!uniqueDates.has(yesterdayString)) {
          return 0
        }
        streak += 1
      } else {
        break
      }
    } else {
      streak += 1
    }

    currentDate.setDate(currentDate.getDate() - 1)
  }

  return streak
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

function yourHasWorkoutOnDate(workouts: WorkoutRow[], dateString: string) {
  return workouts.some(workout => workout.workout_date === dateString)
}

function calculateWeeklyConsistency(workouts: WorkoutRow[]) {
  const activeDays = new Set(
    workouts
      .filter(workout => new Date(workout.workout_date) >= startOfWeek(new Date()))
      .map(workout => workout.workout_date)
  )
  const daysSoFar = getElapsedWeekdayCount()
  return Math.round((activeDays.size / Math.max(daysSoFar, 1)) * 100)
}

function calculateNutritionConsistency(entries: FoodEntryRow[]) {
  const activeDays = new Set(entries.map(entry => entry.entry_date))
  const daysSoFar = getElapsedWeekdayCount()
  return Math.round((activeDays.size / Math.max(daysSoFar, 1)) * 100)
}

function getElapsedWeekdayCount() {
  const today = new Date()
  const monday = startOfWeek(today)
  const diffMs = today.getTime() - monday.getTime()
  return Math.min(7, Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1))
}

function buildRecentActivityFeed({
  recentWorkouts,
  recentNudges,
  partnerProfile,
  partnerWorkouts,
  partnerFoodEntries,
}: {
  recentWorkouts: WorkoutRow[]
  recentNudges: NudgeRow[]
  partnerProfile: ProfileRow | null
  partnerWorkouts: WorkoutRow[]
  partnerFoodEntries: FoodEntryRow[]
}) {
  const partnerFirstName = partnerProfile?.display_name?.split(' ')[0] ?? 'Your partner'
  const items: { label: string; description: string; time: string; sortKey: number }[] = []

  recentWorkouts.slice(0, 2).forEach(workout => {
    items.push({
      label: 'Workout logged',
      description: `You completed "${workout.title}" for ${workout.duration_minutes} minutes.`,
      time: formatRelativeDate(workout.workout_date),
      sortKey: new Date(`${workout.workout_date}T12:00:00`).getTime(),
    })
  })

  partnerWorkouts.slice(0, 2).forEach(workout => {
    items.push({
      label: 'Partner workout',
      description: `${partnerFirstName} logged "${workout.title}" for ${workout.duration_minutes} minutes.`,
      time: formatRelativeDate(workout.workout_date),
      sortKey: new Date(`${workout.workout_date}T12:00:00`).getTime(),
    })
  })

  partnerFoodEntries.slice(0, 1).forEach(entry => {
    items.push({
      label: 'Partner nutrition',
      description: `${partnerFirstName} logged ${entry.food_name} for ${entry.calories} kcal.`,
      time: formatRelativeDate(entry.entry_date),
      sortKey: new Date(`${entry.entry_date}T11:00:00`).getTime(),
    })
  })

  recentNudges.slice(0, 2).forEach(nudge => {
    const sentAt = new Date(nudge.created_at)
    items.push({
      label: 'Nudge sent',
      description: nudge.message,
      time: sentAt.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      sortKey: sentAt.getTime(),
    })
  })

  return items
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 5)
    .map(({ label, description, time }) => ({ label, description, time }))
}

function formatRelativeDate(value: string) {
  const today = toDateString(new Date())
  if (value === today) {
    return 'Today'
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (value === toDateString(yesterday)) {
    return 'Yesterday'
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}
