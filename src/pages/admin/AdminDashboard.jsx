import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import { supabase } from '../../lib/supabase.js'

const TABS = [
  { label: 'Overview', to: '/admin/dashboard' },
  { label: 'Donations', to: '/admin/donations' },
  { label: 'Beneficiary registry', to: '/admin/beneficiaries' },
  { label: 'Record distribution', to: '/admin/distribution' },
  { label: 'Reports', to: '/admin/reports' },
  { label: 'Report generator', to: '/admin/report-generator' },
]

export function AdminTabs() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  async function handleLogout() { await supabase.auth.signOut(); navigate('/admin/login') }
  return (
    <div className="mb-6 flex items-center justify-between border-b border-line">
      <div className="flex gap-1">
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} className={`px-4 py-2 text-xs font-bold ${pathname === t.to ? 'border-b-2 border-admin text-admin-dark' : 'text-faint hover:text-muted'}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <button onClick={handleLogout} className="px-4 py-2 text-xs font-semibold text-faint hover:text-admin">Log out</button>
    </div>
  )
}

export default function AdminDashboard() {
  const [donations, setDonations] = useState([])
  const [beneficiaries, setBeneficiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [openPanel, setOpenPanel] = useState(null) // 'donations' | 'beneficiaries' | 'barangays' | null

  useEffect(() => {
    async function loadStats() {
      const { data: donationsData } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: beneficiariesData } = await supabase
        .from('beneficiaries')
        .select('*')
        .order('created_at', { ascending: false })

      setDonations(donationsData || [])
      setBeneficiaries(beneficiariesData || [])
      setLoading(false)
    }
    loadStats()
  }, [])

  const barangaySet = new Set([
    ...donations.map((d) => d.barangay).filter(Boolean),
    ...beneficiaries.map((b) => b.barangay).filter(Boolean),
  ])
  const barangayList = Array.from(barangaySet).sort()

  function togglePanel(panel) {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-xl font-bold text-admin-dark">Administrator dashboard</h1>
        <p className="mb-6 text-xs text-faint">DSWD / LGU staff view</p>
        <AdminTabs />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button onClick={() => togglePanel('donations')} className="text-left">
            <Card className={`p-5 transition hover:border-admin ${openPanel === 'donations' ? 'border-admin' : ''}`}>
              <div className="text-xs text-faint">Total donations recorded</div>
              <div className="mt-1 text-2xl font-bold text-ink">{loading ? '…' : donations.length}</div>
              <div className="mt-1 text-[10px] font-semibold text-admin-dark">
                {openPanel === 'donations' ? 'Hide details ▲' : 'View details ▼'}
              </div>
            </Card>
          </button>

          <button onClick={() => togglePanel('beneficiaries')} className="text-left">
            <Card className={`p-5 transition hover:border-admin ${openPanel === 'beneficiaries' ? 'border-admin' : ''}`}>
              <div className="text-xs text-faint">Registered beneficiary households</div>
              <div className="mt-1 text-2xl font-bold text-ink">{loading ? '…' : beneficiaries.length}</div>
              <div className="mt-1 text-[10px] font-semibold text-admin-dark">
                {openPanel === 'beneficiaries' ? 'Hide details ▲' : 'View details ▼'}
              </div>
            </Card>
          </button>

          <button onClick={() => togglePanel('barangays')} className="text-left">
            <Card className={`p-5 transition hover:border-admin ${openPanel === 'barangays' ? 'border-admin' : ''}`}>
              <div className="text-xs text-faint">Barangays covered</div>
              <div className="mt-1 text-2xl font-bold text-ink">{loading ? '…' : `${barangayList.length} / 22`}</div>
              <div className="mt-1 text-[10px] font-semibold text-admin-dark">
                {openPanel === 'barangays' ? 'Hide details ▲' : 'View details ▼'}
              </div>
            </Card>
          </button>
        </div>

        {openPanel === 'donations' && (
          <Card className="mt-4 p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">All donations</h2>
            {donations.length === 0 && <p className="text-xs text-faint">No donations recorded yet.</p>}
            <div className="space-y-2">
              {donations.map((d) => (
                <div key={d.id} className="flex items-center justify-between border-b border-line-soft py-2 text-sm">
                  <div>
                    <div className="font-semibold text-ink">{d.item} {d.quantity ? `— ${d.quantity}` : ''}</div>
                    <div className="text-xs text-faint">Donated by {d.donor_name || 'Anonymous'} · Brgy. {d.barangay}</div>
                  </div>
                  <div className="text-xs text-faint">{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {openPanel === 'beneficiaries' && (
          <Card className="mt-4 p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Registered beneficiary households</h2>
            {beneficiaries.length === 0 && <p className="text-xs text-faint">No beneficiaries registered yet.</p>}
            <div className="space-y-2">
              {beneficiaries.map((b) => (
                <div key={b.id} className="flex items-center justify-between border-b border-line-soft py-2 text-sm">
                  <div>
                    <div className="font-semibold text-ink">{b.full_name || b.household_head || 'Unnamed household'}</div>
                    <div className="text-xs text-faint">Brgy. {b.barangay}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {openPanel === 'barangays' && (
          <Card className="mt-4 p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Barangays with recorded activity</h2>
            {barangayList.length === 0 && <p className="text-xs text-faint">No barangays recorded yet.</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {barangayList.map((brgy) => {
                const donationCount = donations.filter((d) => d.barangay === brgy).length
                const beneficiaryCount = beneficiaries.filter((b) => b.barangay === brgy).length
                return (
                  <div key={brgy} className="rounded-lg border border-line-soft px-3 py-2">
                    <div className="text-sm font-semibold text-ink">Brgy. {brgy}</div>
                    <div className="text-xs text-faint">{donationCount} donations · {beneficiaryCount} households</div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <Card className="mt-4 p-5">
          <div className="mb-3 text-sm font-bold text-ink">Barangay aid map — Manolo Fortich, Bukidnon</div>
          <div className="overflow-hidden rounded-lg border border-line">
            <iframe title="Manolo Fortich, Bukidnon map" src="https://maps.google.com/maps?q=Manolo%20Fortich%2C%20Bukidnon%2C%20Philippines&z=12&output=embed" className="h-80 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <p className="mt-2 text-[11px] text-faint">Showing Manolo Fortich, Bukidnon. Swap this embed for a barangay-level SVG/GeoJSON overlay once you have aid-volume data per barangay.</p>
        </Card>
      </div>
    </div>
  )
}