export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
  photoURL: string | null
  createdAt: Date
  lastSignInTime: Date | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  displayName?: string
}

export interface PasswordResetRequest {
  email: string
}
