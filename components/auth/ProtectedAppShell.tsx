'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import Sidebar from '@/components/Sidebar'

export default function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { loading, user } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth')
    }
  }, [loading, router, user])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#141414', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, margin: '0 auto 16px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#E8002D', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ color: '#A0A0A0', fontSize: 14 }}>Checking your session...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#141414' }}>
      <Sidebar />
      <main className="app-main" style={{ flex: 1, minHeight: '100vh', backgroundColor: '#141414' }}>
        {children}
      </main>
      <style>{`
        .app-main { margin-left: 256px; }
        @media (max-width: 1023px) { .app-main { margin-left: 0; } }
      `}</style>
    </div>
  )
}
