import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  AuthError
} from 'firebase/auth'
import { app } from './firebase'

export const auth = getAuth(app)

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    throw handleAuthError(error as AuthError)
  }
}

export async function registerUser(email: string, password: string, displayName?: string): Promise<User> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)

    if (displayName) {
      await updateProfile(result.user, { displayName })
    }

    return result.user
  } catch (error) {
    throw handleAuthError(error as AuthError)
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error) {
    throw handleAuthError(error as AuthError)
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    throw handleAuthError(error as AuthError)
  }
}

function handleAuthError(error: AuthError): Error {
  const errorMap: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'User account has been disabled',
    'auth/user-not-found': 'User not found',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already in use',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/weak-password': 'Password is too weak',
    'auth/network-request-failed': 'Network error',
    'auth/too-many-requests': 'Too many login attempts. Please try again later.'
  }

  const message = errorMap[error.code] || error.message
  return new Error(message)
}
