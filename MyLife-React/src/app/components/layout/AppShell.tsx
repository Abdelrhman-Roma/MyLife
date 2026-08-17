import { useState, ReactNode } from 'react'
import { useAuth } from '../../providers/AuthProvider'
import { useTheme } from '../../providers/ThemeProvider'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleLogout = async () => {
    await signOut()
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
  }

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onToggle={handleToggleSidebar} />

      <div className="app-shell-main">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
        />

        <main className="app-shell-content">
          {children}
        </main>
      </div>
    </div>
  )
}
