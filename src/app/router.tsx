import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'
import { RouteLoading } from '../components/feedback/RouteLoading'
import { Login } from './pages/Login'
import FoundationPage from './pages/FoundationPage'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const TodoPage = lazy(() => import('./pages/TodoPage'))
const Register = lazy(() => import('./pages/Register'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <RouteLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <RouteLoading />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export function Router() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/todos"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <TodoPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        {['habits', 'goals', 'calendar', 'workout', 'prayer', 'quran', 'nutrition', 'water', 'sleep', 'study', 'statistics', 'profile', 'settings'].map((path) => (
          <Route key={path} path={`/${path}`} element={<ProtectedRoute><FoundationPage title={path[0].toUpperCase() + path.slice(1)} /></ProtectedRoute>} />
        ))}
        <Route path="/register" element={<PublicRoute><Suspense fallback={<RouteLoading />}><Register /></Suspense></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><Suspense fallback={<RouteLoading />}><ResetPassword /></Suspense></PublicRoute>} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoading />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
