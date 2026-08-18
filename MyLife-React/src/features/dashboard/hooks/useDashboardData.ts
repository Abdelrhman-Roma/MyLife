import { useEffect, useMemo, useState } from 'react'
import { subscribeDashboardCollection, subscribeDashboardProfile } from '../repositories/dashboardRepository'
import type { DashboardCollectionKey, DashboardCollections, DashboardRecord, DashboardState } from '../types/dashboard'

const KEYS: DashboardCollectionKey[] = ['tasks', 'habits', 'goals', 'events', 'workouts', 'prayers', 'meals', 'study', 'water', 'sleep', 'notifications', 'achievements']
const EMPTY: DashboardCollections = {
  tasks: [], habits: [], goals: [], events: [], workouts: [], prayers: [], meals: [], study: [], water: [], sleep: [], notifications: [], achievements: []
}

export function useDashboardData(uid: string): DashboardState {
  const [collections, setCollections] = useState<DashboardCollections>(EMPTY)
  const [profile, setProfile] = useState<DashboardRecord | null>(null)
  const [loaded, setLoaded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCollections(EMPTY)
    setLoaded(new Set())
    setError(null)
    const markLoaded = (key: string) => setLoaded((current) => new Set(current).add(key))
    const handleError = (cause: Error) => setError(cause.message || 'Dashboard data could not be loaded.')
    const subscriptions = KEYS.map((key) => subscribeDashboardCollection(uid, key, (items) => {
      setCollections((current) => ({ ...current, [key]: items }))
      markLoaded(key)
    }, handleError))
    subscriptions.push(subscribeDashboardProfile(uid, (value) => { setProfile(value); markLoaded('profile') }, handleError))
    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [uid])

  return useMemo(() => ({ collections, profile, error, loading: loaded.size < KEYS.length + 1 }), [collections, profile, error, loaded])
}
