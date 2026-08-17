import { useAuth } from '../providers/AuthProvider'
import { AppShell } from '../components/layout/AppShell'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <AppShell>
      <div className="dashboard-content">
        <h1>Welcome, {user?.displayName || user?.email}</h1>
        <p>Dashboard placeholder for Phase 2</p>
      </div>
    </AppShell>
  )
}
