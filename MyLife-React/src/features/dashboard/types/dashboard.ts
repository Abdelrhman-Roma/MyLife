export type WidgetSize = 'sm' | 'md' | 'lg'

export interface WidgetPlacement {
  widgetId: string
  order: number
  size: WidgetSize
  hidden: boolean
  pinned: boolean
  collapsed: boolean
}

export interface DashboardPersonalization {
  accentColor: string
  cornerRadius: 'sharp' | 'md' | 'round'
  transparency: number
  compactMode: boolean
  animations: boolean
}

export interface DashboardLayout {
  widgets: WidgetPlacement[]
  personalization: DashboardPersonalization
}

export interface DashboardRecord {
  id: string
  [key: string]: unknown
}

export type DashboardCollectionKey =
  | 'tasks' | 'habits' | 'goals' | 'events' | 'workouts' | 'prayers'
  | 'meals' | 'study' | 'water' | 'sleep' | 'notifications' | 'achievements'

export type DashboardCollections = Record<DashboardCollectionKey, DashboardRecord[]>

export interface DashboardState {
  collections: DashboardCollections
  profile: DashboardRecord | null
  loading: boolean
  error: string | null
}

export interface WidgetDefinition {
  id: string
  title: string
  category: 'productivity' | 'wellness' | 'insight' | 'utility'
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
}
