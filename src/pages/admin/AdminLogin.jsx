import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import { supabase } from '../../lib/supabase.js'

const inputClass =
  'w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-admin focus:ring-2 focus:ring-admin/15'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    // Admin accounts should be pre-provisioned (not self-registered) —
    // verify role via a `profiles` table joined on auth.users.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      setError('This account is not registered as an administrator.')
      await supabase.auth.signOut()
      return
    }

    navigate('/admin/dashboard')
  }

  return (
    <AuthLayout
      role="admin"
      title="Administrator login"
      subtitle="DSWD / LGU staff access only"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Staff email address</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@mswdo.gov.ph"
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

        {error && <p className="rounded-lg bg-admin-light px-3 py-2 text-xs font-semibold text-admin-dark">{error}</p>}

        <Button type="submit" variant="admin" disabled={loading}>
          {loading ? 'Please wait…' : 'Log in to workspace'}
        </Button>
      </form>

      <p className="mt-4 rounded-lg bg-line-soft/60 px-3 py-2 text-[11px] leading-relaxed text-faint">
        Admin accounts are created by the MSWDO. If you need access, contact the system administrator.
      </p>

      <Link to="/" className="mt-4 block text-center text-xs text-faint sm:hidden">
        ← Back to home
      </Link>
    </AuthLayout>
  )
}
