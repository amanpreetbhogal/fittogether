'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Dumbbell, Flame, Mail, Target, Trophy, UserPlus, Users, Clock, UtensilsCrossed } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import NudgeButton from '@/components/NudgeButton'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type PartnershipRow = Database['public']['Tables']['partnerships']['Row']
type PartnershipInviteRow = Database['public']['Tables']['partnership_invites']['Row']
type WorkoutRow = Database['public']['Tables']['workouts']['Row']
type GoalRow = Database['public']['Tables']['goals']['Row']
type FoodEntryRow = Database['public']['Tables']['food_entries']['Row']
type NudgeRow = Database['public']['Tables']['nudges']['Row']
type PartnershipStatus = Database['public']['Enums']['partnership_status']

type PartnerTooltipProps = {
  active?: boolean
  payload?: Array<{ value?: number | string }>
  label?: string
}

type InviteCard = PartnershipInviteRow & {
  direction: 'incoming' | 'outgoing'
}

type PartnerActivityItem = {
  id: string
  title: string
  description: string
  occurredAt: string
  badge: string
}

const CustomTooltip = ({ active, payload, label }: PartnerTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#E8002D', fontWeight: 700, fontSize: 14 }}>{payload[0].value} min</p>
      </div>
    )
  }
  return null
}

