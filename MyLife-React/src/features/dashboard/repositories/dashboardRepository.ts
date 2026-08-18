import {
  collection, doc, onSnapshot, setDoc, updateDoc, serverTimestamp,
  type DocumentData, type Unsubscribe
} from 'firebase/firestore'
import { db } from '../../../services/firebase/firestore'
import type {
  DashboardCollectionKey, DashboardLayout, DashboardRecord
} from '../types/dashboard'
import { mergeLayout } from '../services/dashboardService'

const COLLECTION_PATHS: Record<DashboardCollectionKey, string> = {
  tasks: 'todos', habits: 'habits', goals: 'goals', events: 'calendar', workouts: 'workouts',
  prayers: 'prayers', meals: 'nutrition', study: 'study', water: 'water', sleep: 'sleep',
  notifications: 'notifications', achievements: 'achievements'
}

function toRecord(id: string, value: DocumentData): DashboardRecord {
  return { id, ...value }
}

export function subscribeDashboardCollection(
  uid: string,
  key: DashboardCollectionKey,
  onValue: (items: DashboardRecord[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTION_PATHS[key], uid, 'items'),
    (snapshot) => onValue(snapshot.docs.map((item) => toRecord(item.id, item.data()))),
    (error) => onError(error)
  )
}

export function subscribeDashboardProfile(
  uid: string,
  onValue: (profile: DashboardRecord | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    onValue(snapshot.exists() ? toRecord(snapshot.id, snapshot.data()) : null)
  }, onError)
}

export function subscribeDashboardLayout(
  uid: string,
  onValue: (layout: DashboardLayout) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid, 'dashboard', 'layout'), (snapshot) => {
    onValue(mergeLayout(snapshot.exists() ? snapshot.data() as Partial<DashboardLayout> : undefined))
  }, onError)
}

export async function saveDashboardLayout(uid: string, layout: DashboardLayout): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'dashboard', 'layout'), { ...layout, updatedAt: serverTimestamp() }, { merge: true })
}

export async function updateDashboardRecord(uid: string, key: DashboardCollectionKey, id: string, patch: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, COLLECTION_PATHS[key], uid, 'items', id), { ...patch, updatedAt: serverTimestamp() })
}

export async function updateDashboardProfile(uid: string, patch: Record<string, unknown>): Promise<void> {
  await setDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true })
}
