import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Aurora Visual (Left) */}
      <div className="auth-visual">
        <div className="aurora">
          <div className="aurora-blob blob-a"></div>
          <div className="aurora-blob blob-b"></div>
          <div className="aurora-blob blob-c"></div>
          <div className="aurora-grid"></div>
          <div className="aurora-noise"></div>
        </div>

        <div className="auth-visual-content">
          <div>
            <div className="auth-brand">
              <div className="auth-brand-mark">M</div>
              <div>
                <div className="auth-brand-name">Momentum</div>
              </div>
            </div>

            <div className="auth-visual-copy">
              <div className="eyebrow">Welcome Back</div>
              <h1 className="auth-headline">Your Life, Your Way</h1>
              <p className="auth-subline">
                Track your habits, monitor your workouts, and achieve your goals with Momentum.
              </p>
            </div>
          </div>

          <ul className="auth-visual-points">
            <li>
              <span className="point-dot"></span>
              <span>Real-time progress tracking</span>
            </li>
            <li>
              <span className="point-dot"></span>
              <span>Personalized insights</span>
            </li>
            <li>
              <span className="point-dot"></span>
              <span>Achieve your goals</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Glass Card (Right) */}
      <div className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-card-glow"></div>

          <div className="auth-panel reveal" style={{ '--i': 0 } as React.CSSProperties}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '6px', color: '#fff' }}>Sign In</h2>
            <p className="auth-panel-sub">Enter your email and password to continue</p>
          </div>

          {error && (
            <div
              className="auth-panel reveal error-message"
              style={{ '--i': 1 } as React.CSSProperties}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div
              className="field reveal"
              style={{ '--i': error ? 2 : 1 } as React.CSSProperties}
            >
              <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="email"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
              <label htmlFor="email">Email Address</label>
              <span className="field-status">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>

            <div
              className="field reveal"
              style={{ '--i': error ? 3 : 2 } as React.CSSProperties}
            >
              <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="password"
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <label htmlFor="password">Password</label>
              <span className="field-status">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>

            <button
              type="submit"
              className="auth-submit reveal"
              disabled={isLoading}
              style={{ '--i': error ? 4 : 3 } as React.CSSProperties}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div
            className="auth-panel reveal"
            style={{ '--i': error ? 5 : 4, textAlign: 'center' } as React.CSSProperties}
          >
            <p className="auth-panel-sub">
              Don't have an account?{' '}
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--blue)' }}>
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Cursor Glow Effect */}
      <div className="cursor-glow"></div>
    </div>
  )
}
