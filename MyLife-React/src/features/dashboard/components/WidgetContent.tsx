import { useEffect, useMemo, useRef, useState } from 'react'
import type { DashboardCollections, DashboardRecord } from '../types/dashboard'
import { isoDay, recordBoolean, recordNumber, recordText, todayIso } from '../services/dashboardService'
import { updateDashboardProfile, updateDashboardRecord } from '../repositories/dashboardRepository'

function Rows({ rows }: { rows: string[] }) { return rows.length ? <div className="widget-list">{rows.map((row, index) => <p className="widget-snapshot-row" key={`${row}-${index}`}>{row}</p>)}</div> : <p className="widget-empty-row">No data yet</p> }

function Pomodoro() {
  const [seconds, setSeconds] = useState(1500)
  const [running, setRunning] = useState(false)
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds((value) => { if (value <= 1) { setRunning(false); return 0 } return value - 1 }), 1000); return () => window.clearInterval(timer) }, [running])
  return <div className="widget-pomodoro"><p className="widget-pomodoro-time">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</p><div className="widget-pomodoro-actions"><button className="secondary-btn" onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : 'Start'}</button><button className="text-btn" onClick={() => { setRunning(false); setSeconds(1500) }}>Reset</button></div></div>
}

function QuickNotes({ uid, profile }: { uid: string; profile: DashboardRecord | null }) {
  const [value, setValue] = useState(recordText(profile ?? { id: '' }, 'quickNotes'))
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => { setValue(recordText(profile ?? { id: '' }, 'quickNotes')) }, [profile])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return <textarea className="widget-notes-textarea" aria-label="Quick notes" value={value} placeholder="Jot something down…" onChange={(event) => { const next = event.target.value; setValue(next); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void updateDashboardProfile(uid, { quickNotes: next }), 600) }} />
}

function Weather() {
  const [weather, setWeather] = useState<{ temperature: number; label: string } | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => { const controller = new AbortController(); void fetch('https://api.open-meteo.com/v1/forecast?latitude=30.0444&longitude=31.2357&current=temperature_2m,weather_code', { signal: controller.signal }).then((response) => response.json()).then((value: unknown) => { if (!value || typeof value !== 'object' || !('current' in value)) throw new Error('Invalid weather response'); const current = value.current as { temperature_2m?: number; weather_code?: number }; setWeather({ temperature: current.temperature_2m ?? 0, label: current.weather_code === 0 ? 'Clear' : 'Current conditions' }) }).catch((cause: unknown) => { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(true) }); return () => controller.abort() }, [])
  if (error) return <p className="widget-empty-row">Weather unavailable</p>
  if (!weather) return <p className="widget-loading-row">Loading weather…</p>
  return <div className="widget-weather"><span className="widget-weather-temp">{Math.round(weather.temperature)}°</span><span>{weather.label}</span></div>
}

export function WidgetContent({ id, uid, data, profile }: { id: string; uid: string; data: DashboardCollections; profile: DashboardRecord | null }) {
  const today = todayIso()
  const rows = useMemo(() => {
    switch (id) {
      case 'habits': return data.habits.slice(0, 5).map((item) => `${recordText(item, 'title', 'name') || 'Habit'} — ${recordBoolean(item, 'completed') ? 'done today' : 'not yet today'}`)
      case 'goals': return data.goals.slice(0, 5).map((item) => `${recordText(item, 'title', 'name') || 'Goal'} — ${Math.round(recordNumber(item, 'progress'))}%`)
      case 'workout': return data.workouts.slice(-3).reverse().map((item) => `${recordText(item, 'sessionTitle', 'title', 'type') || 'Workout'} — ${recordBoolean(item, 'completed') ? 'completed' : 'scheduled'}`)
      case 'nutrition': { const meals = data.meals.filter((item) => isoDay(item.date ?? item.createdAt) === today); return meals.length ? [`${meals.reduce((sum, item) => sum + recordNumber(item, 'calories'), 0)} calories today · ${meals.length} meals logged`] : [] }
      case 'prayer': { const done = data.prayers.filter((item) => isoDay(item.date ?? item.createdAt) === today && (recordBoolean(item, 'completed') || recordText(item, 'status').toLowerCase() === 'completed')).length; return done ? [`${done}/5 prayers logged today`] : [] }
      case 'study': { const minutes = data.study.reduce((sum, item) => sum + recordNumber(item, 'duration', 'durationMinutes', 'minutes'), 0); return data.study.length ? [`${minutes} minutes logged total`] : [] }
      case 'calendar': return data.events.filter((item) => isoDay(item.date ?? item.startsAt) === today).slice(0, 5).map((item) => recordText(item, 'title', 'name') || 'Event')
      case 'statistics': return [`${data.tasks.filter((item) => recordBoolean(item, 'completed')).length}/${data.tasks.length} tasks done`, `${data.habits.length} habits tracked`]
      case 'achievements': return data.achievements.length ? [`${data.achievements.length} achievements unlocked`] : []
      case 'water': { const total = data.water.filter((item) => isoDay(item.date ?? item.createdAt) === today).reduce((sum, item) => sum + recordNumber(item, 'glasses', 'amount', 'cups'), 0); return total ? [`${total} glasses logged today`] : [] }
      case 'sleep': return data.sleep.slice(-3).reverse().map((item) => `${recordNumber(item, 'hours', 'duration')} hours — ${isoDay(item.date ?? item.createdAt)}`)
      case 'notifications': return data.notifications.filter((item) => !recordBoolean(item, 'read') && !recordBoolean(item, 'archived')).slice(0, 5).map((item) => recordText(item, 'message') || 'Notification')
      default: return []
    }
  }, [data, id, today])

  if (id === 'todo') return <div className="widget-list">{data.tasks.filter((item) => !recordBoolean(item, 'completed')).slice(0, 6).map((item) => <label className="widget-task-row" key={item.id}><input type="checkbox" onChange={() => void updateDashboardRecord(uid, 'tasks', item.id, { completed: true, completedAt: new Date().toISOString() })} /><span>{recordText(item, 'title') || 'Task'}</span></label>)}{data.tasks.length === 0 && <p className="widget-empty-row">Nothing due — nice work.</p>}</div>
  if (id === 'weather') return <Weather />
  if (id === 'quick-notes') return <QuickNotes uid={uid} profile={profile} />
  if (id === 'quote') return <p className="widget-quote">“Consistency compounds. Keep going.”</p>
  if (id === 'pomodoro') return <Pomodoro />
  return <Rows rows={rows} />
}
