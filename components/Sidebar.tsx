'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dumbbell, UtensilsCrossed, Target, Users, LogOut } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workout', label: 'Workout', icon: Dumbbell },
  { href: '/food', label: 'Food Log', icon: UtensilsCrossed },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/partner', label: 'Partner', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: '256px', display: 'flex', flexDirection: 'column', zIndex: 40, backgroundColor: '#1E1E1E', borderRight: '1px solid #2A2A2A' }}>
      {/* Logo */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8002D' }}>
            <span className="text-white font-black text-sm">FT</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">FitTogether</span>
        </div>
      </div>

      {/* Partner pill */}
      <div className="mx-4 mb-6 p-3 rounded-xl" style={{ backgroundColor: '#252525', border: '1px solid #2A2A2A' }}>
        <p className="text-xs mb-2" style={{ color: '#A0A0A0' }}>Connected with</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#E8002D' }}>
            AR
          </div>
          <div>
            <p className="text-white text-sm font-medium">Alex Rivera</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
              <span className="text-xs" style={{ color: '#A0A0A0' }}>Active today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: active ? 'rgba(232, 0, 45, 0.12)' : 'transparent',
                color: active ? '#E8002D' : '#A0A0A0',
              }}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
              {active && <div className="ml-auto w-1 h-4 rounded-full" style={{ backgroundColor: '#E8002D' }}></div>}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="p-4 border-t" style={{ borderColor: '#2A2A2A' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: '#E8002D' }}>
            AP
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">Amanpreet</p>
            <p className="text-xs truncate" style={{ color: '#A0A0A0' }}>user@email.com</p>
          </div>
        </div>
        <Link
          href="/auth"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full"
          style={{ color: '#A0A0A0' }}
        >
          <LogOut size={15} />
          Sign out
        </Link>
      </div>
    </aside>
  )
}
