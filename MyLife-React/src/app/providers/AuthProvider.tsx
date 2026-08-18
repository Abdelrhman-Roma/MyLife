import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { auth, authReady } from '../../services/firebase/auth'
import { AppLoading } from '../../components/feedback/AppLoading'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    void authReady.then(() => {
      if (cancelled) return
      unsubscribe = auth.onAuthStateChanged((authUser) => {
        setUser(authUser)
        setLoading(false)
      })
    }).catch(() => setLoading(false))

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { signInWithEmail } = await import('../../services/firebase/auth')
    await signInWithEmail(email, password)
  }

  const signOut = async () => {
    const { signOutUser } = await import('../../services/firebase/auth')
    await signOutUser()
  }

  const signUp = async (email: string, password: string) => {
    const { registerUser } = await import('../../services/firebase/auth')
    await registerUser(email, password)
  }

  const resetPassword = async (email: string) => {
    const { sendPasswordReset } = await import('../../services/firebase/auth')
    await sendPasswordReset(email)
  }

  if (loading) {
    return <AppLoading />
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        signIn,
        signOut,
        signUp,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
