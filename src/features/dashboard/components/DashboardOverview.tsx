import { Link } from 'react-router-dom'
import { CalendarPlus, Dumbbell, Droplets, ListPlus, Repeat2 } from 'lucide-react'
import type { DashboardCollections, DashboardRecord } from '../types/dashboard'
import { isoDay, overviewCounts, recordNumber, recordText, todayIso } from '../services/dashboardService'
import { ProgressRing } from './ProgressRing'

const QUOTES = ['Small steps become strong systems.', 'Consistency compounds.', 'Protect your focus and your future follows.', 'Progress is built one deliberate day at a time.']

function percent(value: number, target: number) { return target > 0 ? Math.min(100, Math.round(value / target * 100)) : 0 }

export function DashboardOverview({ data, profile, name }: { data: DashboardCollections; profile: DashboardRecord | null; name: string }) {
  const counts = overviewCounts(data)
  const xp = recordNumber(profile ?? { id: '' }, 'xp', 'totalXp')
  const level = Math.floor(xp / 500) + 1
  const levelProgress = Math.round((xp % 500) / 500 * 100)
  const productivity = Math.round((percent(counts.completedTasks, counts.tasks) + percent(counts.completedHabits, counts.habits) + percent(counts.completedGoals, counts.goals)) / 3)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const today = todayIso()
  const upcoming = data.events.filter((item) => isoDay(item.date ?? item.startsAt) >= today).sort((a, b) => isoDay(a.date ?? a.startsAt).localeCompare(isoDay(b.date ?? b.startsAt))).slice(0, 4)
  const activity = [...data.tasks, ...data.habits, ...data.goals, ...data.workouts].filter((item) => item.updatedAt || item.completedAt || item.createdAt).slice(-5).reverse()

  const cards = [
    ['Tasks', counts.completedTasks, counts.tasks, '/todos', 'var(--blue)'],
    ['Habits', counts.completedHabits, counts.habits, '/habits', 'var(--green)'],
    ['Goals', counts.completedGoals, counts.goals, '/goals', 'var(--purple)'],
    ['Prayer', counts.prayersToday, 5, '/prayer', 'var(--green)'],
    ['Study', counts.study, Math.max(counts.study, 1), '/study', 'var(--blue)'],
    ['Calendar', counts.eventsToday, Math.max(counts.eventsToday, 1), '/calendar', 'var(--orange)'],
    ['Water', counts.water, 8, '/water', 'var(--blue)'],
    ['Sleep', counts.sleep, Math.max(counts.sleep, 1), '/sleep', 'var(--purple)']
  ] as const

  return <div className="dashboard-overview">
    <section className="dash-hero" aria-label="Overview">
      <div className="dash-hero-greeting"><p className="eyebrow">{greeting}, {name}</p><h1>Level {level} <span className="dash-hero-xp">{xp % 500} / 500 XP</span></h1><p className="dash-hero-quote">“{QUOTES[new Date().getDate() % QUOTES.length]}”</p></div>
      <div className="dash-hero-rings">
        <div className="dash-hero-ring"><ProgressRing value={levelProgress} size={72} /><span>{levelProgress}%</span><small>To next level</small></div>
        <div className="dash-hero-ring"><ProgressRing value={productivity} size={72} color="var(--green)" /><span>{productivity}%</span><small>Productivity</small></div>
      </div>
    </section>
    <nav className="dash-quick-actions" aria-label="Quick actions">
      <Link to="/todos"><ListPlus size={17} />Add task</Link><Link to="/habits"><Repeat2 size={17} />Add habit</Link><Link to="/calendar"><CalendarPlus size={17} />Add event</Link><Link to="/workout"><Dumbbell size={17} />Start workout</Link><Link to="/water"><Droplets size={17} />Log water</Link>
    </nav>
    <section className="dash-section"><h2 className="dash-section-title">Today</h2><div className="dash-summary-grid">{cards.map(([title, value, target, href, color]) => <Link className="dash-summary-card" to={href} key={title}><ProgressRing value={percent(value, target)} color={color} /><div><h3>{title}</h3><p>{value}/{target} tracked</p></div></Link>)}</div></section>
    <section className="dash-columns">
      <div className="dash-section"><h2 className="dash-section-title">Upcoming events</h2>{upcoming.length ? <ul className="dash-event-list">{upcoming.map((item) => <li key={item.id}><time>{isoDay(item.date ?? item.startsAt)}</time><span>{recordText(item, 'title', 'name') || 'Event'}</span></li>)}</ul> : <p className="widget-empty-row">No upcoming events.</p>}</div>
      <div className="dash-section"><h2 className="dash-section-title">Recent activity</h2>{activity.length ? <ul className="dash-activity-list">{activity.map((item) => <li key={item.id}><span className="dash-activity-dot" /><span>{recordText(item, 'title', 'name', 'type') || 'Activity updated'}</span></li>)}</ul> : <p className="widget-empty-row">No recent activity.</p>}</div>
    </section>
  </div>
}
