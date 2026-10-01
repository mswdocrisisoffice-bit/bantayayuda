import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { supabase } from '../../lib/supabase.js'

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

    if (authError) {
      setLoading(false)
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
      setLoading(false)
      setError('This account is not registered as an administrator.')
      await supabase.auth.signOut()
      return
    }

    // Staff registry check — a staff member who was deactivated can no longer log in.
    // (Admins not yet listed in the registry are still allowed, so nobody gets locked out.)
    const { data: staffRow } = await supabase
      .from('staff_members')
      .select('is_active')
      .ilike('email', data.user.email)
      .maybeSingle()

    if (staffRow && staffRow.is_active === false) {
      setLoading(false)
      setError('This staff account has been deactivated. Contact the administrator.')
      await supabase.auth.signOut()
      return
    }

    setLoading(false)
    navigate('/admin/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm border-2 border-admin-border p-8">
        <div className="mb-1 text-lg font-bold text-admin-dark">Administrator login</div>
        <p className="mb-6 text-xs text-faint">DSWD / LGU staff access only</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Staff email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
          />

          {error && <p className="text-xs font-semibold text-admin">{error}</p>}

          <Button type="submit" variant="admin" disabled={loading}>
            {loading ? 'Please wait…' : 'Log in'}
          </Button>
        </form>

        <Link to="/" className="mt-4 block text-center text-xs text-faint">
          ← Back to home
        </Link>
      </Card>
    </div>
  )
}