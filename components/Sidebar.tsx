'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dumbbell, UtensilsCrossed, Target, Users, LogOut, Menu, X } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workout', label: 'Workout', icon: Dumbbell },
  { href: '/food', label: 'Food Log', icon: UtensilsCrossed },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/partner', label: 'Partner', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
        <p style={{ color: '#A0A0A0', fontSize: 11, marginBottom: 8 }}>Connected with</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#E8002D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            PK
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Priyana Kumar</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4ade80' }} />
              <span style={{ color: '#A0A0A0', fontSize: 11 }}>Active today</span>
            </div>
          </div>
        </div>
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
            AP
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Amanpreet</p>
            <p style={{ color: '#A0A0A0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>user@email.com</p>
          </div>
        </div>
        <Link
          href="/auth"
          onClick={() => setMobileOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, color: '#A0A0A0', fontSize: 13, textDecoration: 'none' }}
        >
          <LogOut size={15} />
          Sign out
        </Link>
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
