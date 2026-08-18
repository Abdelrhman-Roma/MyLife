import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, CheckSquare2, Dumbbell, Goal, LayoutDashboard, MoonStar, Settings, Sparkles, Utensils, Waves } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const items = [
    ['/dashboard', 'Dashboard', LayoutDashboard], ['/todos', 'Todo', CheckSquare2], ['/habits', 'Habits', Sparkles], ['/goals', 'Goals', Goal], ['/calendar', 'Calendar', CalendarDays], ['/workout', 'Workout', Dumbbell], ['/prayer', 'Prayer', MoonStar], ['/nutrition', 'Nutrition', Utensils], ['/study', 'Study', Waves], ['/statistics', 'Statistics', BarChart3], ['/settings', 'Settings', Settings]
  ] as const
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <NavLink className="sidebar-brand" to="/dashboard"><span className="sidebar-brand-mark">M</span><span><strong>Momentum</strong><small>Life OS</small></span></NavLink>

      <nav className="sidebar-nav">
        <ul>{items.map(([to, label, Icon]) => <li key={to}><NavLink to={to} onClick={() => { if (window.matchMedia('(max-width: 860px)').matches) onToggle() }}><Icon size={18} /><span>{label}</span></NavLink></li>)}</ul>
      </nav>
    </aside>
  )
}
