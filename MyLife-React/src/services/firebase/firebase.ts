import { initializeApp, getApps, getApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
}

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'] as const
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key])

if (missingKeys.length > 0) {
  throw new Error(`Firebase configuration is missing: ${missingKeys.join(', ')}`)
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export { app }
