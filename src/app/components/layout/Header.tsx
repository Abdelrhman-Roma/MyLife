import { useState } from 'react'
import { Bell, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../providers/AuthProvider'
import type { Theme } from '../../providers/ThemeProvider'

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onLogout: () => Promise<void>
  currentTheme: Theme
  onThemeChange: (theme: Theme) => void
}

export function Header({
  sidebarOpen,
  onToggleSidebar,
  onLogout,
  currentTheme,
  onThemeChange
}: HeaderProps) {
  const { user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle navigation" aria-expanded={sidebarOpen}>
          <Menu size={20} />
        </button>
      </div>

      <div className="app-header-center">
        <p className="eyebrow">Momentum</p><h1>Mission Control</h1>
      </div>

      <div className="app-header-right">
        <div className="theme-selector">
          <select
            value={currentTheme}
            onChange={(e) => onThemeChange(e.target.value as Theme)}
            className="theme-select"
          >
            <option value="light">☀️ Light</option>
            <option value="dark">🌙 Dark</option>
            <option value="system">🖥️ System</option>
            <option value="earth">Earth</option>
            <option value="mars">Mars</option>
            <option value="saturn">Saturn</option>
            <option value="neptune">Neptune</option>
            <option value="nebula">Nebula</option>
            <option value="galaxy">Galaxy</option>
          </select>
        </div>
        <select className="language-select" aria-label="Language" defaultValue="en" onChange={(event) => { const language = event.target.value; document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; localStorage.setItem('mylife-language', language) }}><option value="en">EN</option><option value="ar">AR</option></select>
        <button className="icon-btn" aria-label="Notifications"><Bell size={18} /></button>

        <div className="user-menu">
          <span className="user-email">{user?.email}</span>
          <button
            className="logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={17} />{isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </header>
  )
}
