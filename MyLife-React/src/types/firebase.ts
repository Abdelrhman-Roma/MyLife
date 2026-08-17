import { User } from 'firebase/auth'

export interface FirebaseUser extends User {
  uid: string
  email: string | null
  emailVerified: boolean
  displayName: string | null
  photoURL: string | null
}

export interface FirestoreDocument {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface FirebaseError {
  code: string
  message: string
  category: 'network' | 'permission' | 'not-found' | 'timeout' | 'unavailable' | 'auth-expired' | 'validation' | 'unknown'
  retryable: boolean
}
