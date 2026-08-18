import type { DashboardCollections, DashboardLayout, DashboardRecord, WidgetDefinition, WidgetPlacement } from '../types/dashboard'

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { widgetId: 'todo', order: 0, size: 'md', hidden: false, pinned: true, collapsed: false },
    { widgetId: 'habits', order: 1, size: 'sm', hidden: false, pinned: false, collapsed: false },
    { widgetId: 'weather', order: 2, size: 'sm', hidden: false, pinned: false, collapsed: false },
    { widgetId: 'quote', order: 3, size: 'sm', hidden: false, pinned: false, collapsed: false }
  ],
  personalization: { accentColor: '', cornerRadius: 'md', transparency: 0, compactMode: false, animations: true }
}

export const WIDGETS: WidgetDefinition[] = [
  ['todo', 'Today\u2019s Tasks', 'productivity', 'md', ['sm', 'md', 'lg']],
  ['weather', 'Weather', 'insight', 'sm', ['sm', 'md']],
  ['notifications', 'Notifications', 'utility', 'sm', ['sm', 'md']],
  ['quick-notes', 'Quick Notes', 'utility', 'sm', ['sm', 'md', 'lg']],
  ['quote', 'Quote', 'wellness', 'sm', ['sm', 'md']],
  ['pomodoro', 'Pomodoro', 'wellness', 'sm', ['sm', 'md']],
  ['habits', 'Habits', 'wellness', 'sm', ['sm', 'md']],
  ['goals', 'Goals', 'productivity', 'sm', ['sm', 'md']],
  ['workout', 'Workout', 'wellness', 'sm', ['sm', 'md']],
  ['nutrition', 'Nutrition', 'wellness', 'sm', ['sm', 'md']],
  ['prayer', 'Prayer', 'wellness', 'sm', ['sm', 'md']],
  ['study', 'Study', 'productivity', 'sm', ['sm', 'md']],
  ['calendar', 'Calendar', 'productivity', 'sm', ['sm', 'md']],
  ['statistics', 'Statistics', 'insight', 'sm', ['sm', 'md']],
  ['achievements', 'Achievements', 'insight', 'sm', ['sm', 'md']],
  ['water', 'Water', 'wellness', 'sm', ['sm', 'md']],
  ['sleep', 'Sleep', 'wellness', 'sm', ['sm', 'md']]
].map(([id, title, category, defaultSize, allowedSizes]) => ({
  id: id as string,
  title: title as string,
  category: category as WidgetDefinition['category'],
  defaultSize: defaultSize as WidgetDefinition['defaultSize'],
  allowedSizes: allowedSizes as WidgetDefinition['allowedSizes']
}))

export function mergeLayout(value: Partial<DashboardLayout> | undefined): DashboardLayout {
  return {
    widgets: Array.isArray(value?.widgets) && value.widgets.length ? value.widgets : DEFAULT_LAYOUT.widgets,
    personalization: { ...DEFAULT_LAYOUT.personalization, ...(value?.personalization ?? {}) }
  }
}

export function addWidget(layout: DashboardLayout, widgetId: string): DashboardLayout {
  const definition = WIDGETS.find((widget) => widget.id === widgetId)
  if (!definition) return layout
  const existing = layout.widgets.find((item) => item.widgetId === widgetId)
  const widgets = existing
    ? layout.widgets.map((item) => item.widgetId === widgetId ? { ...item, hidden: false } : item)
    : [...layout.widgets, { widgetId, order: layout.widgets.length, size: definition.defaultSize, hidden: false, pinned: false, collapsed: false } satisfies WidgetPlacement]
  return { ...layout, widgets }
}

export function updateWidget(layout: DashboardLayout, widgetId: string, patch: Partial<WidgetPlacement>): DashboardLayout {
  return { ...layout, widgets: layout.widgets.map((item) => item.widgetId === widgetId ? { ...item, ...patch } : item) }
}

export function reorderWidgets(layout: DashboardLayout, activeId: string, overId: string): DashboardLayout {
  const visible = layout.widgets.filter((item) => !item.hidden).sort((a, b) => a.order - b.order)
  const from = visible.findIndex((item) => item.widgetId === activeId)
  const to = visible.findIndex((item) => item.widgetId === overId)
  if (from < 0 || to < 0 || from === to) return layout
  const next = [...visible]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  const ordered = new Map(next.map((item, order) => [item.widgetId, { ...item, order }]))
  return { ...layout, widgets: layout.widgets.map((item) => ordered.get(item.widgetId) ?? item) }
}

export function recordText(record: DashboardRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export function recordNumber(record: DashboardRecord, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return 0
}

export function recordBoolean(record: DashboardRecord, key: string): boolean {
  return record[key] === true
}

export function isoDay(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10)
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return (value.toDate() as Date).toISOString().slice(0, 10)
  }
  return ''
}

export function todayIso(): string { return new Date().toISOString().slice(0, 10) }

export function overviewCounts(data: DashboardCollections) {
  const today = todayIso()
  const prayersToday = data.prayers.filter((item) => isoDay(item.date) === today && (recordBoolean(item, 'completed') || recordText(item, 'status') === 'completed')).length
  return {
    tasks: data.tasks.length,
    completedTasks: data.tasks.filter((item) => recordBoolean(item, 'completed')).length,
    habits: data.habits.length,
    completedHabits: data.habits.filter((item) => recordBoolean(item, 'completed') || isoDay(item.lastCompletedAt) === today).length,
    goals: data.goals.length,
    completedGoals: data.goals.filter((item) => recordBoolean(item, 'completed') || recordText(item, 'status').toLowerCase() === 'completed').length,
    prayersToday,
    study: data.study.filter((item) => isoDay(item.date ?? item.createdAt) === today).length,
    water: data.water.filter((item) => isoDay(item.date ?? item.createdAt) === today).reduce((sum, item) => sum + recordNumber(item, 'glasses', 'amount', 'cups'), 0),
    sleep: data.sleep.length,
    eventsToday: data.events.filter((item) => isoDay(item.date ?? item.startsAt) === today).length
  }
}
