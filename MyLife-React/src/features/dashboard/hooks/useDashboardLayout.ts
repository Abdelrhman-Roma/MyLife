import { useCallback, useEffect, useRef, useState } from 'react'
import { saveDashboardLayout, subscribeDashboardLayout } from '../repositories/dashboardRepository'
import { DEFAULT_LAYOUT } from '../services/dashboardService'
import type { DashboardLayout } from '../types/dashboard'

export function useDashboardLayout(uid: string) {
  const [layout, setLayoutState] = useState<DashboardLayout>(DEFAULT_LAYOUT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => subscribeDashboardLayout(uid, (value) => {
    setLayoutState(value)
    setLoading(false)
  }, (cause) => {
    setError(cause.message)
    setLoading(false)
  }), [uid])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const setLayout = useCallback((next: DashboardLayout | ((current: DashboardLayout) => DashboardLayout)) => {
    setLayoutState((current) => {
      const value = typeof next === 'function' ? next(current) : next
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        void saveDashboardLayout(uid, value).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Dashboard layout could not be saved.'))
      }, 400)
      return value
    })
  }, [uid])

  return { layout, setLayout, loading, error }
}