export default function PartnerPage() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submittingInvite, setSubmittingInvite] = useState(false)
  const [workingInviteId, setWorkingInviteId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileRow | null>(null)
  const [activePartnership, setActivePartnership] = useState<PartnershipRow | null>(null)
  const [partnerProfile, setPartnerProfile] = useState<ProfileRow | null>(null)
  const [incomingInvites, setIncomingInvites] = useState<PartnershipInviteRow[]>([])
  const [outgoingInvites, setOutgoingInvites] = useState<PartnershipInviteRow[]>([])
  const [partnerWorkouts, setPartnerWorkouts] = useState<WorkoutRow[]>([])
  const [yourWorkouts, setYourWorkouts] = useState<WorkoutRow[]>([])
  const [sharedGoals, setSharedGoals] = useState<GoalRow[]>([])
  const [partnerFoodEntries, setPartnerFoodEntries] = useState<FoodEntryRow[]>([])
  const [nudges, setNudges] = useState<NudgeRow[]>([])

  const inviteCards = useMemo<InviteCard[]>(() => {
    const incoming = incomingInvites.map(invite => ({ ...invite, direction: 'incoming' as const }))
    const outgoing = outgoingInvites.map(invite => ({ ...invite, direction: 'outgoing' as const }))
    return [...incoming, ...outgoing]
  }, [incomingInvites, outgoingInvites])

  const partnerFirstName = partnerProfile?.display_name.split(' ')[0] || 'Partner'
  const partnerInitials = getInitials(partnerProfile?.display_name || partnerProfile?.email || 'FT')
  const partnerWeeklyWorkouts = countWorkoutsThisWeek(partnerWorkouts)
  const yourWeeklyWorkouts = countWorkoutsThisWeek(yourWorkouts)
  const partnerTodayCalories = partnerFoodEntries
    .filter(entry => entry.entry_date === todayString())
    .reduce((sum, entry) => sum + entry.calories, 0)
  const partnerLastWorkout = partnerWorkouts[0]?.workout_date || 'No workouts yet'
  const comparisonItems = [
    { label: 'Weekly Workouts', you: yourWeeklyWorkouts, partner: partnerWeeklyWorkouts, unit: '' },
    { label: 'Total Workout Minutes', you: sumWorkoutMinutes(yourWorkouts), partner: sumWorkoutMinutes(partnerWorkouts), unit: 'min' },
    { label: 'Shared Goals', you: sharedGoals.filter(goal => goal.owner_user_id === user?.id).length, partner: sharedGoals.filter(goal => goal.owner_user_id === partnerProfile?.id).length, unit: '' },
  ]
  const partnerWorkoutHistory = buildWeeklyWorkoutHistory(partnerWorkouts)
  const partnerActivity = useMemo(
    () => buildPartnerActivityFeed({
      partnerFirstName,
      partnerWorkouts,
      partnerFoodEntries,
      sharedGoals,
      nudges,
      userId: user?.id ?? null,
    }),
    [nudges, partnerFirstName, partnerFoodEntries, partnerWorkouts, sharedGoals, user?.id]
  )
  const partnerId = activePartnership && user
    ? activePartnership.user_one_id === user.id
      ? activePartnership.user_two_id
      : activePartnership.user_one_id
    : null

  const sendInvite = async () => {
    if (!user || !currentUserProfile) {
      return
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase()

    if (!normalizedEmail) {
      setErrorMessage('Enter your partner’s email to send an invite.')
      return
    }

    if (normalizedEmail === currentUserProfile.email.toLowerCase()) {
      setErrorMessage('You can’t invite your own email.')
      return
    }

    if (activePartnership) {
      setErrorMessage('You already have an active partner.')
      return
    }

    if (inviteCards.some(invite => invite.recipient_email.toLowerCase() === normalizedEmail)) {
      setErrorMessage('There is already a pending invite for that email.')
      return
    }

    setSubmittingInvite(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const { error } = await supabase
      .from('partnership_invites')
      .insert({
        sender_id: user.id,
        recipient_email: normalizedEmail,
        status: 'pending',
      })

    if (error) {
      console.error('Failed to send invite', error)
      setErrorMessage(getPartnershipErrorMessage(error.message, 'Could not send the partner invite. Please try again.'))
      setSubmittingInvite(false)
      return
    }

    setSuccessMessage(`Invite sent to ${normalizedEmail}`)
    setInviteEmail('')
    setSubmittingInvite(false)

    const { data: refreshedInvites } = await supabase
      .from('partnership_invites')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (refreshedInvites) {
      const lowerEmail = currentUserProfile.email.toLowerCase()
      setIncomingInvites(refreshedInvites.filter(invite => invite.recipient_email.toLowerCase() === lowerEmail))
      setOutgoingInvites(refreshedInvites.filter(invite => invite.sender_id === user.id))
    }
  }

  const acceptInvite = async (invite: PartnershipInviteRow) => {
    if (!user) {
      return
    }

    setWorkingInviteId(invite.id)
    setErrorMessage(null)
    setSuccessMessage(null)

    const { error: partnershipError } = await supabase
      .from('partnerships')
      .insert({
        user_one_id: invite.sender_id,
        user_two_id: user.id,
        status: 'active',
      })

    if (partnershipError) {
      console.error('Failed to accept invite', partnershipError)
      setErrorMessage(getPartnershipErrorMessage(partnershipError.message, 'Could not accept this invite. One of you may already have a partner.'))
      setWorkingInviteId(null)
      return
    }

    const { error: inviteError } = await supabase
      .from('partnership_invites')
      .update({ status: 'active' })
      .eq('id', invite.id)

    if (inviteError) {
      console.error('Failed to update invite after accept', inviteError)
    }

    setSuccessMessage('Partner invite accepted.')
    setWorkingInviteId(null)
    window.location.reload()
  }

  const updateInviteStatus = async (inviteId: string, status: Extract<PartnershipStatus, 'declined' | 'revoked'>) => {
    setWorkingInviteId(inviteId)
    setErrorMessage(null)
    setSuccessMessage(null)

    const { error } = await supabase
      .from('partnership_invites')
      .update({ status })
      .eq('id', inviteId)

    if (error) {
      console.error('Failed to update invite', error)
      setErrorMessage('Could not update this invite right now.')
      setWorkingInviteId(null)
      return
    }

    setIncomingInvites(prev => prev.filter(invite => invite.id !== inviteId))
    setOutgoingInvites(prev => prev.filter(invite => invite.id !== inviteId))
    setSuccessMessage(status === 'declined' ? 'Invite declined.' : 'Invite canceled.')
    setWorkingInviteId(null)
  }

  const loadPartnerState = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage(null)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Failed to load profile', profileError)
      setErrorMessage('Could not load your partner data right now.')
      setLoading(false)
      return
    }

    setCurrentUserProfile(profile)

    const { data: invites, error: invitesError } = await supabase
      .from('partnership_invites')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (invitesError) {
      console.error('Failed to load invites', invitesError)
      setErrorMessage('Could not load your partner data right now.')
      setLoading(false)
      return
    }

    const normalizedEmail = profile.email.toLowerCase()
    setIncomingInvites(invites.filter(invite => invite.recipient_email.toLowerCase() === normalizedEmail))
    setOutgoingInvites(invites.filter(invite => invite.sender_id === user.id))

    const { data: partnerships, error: partnershipsError } = await supabase
      .from('partnerships')
      .select('*')
      .eq('status', 'active')
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
      .limit(1)

    if (partnershipsError) {
      console.error('Failed to load partnership', partnershipsError)
      setErrorMessage('Could not load your partner data right now.')
      setLoading(false)
      return
    }

    const partnership = partnerships?.[0] ?? null
    setActivePartnership(partnership)

    if (!partnership) {
      setPartnerProfile(null)
      setPartnerWorkouts([])
      setYourWorkouts([])
      setSharedGoals([])
      setPartnerFoodEntries([])
      setNudges([])
      setLoading(false)
      return
    }

    const nextPartnerId = partnership.user_one_id === user.id ? partnership.user_two_id : partnership.user_one_id
    const weekStartDate = startOfWeek()
    const weekStartString = weekStartDate.toISOString().slice(0, 10)

    const [
      partnerProfileResult,
      partnerWorkoutsResult,
      yourWorkoutsResult,
      sharedGoalsResult,
      partnerFoodResult,
      nudgesResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', nextPartnerId).single(),
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', nextPartnerId)
        .order('workout_date', { ascending: false })
        .limit(20),
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false })
        .limit(20),
      supabase
        .from('goals')
        .select('*')
        .eq('is_shared', true)
        .or(`owner_user_id.eq.${user.id},owner_user_id.eq.${nextPartnerId}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', nextPartnerId)
        .gte('entry_date', weekStartString)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('nudges')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${nextPartnerId}),and(sender_id.eq.${nextPartnerId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    if (
      partnerProfileResult.error ||
      partnerWorkoutsResult.error ||
      yourWorkoutsResult.error ||
      sharedGoalsResult.error ||
      partnerFoodResult.error ||
      nudgesResult.error
    ) {
      console.error('Failed to load partner details', {
        partnerProfileError: partnerProfileResult.error,
        partnerWorkoutsError: partnerWorkoutsResult.error,
        yourWorkoutsError: yourWorkoutsResult.error,
        sharedGoalsError: sharedGoalsResult.error,
        partnerFoodError: partnerFoodResult.error,
        nudgesError: nudgesResult.error,
      })
      setErrorMessage('Could not load your partner details right now.')
      setLoading(false)
      return
    }

    setPartnerProfile(partnerProfileResult.data)
    setPartnerWorkouts(partnerWorkoutsResult.data || [])
    setYourWorkouts(yourWorkoutsResult.data || [])
    setSharedGoals(sharedGoalsResult.data || [])
    setPartnerFoodEntries(partnerFoodResult.data || [])
    setNudges(nudgesResult.data || [])

    const unreadIncomingNudges = (nudgesResult.data || [])
      .filter(nudge => nudge.recipient_id === user.id && nudge.read_at === null)
      .map(nudge => nudge.id)

    if (unreadIncomingNudges.length > 0) {
      const { error: markReadError } = await supabase
        .from('nudges')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIncomingNudges)

      if (markReadError) {
        console.error('Failed to mark nudges as read', markReadError)
      } else {
        setNudges(prev =>
          prev.map(nudge =>
            unreadIncomingNudges.includes(nudge.id)
              ? { ...nudge, read_at: new Date().toISOString() }
              : nudge
          )
        )
      }
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      const timeoutId = window.setTimeout(() => {
        void loadPartnerState()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [authLoading, loadPartnerState])

  return (
    <>
      <style>{`
        .partner-wrapper {
          padding: 32px;
          max-width: 1024px;
          margin: 0 auto;
        }
        .partner-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        .partner-charts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .partner-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 24px;
        }
        .invite-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        @media (max-width: 1023px) {
          .partner-wrapper {
            padding: 72px 16px 24px;
          }
          .partner-header {
            flex-direction: column;
            gap: 16px;
            margin-bottom: 20px;
          }
          .partner-charts {
            grid-template-columns: 1fr;
          }
          .partner-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .invite-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="partner-wrapper">
        <div className="partner-header">
          <div>
            <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Partner View</h1>
            <p style={{ color: '#A0A0A0' }} className="mt-1">Stay connected with your partner&apos;s fitness journey</p>
          </div>
          {activePartnership && partnerProfile && partnerId && user ? (
            <NudgeButton
              partnerName={partnerFirstName}
              senderId={user.id}
              recipientId={partnerId}
              onSent={loadPartnerState}
            />
          ) : null}
        </div>

        {errorMessage && (
          <div style={{ marginBottom: 24, borderRadius: 12, padding: 14, backgroundColor: 'rgba(232,0,45,0.12)', border: '0.5px solid rgba(232,0,45,0.4)', color: '#fff', fontSize: 13 }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ marginBottom: 24, borderRadius: 12, padding: 14, backgroundColor: 'rgba(34,197,94,0.12)', border: '0.5px solid rgba(34,197,94,0.35)', color: '#fff', fontSize: 13 }}>
            {successMessage}
          </div>
        )}

        {loading ? (
          <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <p style={{ color: '#A0A0A0', fontSize: 14 }}>Loading partner details...</p>
          </div>
        ) : !activePartnership ? (
          <>
            <div className="invite-grid">
              <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(232,0,45,0.12)', color: '#E8002D' }}>
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Invite Your Partner</h2>
                    <p style={{ color: '#A0A0A0', fontSize: 13 }}>Send an email invite to connect your accounts</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#A0A0A0' }}>Partner Email</label>
                    <input
                      type="email"
                      placeholder="partner@example.com"
                      value={inviteEmail}
                      onChange={event => setInviteEmail(event.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => void sendInvite()}
                    disabled={submittingInvite}
                    style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {submittingInvite ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </div>

              <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff' }}>
                    <Users size={20} />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">No Partner Yet</h2>
                    <p style={{ color: '#A0A0A0', fontSize: 13 }}>Connect accounts to unlock nudges and comparisons</p>
                  </div>
                </div>
                <ul style={{ color: '#A0A0A0', fontSize: 14, lineHeight: 1.8, paddingLeft: 18 }}>
                  <li>View each other’s workouts and food logs</li>
                  <li>Share accountability goals</li>
                  <li>Send motivational nudges</li>
                </ul>
              </div>
            </div>

            <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-5">
                <Mail size={18} style={{ color: '#E8002D' }} />
                <h2 className="text-white font-bold text-lg">Pending Invitations</h2>
              </div>

              {inviteCards.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>No pending invites yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {inviteCards.map(invite => (
                    <div key={invite.id} style={{ padding: 16, borderRadius: 12, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {invite.direction === 'incoming' ? 'Incoming invite' : 'Invite sent'}
                          </p>
                          <p style={{ color: '#A0A0A0', fontSize: 13, marginTop: 4 }}>
                            {invite.direction === 'incoming'
                              ? `Sent to ${currentUserProfile?.email}`
                              : `Waiting for ${invite.recipient_email}`}
                          </p>
                          <p style={{ color: '#606060', fontSize: 12, marginTop: 6 }}>
                            {formatDateTime(invite.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-8">
                          {invite.direction === 'incoming' ? (
                            <>
                              <button
                                onClick={() => void acceptInvite(invite)}
                                disabled={workingInviteId === invite.id}
                                style={{ backgroundColor: '#E8002D', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                {workingInviteId === invite.id ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                onClick={() => void updateInviteStatus(invite.id, 'declined')}
                                disabled={workingInviteId === invite.id}
                                style={{ backgroundColor: '#2A2A2A', color: '#A0A0A0', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                Decline
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => void updateInviteStatus(invite.id, 'revoked')}
                              disabled={workingInviteId === invite.id}
                              style={{ backgroundColor: '#2A2A2A', color: '#A0A0A0', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              {workingInviteId === invite.id ? 'Canceling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 32, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white flex-shrink-0" style={{ backgroundColor: '#E8002D' }}>
                  {partnerInitials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>{partnerProfile?.display_name}</h2>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4ade80' }} />
                      <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>
                        {partnerWeeklyWorkouts > 0 ? 'Active this week' : 'Connected'}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: '#A0A0A0', fontSize: 14 }}>Last workout: {partnerLastWorkout}</p>
                </div>
              </div>

              <div className="partner-stats">
                {[
                  { label: 'This Week', value: partnerWeeklyWorkouts, icon: <Dumbbell size={16} />, unit: 'workouts' },
                  { label: "Today’s Intake", value: partnerTodayCalories.toLocaleString(), icon: <Flame size={16} />, unit: 'kcal' },
                  { label: 'Shared Goals', value: sharedGoals.length, icon: <Trophy size={16} />, unit: 'goals' },
                ].map(item => (
                  <div key={item.label} style={{ borderRadius: 10, padding: 16, textAlign: 'center', backgroundColor: '#252525' }}>
                    <div className="flex justify-center mb-2" style={{ color: '#E8002D' }}>{item.icon}</div>
                    <p className="text-white font-black text-2xl">{item.value}</p>
                    <p className="text-xs" style={{ color: '#A0A0A0' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="partner-charts">
              <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-white font-bold text-lg mb-1">{partnerFirstName}&apos;s Weekly Workout Minutes</h2>
                <p className="text-sm mb-5" style={{ color: '#A0A0A0' }}>Real workout minutes saved this week</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={partnerWorkoutHistory}>
                    <XAxis dataKey="date" tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#A0A0A0', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="minutes" fill="#E8002D" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-white font-bold text-lg mb-5">Head-to-Head</h2>
                <div className="space-y-5">
                  {comparisonItems.map(item => {
                    const total = Math.max(item.you + item.partner, 1)
                    const youPct = Math.round((item.you / total) * 100)
                    const partnerPct = 100 - youPct
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-2 text-sm">
                          <span style={{ color: '#A0A0A0' }}>You: <span className="text-white font-bold">{item.you}{item.unit && ` ${item.unit}`}</span></span>
                          <span className="text-white font-semibold">{item.label}</span>
                          <span style={{ color: '#A0A0A0' }}>Partner: <span style={{ color: '#E8002D', fontWeight: 700 }}>{item.partner}{item.unit && ` ${item.unit}`}</span></span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                          <div style={{ width: `${youPct}%`, backgroundColor: '#ffffff', borderRadius: '4px 0 0 4px' }} />
                          <div style={{ width: `${partnerPct}%`, backgroundColor: '#E8002D', borderRadius: '0 4px 4px 0' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-5">
                <Target size={18} style={{ color: '#E8002D' }} />
                <h2 className="text-white font-bold text-lg">Shared Goals</h2>
              </div>

              {sharedGoals.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>Shared goals will appear here once you or your partner mark a goal as shared.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sharedGoals.map(goal => {
                    const pct = Math.min(100, Math.round((goal.current_value / Math.max(goal.target_value, 1)) * 100))
                    return (
                      <div key={goal.id} className="p-4 rounded-xl" style={{ backgroundColor: '#252525' }}>
                        <div className="flex justify-between mb-2">
                          <p className="text-white font-semibold text-sm">{goal.title}</p>
                          <span className="text-sm font-bold" style={{ color: '#E8002D' }}>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#2A2A2A' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: '#E8002D' }} />
                        </div>
                        <p className="text-xs mt-2" style={{ color: '#A0A0A0' }}>
                          {goal.current_value} / {goal.target_value} {goal.unit}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-5">
                <Clock size={18} style={{ color: '#E8002D' }} />
                <h2 className="text-white font-bold text-lg">Partner Activity</h2>
              </div>

              {partnerActivity.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>As your partner logs workouts, food, goals, and nudges, their activity will show up here.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {partnerActivity.map(item => (
                    <div key={item.id} style={{ padding: 16, borderRadius: 12, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="flex items-center gap-8" style={{ marginBottom: 6 }}>
                            <p className="text-white font-semibold text-sm">{item.title}</p>
                            <span style={{ color: '#E8002D', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {item.badge}
                            </span>
                          </div>
                          <p style={{ color: '#A0A0A0', fontSize: 14, lineHeight: 1.45 }}>{item.description}</p>
                        </div>
                        <span style={{ color: '#606060', fontSize: 12, flexShrink: 0 }}>{formatActivityTime(item.occurredAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-5">
                <UtensilsCrossed size={18} style={{ color: '#E8002D' }} />
                <h2 className="text-white font-bold text-lg">Recent Partner Nutrition</h2>
              </div>

              {partnerFoodEntries.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>No partner food entries yet this week.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {partnerFoodEntries.slice(0, 5).map(entry => (
                    <div key={entry.id} style={{ padding: 16, borderRadius: 12, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-white font-semibold text-sm">{entry.food_name}</p>
                          <p style={{ color: '#A0A0A0', fontSize: 13, marginTop: 4 }}>
                            {capitalizeMeal(entry.meal_type)} · {entry.serving_amount} {entry.serving_unit}
                          </p>
                          <p style={{ color: '#606060', fontSize: 12, marginTop: 6 }}>{formatDateTime(entry.created_at)}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ color: '#E8002D', fontWeight: 700, fontSize: 14 }}>{entry.calories} kcal</p>
                          <p style={{ color: '#A0A0A0', fontSize: 12, marginTop: 4 }}>
                            P {Number(entry.protein).toFixed(0)} · C {Number(entry.carbs).toFixed(0)} · F {Number(entry.fat).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, borderRadius: 16, padding: 24, backgroundColor: '#1E1E1E', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-5">
                <Bell size={18} style={{ color: '#E8002D' }} />
                <h2 className="text-white font-bold text-lg">Recent Nudges</h2>
              </div>

              {nudges.length === 0 ? (
                <p style={{ color: '#A0A0A0', fontSize: 14 }}>No nudges yet. Send one to motivate your partner.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {nudges.map(nudge => {
                    const sentByYou = nudge.sender_id === user?.id
                    return (
                      <div key={nudge.id} style={{ padding: 16, borderRadius: 12, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {sentByYou ? 'You nudged your partner' : `${partnerFirstName} nudged you`}
                            </p>
                            <p style={{ color: '#A0A0A0', fontSize: 14, marginTop: 6 }}>
                              {nudge.message}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ color: '#606060', fontSize: 12 }}>{formatDateTime(nudge.created_at)}</p>
                            <p style={{ color: sentByYou ? '#E8002D' : '#4ade80', fontSize: 12, marginTop: 6 }}>
                              {sentByYou ? 'Sent' : nudge.read_at ? 'Seen' : 'New'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function countWorkoutsThisWeek(workouts: WorkoutRow[]) {
  const start = startOfWeek()
  return workouts.filter(workout => new Date(workout.workout_date) >= start).length
}

function sumWorkoutMinutes(workouts: WorkoutRow[]) {
  return workouts
    .filter(workout => new Date(workout.workout_date) >= startOfWeek())
    .reduce((sum, workout) => sum + workout.duration_minutes, 0)
}

function startOfWeek() {
  const now = new Date()
  const date = new Date(now)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + diff)
  return date
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function buildWeeklyWorkoutHistory(workouts: WorkoutRow[]) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const monday = startOfWeek()

  return labels.map((label, index) => {
    const currentDay = new Date(monday)
    currentDay.setDate(monday.getDate() + index)
    const currentDateString = currentDay.toISOString().slice(0, 10)

    return {
      date: label,
      minutes: workouts
        .filter(workout => workout.workout_date === currentDateString)
        .reduce((sum, workout) => sum + workout.duration_minutes, 0),
    }
  })
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getPartnershipErrorMessage(message: string | undefined, fallback: string) {
  const normalizedMessage = message?.toLowerCase() || ''

  if (normalizedMessage.includes('each user can only have one active partner')) {
    return 'Each person can only have one active partner.'
  }

  if (normalizedMessage.includes('you already have an active partner')) {
    return 'You already have an active partner.'
  }

  if (normalizedMessage.includes('that person already has an active partner')) {
    return 'That person already has an active partner.'
  }

  return fallback
}

function buildPartnerActivityFeed({
  partnerFirstName,
  partnerWorkouts,
  partnerFoodEntries,
  sharedGoals,
  nudges,
  userId,
}: {
  partnerFirstName: string
  partnerWorkouts: WorkoutRow[]
  partnerFoodEntries: FoodEntryRow[]
  sharedGoals: GoalRow[]
  nudges: NudgeRow[]
  userId: string | null
}) {
  const items: PartnerActivityItem[] = []

  partnerWorkouts.slice(0, 4).forEach(workout => {
    items.push({
      id: `workout-${workout.id}`,
      title: `${partnerFirstName} logged a workout`,
      description: `"${workout.title}" for ${workout.duration_minutes} minutes on ${formatWorkoutDate(workout.workout_date)}.`,
      occurredAt: `${workout.workout_date}T12:00:00`,
      badge: 'workout',
    })
  })

  partnerFoodEntries.slice(0, 4).forEach(entry => {
    items.push({
      id: `food-${entry.id}`,
      title: `${partnerFirstName} logged food`,
      description: `${entry.food_name} in ${capitalizeMeal(entry.meal_type)} for ${entry.calories} kcal.`,
      occurredAt: entry.created_at,
      badge: 'nutrition',
    })
  })

  sharedGoals
    .filter(goal => goal.owner_user_id !== userId)
    .slice(0, 3)
    .forEach(goal => {
      items.push({
        id: `goal-${goal.id}`,
        title: `${partnerFirstName} shared a goal`,
        description: `"${goal.title}" is at ${goal.current_value}/${goal.target_value} ${goal.unit}.`,
        occurredAt: goal.updated_at ?? goal.created_at,
        badge: 'goal',
      })
    })

  nudges.slice(0, 4).forEach(nudge => {
    const sentByPartner = nudge.sender_id !== userId
    items.push({
      id: `nudge-${nudge.id}`,
      title: sentByPartner ? `${partnerFirstName} sent you a nudge` : `You nudged ${partnerFirstName}`,
      description: nudge.message,
      occurredAt: nudge.created_at,
      badge: 'nudge',
    })
  })

  return items
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 10)
}

function formatActivityTime(value: string) {
  const date = new Date(value)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatWorkoutDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

function capitalizeMeal(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
