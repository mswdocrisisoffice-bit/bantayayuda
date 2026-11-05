import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import { supabase } from '../../lib/supabase.js'

const inputClass =
  'w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-beneficiary focus:ring-2 focus:ring-beneficiary/15'

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
    <AuthLayout
      role="beneficiary"
      title="Beneficiary login"
      subtitle="View your household's aid history"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Email address</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="rounded-lg bg-beneficiary-light px-3 py-2 text-xs font-semibold text-beneficiary-dark">{error}</p>}

        <Button type="submit" variant="beneficiary" disabled={loading}>
          {loading ? 'Please wait…' : 'Log in to my account'}
        </Button>
      </form>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
        No account yet? Please ask your barangay office or the MSWDO.
      </p>

      <Link to="/" className="mt-3 block text-center text-xs text-faint sm:hidden">
        ← Back to home
      </Link>
    </AuthLayout>
  )
}
