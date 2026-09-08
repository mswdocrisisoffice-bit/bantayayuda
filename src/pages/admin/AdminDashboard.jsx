import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import BarangayMap from '../../components/ui/BarangayMap.jsx'
import { supabase } from '../../lib/supabase.js'
import bantayayudaSeal from '../../assets/bantayayuda-seal.png'

/* ── Small inline icons (no external icon library installed) ── */
function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  donations: <><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1.5 0-4-1-4-3.2A2.3 2.3 0 0 1 10.3 2 3 3 0 0 1 12 3" /><path d="M12 7c1.5 0 4-1 4-3.2A2.3 2.3 0 0 0 13.7 2 3 3 0 0 0 12 3" /></>,
  beneficiaries: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  distribution: <><rect x="1" y="7" width="13" height="10" rx="1" /><path d="M14 10h4l3 3v4h-3" /><circle cx="6" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></>,
  inventory: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>,
  reports: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  generator: <><path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M15 2v5h5" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
  archive: <><rect x="2.5" y="4" width="19" height="4.5" rx="1" /><path d="M4 8.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8.5" /><path d="M10 12.5h4" /></>,
  barangay: <><path d="M12 2 3 7v13h18V7z" /><path d="M9 21v-6h6v6" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
}

const TABS = [
  { label: 'Overview', to: '/admin/dashboard', icon: 'overview' },
  { label: 'Donations', to: '/admin/donations', icon: 'donations' },
  { label: 'Beneficiary registry', to: '/admin/beneficiaries', icon: 'beneficiaries' },
  { label: 'Record distribution', to: '/admin/distribution', icon: 'distribution' },
  { label: 'Inventory', to: '/admin/inventory', icon: 'inventory' },
  { label: 'Reports', to: '/admin/reports', icon: 'reports' },
  { label: 'Report generator', to: '/admin/report-generator', icon: 'generator' },
  { label: 'Archive', to: '/admin/archive', icon: 'archive' },
]

export function AdminTabs() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="mb-6 overflow-hidden rounded-card shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
      {/* Branded header — mirrors the BantayAyuda landing page */}
      <div className="flex items-center justify-between bg-navy px-5 py-4 text-white sm:px-6">
       <Link to="/admin/dashboard" className="flex items-center gap-3">
  <img src={bantayayudaSeal} alt="BantayAyuda seal" className="h-14 w-14 shrink-0" />
  <div>
    <div className="text-base font-bold leading-tight tracking-tight">BantayAyuda</div>
    <div className="text-[11px] text-white/60">
      Relief goods and distribution tracking · Manolo Fortich
    </div>
  </div>
</Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-admin/90 px-3 py-1.5 text-[11px] font-bold text-white sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Administrator
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white"
          >
            <Icon path={icons.logout} className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-line bg-white px-2 py-1.5 sm:px-3">
        {TABS.map((t) => {
          const active = pathname === t.to
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                active
                  ? 'bg-admin-light text-admin-dark'
                  : 'text-faint hover:bg-line-soft hover:text-muted'
              }`}
            >
              <Icon path={icons[t.icon]} className="h-4 w-4" />
              {t.label}
            </Link>
          )
        })}
      </div>
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

  const statCards = [
    { key: 'donations', label: 'Total donations recorded', value: donations.length, icon: 'donations', tone: 'bg-admin-light text-admin-dark' },
    { key: 'beneficiaries', label: 'Registered beneficiary households', value: beneficiaries.length, icon: 'beneficiaries', tone: 'bg-donor-light text-donor-dark' },
    { key: 'barangays', label: 'Barangays covered', value: `${barangayList.length} / 22`, icon: 'barangay', tone: 'bg-beneficiary-light text-beneficiary-dark' },
  ]

   return (
    <>
      <div className="mb-6 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <h1 className="text-xl font-bold text-admin-dark">Administrator dashboard</h1>
        <p className="mt-1 text-xs text-faint">DSWD / LGU staff view · live overview of relief operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((s) => (
          <button key={s.key} onClick={() => togglePanel(s.key)} className="text-left">
            <Card className={`p-5 transition hover:border-admin ${openPanel === s.key ? 'border-admin' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-faint">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold text-ink">{loading ? '…' : s.value}</div>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.tone}`}>
                  <Icon path={icons[s.icon]} className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3 text-[10px] font-semibold text-admin-dark">
                {openPanel === s.key ? 'Hide details ▲' : 'View details ▼'}
              </div>
            </Card>
          </button>
        ))}
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
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <Icon path={icons.barangay} className="h-4 w-4 text-admin-dark" />
          Barangay aid map — Manolo Fortich, Bukidnon
        </div>
        <BarangayMap height="320px" />
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-faint">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#888780' }} /> No activity</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#639922' }} /> Has donations</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#E8A33D' }} /> Partially served</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#4A7A2E' }} /> Fully served</span>
        </div>
        <p className="mt-2 text-[11px] text-faint">Tap a pin to see registered households, donations, and how many households have received aid so far.</p>
      </Card>
    </>
  )
}