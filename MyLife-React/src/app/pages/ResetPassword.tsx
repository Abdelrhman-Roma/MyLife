import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { resetPassword } = useAuth()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      await resetPassword(email.trim())
      setMessage('Password reset instructions have been sent if this account exists.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Password reset failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-simple-page">
      <section className="auth-card" aria-labelledby="reset-title">
        <h1 id="reset-title">Reset password</h1>
        <p className="auth-panel-sub">Enter your email to receive reset instructions.</p>
        {error && <div className="error-message" role="alert">{error}</div>}
        {message && <div className="success-message" role="status">{message}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={submitting} /></label>
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send reset email'}</button>
        </form>
        <p className="auth-panel-sub auth-switch"><Link to="/login">Back to sign in</Link></p>
      </section>
    </main>
  )
}
