import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, Firestore } from 'firebase/firestore'
import { app } from './firebase'

function createFirestore(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed-precondition')) {
      console.warn('[Firestore] Incompatible cache detected, falling back to memory cache. This is expected after SDK version changes.')
      return initializeFirestore(app, {
        localCache: memoryLocalCache()
      })
    }
    throw error
  }
}

export const db = createFirestore()
