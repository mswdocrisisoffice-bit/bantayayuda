import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { supabase } from '../../lib/supabase.js'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></>,
  pin: <><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  warn: <><path d="M10.3 3.9 1.8 18a1.5 1.5 0 0 0 1.3 2.3h17.8a1.5 1.5 0 0 0 1.3-2.3L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
}

export default function BeneficiaryDashboard() {
  const [household, setHousehold] = useState(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/beneficiary/login')
  }

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        setLoading(false)
        return
      }
      setEmail(userData.user.email || '')

      const { data: householdData } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle()
      setHousehold(householdData)

      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Status', value: 'All confirmed', icon: 'check', tone: 'bg-beneficiary-light text-beneficiary-dark' },
    { label: 'Household members', value: household?.household_size ?? '—', icon: 'users', tone: 'bg-beneficiary-light text-beneficiary-dark' },
    { label: 'Barangay', value: household?.barangay ? `Brgy. ${household.barangay}` : '—', icon: 'pin', tone: 'bg-beneficiary-light text-beneficiary-dark' },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream pb-10">
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={household?.household_head || 'Beneficiary'} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">
                {loading ? 'Loading…' : household?.household_head || 'My household'}
              </h1>
              {household?.barangay && <p className="truncate text-sm text-white/70">Brgy. {household.barangay}</p>}
              <p className="truncate text-xs text-white/50">{email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 rounded-lg bg-white/5 px-4 py-2">
            <Link to="/beneficiary/history" className="text-sm font-semibold text-white/80 transition-colors hover:text-white">
              View aid history →
            </Link>
            <span className="h-4 w-px bg-white/20" />
            <button onClick={handleLogout} className="text-sm font-semibold text-white/70 transition-colors hover:text-white">
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-5xl px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {statCards.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-faint">{s.label}</div>
                  <div className="mt-1 text-lg font-bold text-ink">{loading ? '…' : s.value}</div>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.tone}`}>
                  <Icon path={icons[s.icon]} className="h-4.5 w-4.5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-4 border-2 border-beneficiary-border p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-beneficiary-light text-beneficiary-dark">
              <Icon path={icons.check} className="h-4 w-4" />
            </span>
            <div className="text-sm font-bold text-ink">All confirmed</div>
          </div>
          <p className="mb-4 text-xs text-faint">Every distribution on your record is e-signed.</p>
          {household?.created_at && (
            <div className="border-t border-line-soft pt-3 text-xs text-faint">
              Member since{' '}
              <span className="font-bold text-ink">
                {new Date(household.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </Card>

        <Card className="mt-4 border border-warn-border bg-warn-bg p-5">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-warn-text">
            <Icon path={icons.warn} className="h-4 w-4" />
            Missing something?
          </div>
          <p className="text-xs text-warn-text">
            If a distribution isn't listed here, report it to your barangay office.
          </p>
        </Card>
      </div>
    </div>
  )
}