'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard')
    }
  }, [authLoading, router, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        router.push('/dashboard')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name.trim(),
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.session) {
        router.push('/dashboard')
        return
      }

      setSuccessMessage('Account created. Check your email to confirm your signup, then log in.')
      setMode('login')
      setPassword('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#141414', flexDirection: 'row' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between" style={{ width: '50%', padding: 64, backgroundColor: '#1E1E1E', borderRight: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-ds-md flex items-center justify-center" style={{ backgroundColor: '#E8002D' }}>
            <span className="text-white font-black text-base">FT</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">FitTogether</span>
        </div>

        <div>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Fitness is better<br />
            <span style={{ color: '#E8002D' }}>together.</span>
          </h1>
          <p className="text-lg" style={{ color: '#A0A0A0' }}>
            Log workouts, track nutrition, and stay accountable with your partner — no matter the distance.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { icon: '🏋️', text: 'Log and track every workout' },
              { icon: '🥗', text: 'Monitor nutrition and macros' },
              { icon: '🎯', text: 'Set and crush shared goals' },
              { icon: '⚡', text: 'Send nudges to your partner' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span style={{ color: '#A0A0A0' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm" style={{ color: '#A0A0A0' }}>
          &copy; 2026 FitTogether. Built for couples who grind together.
        </p>
      </div>

      {/* Right panel - form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8002D' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>FT</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>FitTogether</span>
          </div>

          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.5px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: '#A0A0A0', marginBottom: 36, fontSize: 15 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Start your journey with your partner'}
          </p>

          {errorMessage && (
            <div style={{ marginBottom: 20, backgroundColor: 'rgba(232,0,45,0.12)', border: '0.5px solid rgba(232,0,45,0.4)', color: '#ffffff', borderRadius: 10, padding: '12px 14px', fontSize: 13 }}>
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{ marginBottom: 20, backgroundColor: 'rgba(74,222,128,0.12)', border: '0.5px solid rgba(74,222,128,0.35)', color: '#ffffff', borderRadius: 10, padding: '12px 14px', fontSize: 13 }}>
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    backgroundColor: '#1E1E1E',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    borderRadius: 12,
                    padding: '16px 16px 16px 44px',
                    width: '100%',
                    outline: 'none',
                    fontSize: 15,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  backgroundColor: '#1E1E1E',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  borderRadius: 12,
                  padding: '16px 16px 16px 44px',
                  width: '100%',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  backgroundColor: '#1E1E1E',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  borderRadius: 12,
                  padding: '16px 44px 16px 44px',
                  width: '100%',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#E8002D',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '16px',
                width: '100%',
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: 6,
                fontFamily: 'inherit',
              }}
            >
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#2A2A2A' }} />
            <span style={{ color: '#A0A0A0', fontSize: 13 }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#2A2A2A' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {['Google and Apple login coming soon', 'Supabase email auth is active now'].map((label) => (
              <button
                key={label}
                type="button"
                disabled
                style={{
                  backgroundColor: '#1E1E1E',
                  color: '#606060',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: '14px',
                  width: '100%',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <p style={{ marginTop: 32, textAlign: 'center', fontSize: 14, color: '#A0A0A0' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              style={{ color: '#E8002D', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
