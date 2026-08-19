import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { supabase } from '../../lib/supabase.js'

export default function DonorLogin() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const action = isRegister
      ? supabase.auth.signUp({ email, password, options: { data: { role: 'donor', full_name: fullName } } })
      : supabase.auth.signInWithPassword({ email, password })
    const { error: authError } = await action
    setLoading(false)
    if (authError) { setError(authError.message); return }
    navigate('/donor/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm border-2 border-donor-border p-8">
        <div className="mb-1 text-lg font-bold text-navy">{isRegister ? 'Register as donor' : 'Donor login'}</div>
        <p className="mb-6 text-xs text-faint">{isRegister ? 'Create your donor account' : 'Log in to track your donations'}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <input required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-donor" />
          )}
          <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-donor" />
          <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-donor" />
          {error && <p className="text-xs font-semibold text-admin">{error}</p>}
          <Button type="submit" variant="donor" disabled={loading}>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</Button>
        </form>
        <button onClick={() => setIsRegister((v) => !v)} className="mt-4 w-full text-center text-xs font-semibold text-donor-dark">
          {isRegister ? 'Already have an account? Log in' : "Don't have an account? Register"}
        </button>
        <Link to="/" className="mt-3 block text-center text-xs text-faint">← Back to home</Link>
      </Card>
    </div>
  )
}