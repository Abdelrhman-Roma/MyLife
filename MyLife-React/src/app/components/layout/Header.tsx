import { useAuth } from '../../providers/AuthProvider'

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onLogout: () => Promise<void>
  currentTheme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
}

export function Header({
  onToggleSidebar,
  onLogout,
  currentTheme,
  onThemeChange
}: HeaderProps) {
  const { user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar}>
          ☰
        </button>
      </div>

      <div className="app-header-center">
        <h1>MyLife - Momentum</h1>
      </div>

      <div className="app-header-right">
        <div className="theme-selector">
          <select
            value={currentTheme}
            onChange={(e) => onThemeChange(e.target.value as 'light' | 'dark' | 'system')}
            className="theme-select"
          >
            <option value="light">☀️ Light</option>
            <option value="dark">🌙 Dark</option>
            <option value="system">🖥️ System</option>
          </select>
        </div>

        <div className="user-menu">
          <span className="user-email">{user?.email}</span>
          <button
            className="logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </header>
  )
}

import React from 'react'
