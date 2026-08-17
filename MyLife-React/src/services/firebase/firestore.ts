import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { app } from './firebase'

export const db = getFirestore(app)

try {
  enableIndexedDbPersistence(db)
} catch (error: unknown) {
  const err = error as Error & { code?: string }
  if (err?.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.')
  } else if (err?.code === 'unimplemented') {
    console.warn('The current browser does not support offline persistence.')
  }
}
