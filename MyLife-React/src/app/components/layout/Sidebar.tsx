interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-header">
        <h2>MyLife</h2>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <a href="#dashboard">Dashboard</a>
          </li>
          <li>
            <a href="#todos">Todos</a>
          </li>
          <li>
            <a href="#habits">Habits</a>
          </li>
          <li>
            <a href="#goals">Goals</a>
          </li>
          <li>
            <a href="#settings">Settings</a>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
