'use client'

import { useState, type CSSProperties } from 'react'
import { KeyRound, Save, Settings, UserCircle2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const profileFormKey = `${profile?.id ?? 'guest'}:${profile?.updated_at ?? 'initial'}`

  return (
    <>
      <style>{`
        .settings-wrapper {
          padding: 32px;
          max-width: 960px;
          margin: 0 auto;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        .settings-card {
          border-radius: 18px;
          padding: 24px;
          background-color: #1E1E1E;
          border: 0.5px solid rgba(255,255,255,0.08);
        }
        .settings-field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 1023px) {
          .settings-wrapper { padding: 72px 16px 24px; }
          .settings-field-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="settings-wrapper">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>
            Settings
          </h1>
          <p style={{ color: '#A0A0A0', marginTop: 4 }}>
            Manage your profile, preferences, and account security.
          </p>
        </div>

        {(errorMessage || successMessage) && (
          <div
            style={{
              marginBottom: 20,
              borderRadius: 12,
              padding: 14,
              backgroundColor: errorMessage ? 'rgba(232,0,45,0.12)' : 'rgba(74,222,128,0.12)',
              border: errorMessage ? '0.5px solid rgba(232,0,45,0.4)' : '0.5px solid rgba(74,222,128,0.35)',
              color: '#fff',
              fontSize: 13,
            }}
          >
            {errorMessage ?? successMessage}
          </div>
        )}

        <div className="settings-grid">
          <ProfileSection
            key={profileFormKey}
            loading={loading}
            email={user?.email ?? ''}
            initialDisplayName={profile?.display_name ?? ''}
            initialAvatarUrl={profile?.avatar_url ?? ''}
            userId={user?.id ?? null}
            onError={setErrorMessage}
            onSuccess={setSuccessMessage}
            refreshProfile={refreshProfile}
          />

          <PreferencesSection
            key={profileFormKey}
            userId={user?.id ?? null}
            initialDefaultWeightUnit={profile?.preferred_weight_unit === 'kg' ? 'kg' : 'lbs'}
            initialDailyCalorieGoal={profile?.daily_calorie_goal ?? 2000}
            onError={setErrorMessage}
            onSuccess={setSuccessMessage}
            refreshProfile={refreshProfile}
          />

          <SecuritySection
            onError={setErrorMessage}
            onSuccess={setSuccessMessage}
          />
        </div>
      </div>
    </>
  )
}

function ProfileSection({
  loading,
  email,
  initialDisplayName,
  initialAvatarUrl,
  userId,
  onError,
  onSuccess,
  refreshProfile,
}: {
  loading: boolean
  email: string
  initialDisplayName: string
  initialAvatarUrl: string
  userId: string | null
  onError: (message: string | null) => void
  onSuccess: (message: string | null) => void
  refreshProfile: () => Promise<void>
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [savingProfile, setSavingProfile] = useState(false)

  const saveProfile = async () => {
    if (!userId) {
      return
    }

    const trimmedName = displayName.trim()

    if (!trimmedName) {
      onError('Display name cannot be empty.')
      onSuccess(null)
      return
    }

    setSavingProfile(true)
    onError(null)
    onSuccess(null)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: trimmedName,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Failed to update profile', profileError)
      onError('Could not update your profile right now.')
      setSavingProfile(false)
      return
    }

    const { error: userError } = await supabase.auth.updateUser({
      data: {
        display_name: trimmedName,
      },
    })

    if (userError) {
      console.error('Failed to update auth metadata', userError)
    }

    await refreshProfile()
    setSavingProfile(false)
    onSuccess('Profile updated.')
  }

  return (
    <section className="settings-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <UserCircle2 size={20} style={{ color: '#E8002D' }} />
        <div>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Profile</h2>
          <p style={{ color: '#A0A0A0', fontSize: 13 }}>Update the information your partner sees.</p>
        </div>
      </div>

      <div className="settings-field-grid" style={{ marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Display Name</label>
          <input
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
            style={inputStyle}
            placeholder="Your name"
            disabled={loading}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            value={email}
            style={{ ...inputStyle, color: '#7A7A7A' }}
            disabled
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Avatar URL</label>
        <input
          value={avatarUrl}
          onChange={event => setAvatarUrl(event.target.value)}
          style={inputStyle}
          placeholder="https://..."
          disabled={loading}
        />
      </div>

      <button
        onClick={() => void saveProfile()}
        disabled={savingProfile || loading}
        style={primaryButtonStyle(savingProfile || loading)}
      >
        <Save size={15} />
        {savingProfile ? 'Saving Profile...' : 'Save Profile'}
      </button>
    </section>
  )
}

function PreferencesSection({
  userId,
  initialDefaultWeightUnit,
  initialDailyCalorieGoal,
  onError,
  onSuccess,
  refreshProfile,
}: {
  userId: string | null
  initialDefaultWeightUnit: 'lbs' | 'kg'
  initialDailyCalorieGoal: number
  onError: (message: string | null) => void
  onSuccess: (message: string | null) => void
  refreshProfile: () => Promise<void>
}) {
  const [defaultWeightUnit, setDefaultWeightUnit] = useState<'lbs' | 'kg'>(initialDefaultWeightUnit)
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(String(initialDailyCalorieGoal))
  const [savingPreferences, setSavingPreferences] = useState(false)

  const savePreferences = async () => {
    if (!userId) {
      return
    }

    const parsedCalories = Number.parseInt(dailyCalorieGoal, 10)

    if (!Number.isFinite(parsedCalories) || parsedCalories <= 0) {
      onError('Daily calorie goal must be a positive number.')
      onSuccess(null)
      return
    }

    setSavingPreferences(true)
    onError(null)
    onSuccess(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        preferred_weight_unit: defaultWeightUnit,
        daily_calorie_goal: parsedCalories,
      })
      .eq('id', userId)

    if (error) {
      console.error('Failed to update preferences', error)
      onError('Could not save your preferences right now.')
      setSavingPreferences(false)
      return
    }

    await refreshProfile()
    setSavingPreferences(false)
    onSuccess('Preferences saved.')
  }

  return (
    <section className="settings-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Settings size={20} style={{ color: '#E8002D' }} />
        <div>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Preferences</h2>
          <p style={{ color: '#A0A0A0', fontSize: 13 }}>These preferences are saved to your account.</p>
        </div>
      </div>

      <div className="settings-field-grid" style={{ marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Default Weight Unit</label>
          <select
            value={defaultWeightUnit}
            onChange={event => setDefaultWeightUnit(event.target.value as 'lbs' | 'kg')}
            style={inputStyle}
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Daily Calorie Goal</label>
          <input
            value={dailyCalorieGoal}
            onChange={event => setDailyCalorieGoal(event.target.value)}
            style={inputStyle}
            type="number"
            min="1"
          />
        </div>
      </div>

      <button
        onClick={() => void savePreferences()}
        disabled={savingPreferences}
        style={primaryButtonStyle(savingPreferences)}
      >
        <Save size={15} />
        {savingPreferences ? 'Saving Preferences...' : 'Save Preferences'}
      </button>
    </section>
  )
}

function SecuritySection({
  onError,
  onSuccess,
}: {
  onError: (message: string | null) => void
  onSuccess: (message: string | null) => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const changePassword = async () => {
    if (!newPassword || !confirmPassword) {
      onError('Enter your new password in both fields.')
      onSuccess(null)
      return
    }

    if (newPassword.length < 6) {
      onError('Password must be at least 6 characters long.')
      onSuccess(null)
      return
    }

    if (newPassword !== confirmPassword) {
      onError('Passwords do not match.')
      onSuccess(null)
      return
    }

    setSavingPassword(true)
    onError(null)
    onSuccess(null)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      console.error('Failed to update password', error)
      onError('Could not update your password right now.')
      setSavingPassword(false)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setSavingPassword(false)
    onSuccess('Password updated successfully.')
  }

  return (
    <section className="settings-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <KeyRound size={20} style={{ color: '#E8002D' }} />
        <div>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Security</h2>
          <p style={{ color: '#A0A0A0', fontSize: 13 }}>Change your password for this account.</p>
        </div>
      </div>

      <div className="settings-field-grid" style={{ marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            style={inputStyle}
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label style={labelStyle}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            style={inputStyle}
            placeholder="Repeat your password"
          />
        </div>
      </div>

      <button
        onClick={() => void changePassword()}
        disabled={savingPassword}
        style={primaryButtonStyle(savingPassword)}
      >
        <KeyRound size={15} />
        {savingPassword ? 'Updating Password...' : 'Update Password'}
      </button>
    </section>
  )
}

const labelStyle: CSSProperties = {
  display: 'block',
  color: '#A0A0A0',
  fontSize: 12,
  marginBottom: 8,
}

const inputStyle: CSSProperties = {
  backgroundColor: '#252525',
  border: '0.5px solid rgba(255,255,255,0.08)',
  color: '#fff',
  borderRadius: 10,
  padding: '12px 14px',
  width: '100%',
  outline: 'none',
  fontSize: 14,
  fontFamily: 'inherit',
}

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8002D',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    opacity: disabled ? 0.7 : 1,
  }
}
