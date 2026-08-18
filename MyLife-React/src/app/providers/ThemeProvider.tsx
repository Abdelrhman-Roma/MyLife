import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system' | 'earth' | 'mars' | 'saturn' | 'neptune' | 'nebula' | 'galaxy'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: Exclude<Theme, 'system'>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const THEME_STORAGE_KEY = 'mylife-theme-preference'

function getResolvedTheme(theme: Theme): Exclude<Theme, 'system'> {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    return stored || 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<Exclude<Theme, 'system'>>(
    getResolvedTheme(theme)
  )

  useEffect(() => {
    const resolved = getResolvedTheme(theme)
    setResolvedTheme(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.dir = document.documentElement.lang === 'ar' ? 'rtl' : 'ltr'
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const resolved = getResolvedTheme('system')
      setResolvedTheme(resolved)
      document.documentElement.setAttribute('data-theme', resolved)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
