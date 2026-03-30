'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { ProfileRow } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: ProfileRow | null
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)

  const loadProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile', error)
      setProfile(null)
      return
    }

    setProfile(data)
  }, [])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      setSession(initialSession)
      await loadProfile(initialSession?.user ?? null)

      if (isMounted) {
        setLoading(false)
      }
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession)
      void loadProfile(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    profile,
    refreshProfile: async () => loadProfile(session?.user ?? null),
    signOut: async () => {
      await supabase.auth.signOut()
      setProfile(null)
    },
  }), [loadProfile, loading, profile, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
