import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await signUp(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Account creation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-simple-page">
      <section className="auth-card" aria-labelledby="register-title">
        <h1 id="register-title">Create account</h1>
        <p className="auth-panel-sub">Start using MyLife with your email address.</p>
        {error && <div className="error-message" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={submitting} /></label>
          <label className="auth-field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required disabled={submitting} /></label>
          <label className="auth-field">Confirm password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required disabled={submitting} /></label>
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="auth-panel-sub auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  )
}
