import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
}

interface AuthContextValue extends AuthState {
  loading: boolean
  setAuth: (auth: AuthState) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hydrate = () => {
      try {
        const token = localStorage.getItem('authToken')
        const userStr = localStorage.getItem('currentUser')
        const user = userStr ? (JSON.parse(userStr) as User) : null

        setState({ user, token })
      } catch {
        setState({ user: null, token: null })
      } finally {
        setLoading(false)
      }
    }

    hydrate()

    const onStorage = (e: StorageEvent) => {
      if (!e.key || ['authToken', 'currentUser'].includes(e.key)) {
        hydrate()
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    loading,
    setAuth: setState,
    signOut: () => setState({ user: null, token: null }),
  }), [state, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
