'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Dumbbell, UtensilsCrossed, Target, Users, LogOut, Menu, X, Settings } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type PartnershipRow = Database['public']['Tables']['partnerships']['Row']

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workout', label: 'Workout', icon: Dumbbell },
  { href: '/food', label: 'Food Log', icon: UtensilsCrossed },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/partner', label: 'Partner', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { profile, user, signOut } = useAuth()
  const [partnerProfile, setPartnerProfile] = useState<ProfileRow | null>(null)

  const metadataDisplayName = typeof user?.user_metadata?.display_name === 'string'
    ? user.user_metadata.display_name
    : null
  const displayName = profile?.display_name ?? metadataDisplayName ?? 'FitTogether User'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'FT'
  const partnerDisplayName = partnerProfile?.display_name ?? 'No partner connected'
  const partnerInitials = partnerProfile
    ? partnerDisplayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'FT'
    : 'FT'

  useEffect(() => {
    const loadPartner = async () => {
      if (!user) {
        setPartnerProfile(null)
        return
      }

      const { data: partnerships, error: partnershipError } = await supabase
        .from('partnerships')
        .select('*')
        .eq('status', 'active')
        .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
        .limit(1)

      if (partnershipError || !partnerships?.length) {
        setPartnerProfile(null)
        return
      }

      const partnership = partnerships[0] as PartnershipRow
      const partnerId = partnership.user_one_id === user.id
        ? partnership.user_two_id
        : partnership.user_one_id

      const { data: nextPartnerProfile, error: partnerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle()

      if (partnerError) {
        setPartnerProfile(null)
        return
      }

      setPartnerProfile(nextPartnerProfile)
    }

    void loadPartner()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    setMobileOpen(false)
    router.replace('/auth')
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '32px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#E8002D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>FT</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>FitTogether</span>
        </div>
      </div>

      {/* Partner pill */}
      <div style={{ margin: '0 16px 24px', padding: 12, borderRadius: 10, backgroundColor: '#252525', border: '0.5px solid rgba(255,255,255,0.08)' }}>
        <p style={{ color: '#A0A0A0', fontSize: 11, marginBottom: 8 }}>
          {partnerProfile ? 'Connected with' : 'Partner status'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#E8002D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {partnerInitials}
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{partnerDisplayName}</p>
            <span style={{ color: '#A0A0A0', fontSize: 11 }}>
              {partnerProfile ? 'Partnership active' : 'Invite or connect on the Partner page'}
            </span>
          </div>
        </div>
        {!partnerProfile && (
          <Link
            href="/partner"
            onClick={() => setMobileOpen(false)}
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              color: '#E8002D',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Open partner setup
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 16px' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                borderRadius: 12,
                marginBottom: 4,
                backgroundColor: active ? 'rgba(232, 0, 45, 0.12)' : 'transparent',
                color: active ? '#E8002D' : '#A0A0A0',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              <Icon size={18} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
              {active && <div style={{ marginLeft: 'auto', width: 3, height: 16, borderRadius: 2, backgroundColor: '#E8002D' }} />}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div style={{ padding: 16, borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#E8002D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
            <p style={{ color: '#A0A0A0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? 'No email loaded'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, color: '#A0A0A0', fontSize: 13, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg-hidden-sidebar-btn"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 50,
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: '#1E1E1E',
          border: '0.5px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
        }}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>
      <style>{`
        @media (min-width: 1024px) { .lg-hidden-sidebar-btn { display: none !important; } }
      `}</style>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="sidebar-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 45,
          }}
        />
      )}

      {/* Desktop sidebar (always visible) */}
      <aside
        className="sidebar-desktop"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          width: 256,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          backgroundColor: '#1E1E1E',
          borderRight: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside
        className="sidebar-mobile"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          width: 280,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          backgroundColor: '#1E1E1E',
          borderRight: '0.5px solid rgba(255,255,255,0.08)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#252525',
            border: '0.5px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#A0A0A0',
          }}
        >
          <X size={16} />
        </button>
        {sidebarContent}
      </aside>

      <style>{`
        .sidebar-desktop { display: flex; }
        .sidebar-mobile { display: none; }
        .sidebar-backdrop { display: none; }
        @media (max-width: 1023px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: flex !important; }
          .sidebar-backdrop { display: block !important; }
        }
      `}</style>
    </>
  )
}
