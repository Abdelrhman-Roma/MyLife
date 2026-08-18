import { describe, expect, it } from 'vitest'
import { addWidget, DEFAULT_LAYOUT, mergeLayout, overviewCounts, reorderWidgets, updateWidget } from './dashboardService'

describe('dashboardService', () => {
  it('restores the legacy default layout', () => expect(mergeLayout(undefined)).toEqual(DEFAULT_LAYOUT))
  it('adds, hides, and restores registered widgets', () => {
    const added = addWidget(DEFAULT_LAYOUT, 'pomodoro')
    expect(added.widgets.some((item) => item.widgetId === 'pomodoro' && !item.hidden)).toBe(true)
    const hidden = updateWidget(added, 'pomodoro', { hidden: true })
    expect(hidden.widgets.find((item) => item.widgetId === 'pomodoro')?.hidden).toBe(true)
    expect(addWidget(hidden, 'pomodoro').widgets.find((item) => item.widgetId === 'pomodoro')?.hidden).toBe(false)
  })
  it('reorders visible widgets without losing placement state', () => {
    const reordered = reorderWidgets(DEFAULT_LAYOUT, 'quote', 'todo')
    expect(reordered.widgets.filter((item) => !item.hidden).sort((a, b) => a.order - b.order)[0].widgetId).toBe('quote')
    expect(reordered.widgets.find((item) => item.widgetId === 'todo')?.pinned).toBe(true)
  })
  it('uses the corrected prayer and water shapes', () => {
    const today = new Date().toISOString().slice(0, 10)
    const counts = overviewCounts({ tasks: [], habits: [], goals: [], events: [], workouts: [], meals: [], study: [], sleep: [], notifications: [], achievements: [], prayers: [{ id: 'p1', date: today, status: 'completed' }], water: [{ id: 'w1', date: today, glasses: 3 }] })
    expect(counts.prayersToday).toBe(1)
    expect(counts.water).toBe(3)
  })
})
