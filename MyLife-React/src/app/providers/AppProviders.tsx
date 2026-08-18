import { AuthProvider } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'
import { Router } from '../router'
import { ErrorBoundary } from '../../components/feedback/ErrorBoundary'

export default function AppProviders() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
