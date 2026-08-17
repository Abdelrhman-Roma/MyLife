import { AuthProvider } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'
import { Router } from '../router'

export default function AppProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router />
      </ThemeProvider>
    </AuthProvider>
  )
}
