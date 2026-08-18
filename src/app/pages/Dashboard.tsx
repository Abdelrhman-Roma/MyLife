import { Download, RefreshCw } from 'lucide-react'
import { useAuth } from '../providers/AuthProvider'
import { AppShell } from '../components/layout/AppShell'
import { DashboardOverview } from '../../features/dashboard/components/DashboardOverview'
import { DashboardGrid } from '../../features/dashboard/components/DashboardGrid'
import { useDashboardData } from '../../features/dashboard/hooks/useDashboardData'
import { useDashboardLayout } from '../../features/dashboard/hooks/useDashboardLayout'
import '../../styles/dashboard.css'

export default function Dashboard() {
  const { user } = useAuth()
  if (!user) return null
  const dashboard = useDashboardData(user.uid)
  const dashboardLayout = useDashboardLayout(user.uid)

  function exportDashboard() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile: dashboard.profile, collections: dashboard.collections, layout: dashboardLayout.layout }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mylife-dashboard-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <div className="dashboard-page">
        <header className="dashboard-page-header"><div><p className="eyebrow">Mission Control</p><h1>Dashboard</h1></div><div className="dashboard-page-actions"><button className="secondary-btn" onClick={() => window.location.reload()}><RefreshCw size={17} />Refresh</button><button className="secondary-btn" onClick={exportDashboard}><Download size={17} />Export</button></div></header>
        {(dashboard.error || dashboardLayout.error) && <div className="dashboard-error" role="alert">{dashboard.error || dashboardLayout.error}</div>}
        {(dashboard.loading || dashboardLayout.loading) ? <div className="dashboard-skeleton" aria-label="Loading dashboard"><span /><span /><span /></div> : <><DashboardOverview data={dashboard.collections} profile={dashboard.profile} name={user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'there'} /><DashboardGrid uid={user.uid} data={dashboard.collections} profile={dashboard.profile} layout={dashboardLayout.layout} onChange={dashboardLayout.setLayout} /></>}
      </div>
    </AppShell>
  )
}
