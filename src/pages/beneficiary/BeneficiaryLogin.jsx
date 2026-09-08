import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { supabase } from '../../lib/supabase.js'

export default function BeneficiaryLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }
    navigate('/beneficiary/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm border-2 border-beneficiary-border p-8">
        <div className="mb-1 text-lg font-bold text-beneficiary-dark">Beneficiary login</div>
        <p className="mb-6 text-xs text-faint">Log in to view your household's aid history</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-beneficiary"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-beneficiary"
          />

          {error && <p className="text-xs font-semibold text-admin">{error}</p>}

          <Button type="submit" variant="beneficiary" disabled={loading}>
            {loading ? 'Please wait…' : 'Log in'}
          </Button>
        </form>

        <Link
          to="/beneficiary/register"
          className="mt-4 block text-center text-xs font-semibold text-beneficiary-dark"
        >
          Household not registered yet? Register
        </Link>

        <Link to="/" className="mt-3 block text-center text-xs text-faint">
          ← Back to home
        </Link>
      </Card>
    </div>
  )
}