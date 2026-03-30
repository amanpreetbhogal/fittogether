'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate auth - replace with Supabase auth
    setTimeout(() => {
      setLoading(false)
      router.push('/dashboard')
    }, 1000)
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
      <div className="flex-1 flex items-center justify-center" style={{ padding: 32 }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8002D' }}>
              <span className="text-white font-black text-sm">FT</span>
            </div>
            <span className="text-white font-bold text-lg">FitTogether</span>
          </div>

          <h2 className="text-3xl font-black text-white mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mb-8" style={{ color: '#A0A0A0' }}>
            {mode === 'login' ? "Sign in to your account" : "Start your journey with your partner"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <User size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    backgroundColor: '#1E1E1E',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '14px 14px 14px 40px',
                    width: '100%',
                    outline: 'none',
                    fontSize: '15px',
                  }}
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  backgroundColor: '#1E1E1E',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '14px 14px 14px 40px',
                  width: '100%',
                  outline: 'none',
                  fontSize: '15px',
                }}
                required
              />
            </div>

            <div className="relative">
              <Lock size={16} style={{ color: '#A0A0A0', position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  backgroundColor: '#1E1E1E',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '14px 40px 14px 40px',
                  width: '100%',
                  outline: 'none',
                  fontSize: '15px',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer' }}
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
                borderRadius: '10px',
                padding: '14px',
                width: '100%',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '8px',
              }}
            >
              {loading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div style={{ flex: 1, height: 1, backgroundColor: '#2A2A2A' }} />
            <span className="text-sm" style={{ color: '#A0A0A0' }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#2A2A2A' }} />
          </div>

          <div className="mt-4 space-y-3">
            {['Continue with Google', 'Continue with Apple'].map((label) => (
              <button
                key={label}
                style={{
                  backgroundColor: '#1E1E1E',
                  color: '#ffffff',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '13px',
                  width: '100%',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-sm" style={{ color: '#A0A0A0' }}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              style={{ color: '#E8002D', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
