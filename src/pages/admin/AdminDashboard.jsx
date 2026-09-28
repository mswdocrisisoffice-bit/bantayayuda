import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import BarangayMap, { BARANGAY_POSITIONS } from '../../components/ui/BarangayMap.jsx'
import { supabase } from '../../lib/supabase.js'
import { DateRangeFilter, DonationBox, inDates, formatDateTime } from './DonationsTab.jsx'
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
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
}

const TABS = [
  { label: 'Overview', to: '/admin/dashboard', icon: 'overview' },
  { label: 'Donations', to: '/admin/donations', icon: 'donations' },
  { label: 'Beneficiary registry', to: '/admin/beneficiaries', icon: 'beneficiaries' },
  {
    label: 'Record distribution',
    to: '/admin/distribution',
    icon: 'distribution',
    children: [
      { label: 'Register new family', to: '/admin/distribution?mode=new' },
      { label: 'Existing beneficiary', to: '/admin/distribution?mode=existing' },
    ],
  },
  { label: 'Inventory', to: '/admin/inventory', icon: 'inventory' },
  { label: 'Reports', to: '/admin/reports', icon: 'reports' },
  { label: 'Report generator', to: '/admin/report-generator', icon: 'generator' },
  { label: 'Archive', to: '/admin/archive', icon: 'archive' },
]

export function AdminTabs({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [openMenu, setOpenMenu] = useState(null)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const groups = [
    { title: null, items: [TABS[0]] },
    { title: 'Operations', items: [TABS[2], TABS[3]] },
    { title: 'Data & Reports', items: [TABS[1], TABS[4], TABS[5], TABS[6]] },
    { title: null, items: [TABS[7]] },
  ]

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-navy text-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen
          ${collapsed ? 'w-[72px]' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <Link
          to="/admin/dashboard"
          className="flex items-center gap-3 border-b border-white/10 px-4 py-4"
          onClick={() => setMobileOpen(false)}
        >
          <img src={bantayayudaSeal} alt="BantayAyuda seal" className="h-10 w-10 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-base font-bold leading-tight tracking-tight">BantayAyuda</div>
              <div className="truncate text-[10px] text-white/60">Manolo Fortich</div>
            </div>
          )}
        </Link>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4">
          {groups.map((g, i) => (
            <div key={i}>
              {g.title && !collapsed && (
                <div className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                  {g.title}
                </div>
              )}
              <div className="space-y-0.5">
                {g.items.map((t) => {
                  const active = pathname === t.to
                  const hasChildren = !!t.children

                  if (hasChildren && !collapsed) {
                    const isOpen = openMenu === t.to || active
                    return (
                      <div key={t.to}>
                        <button
                          onClick={() => setOpenMenu((m) => (m === t.to ? null : t.to))}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-xs font-bold transition-colors ${
                            active ? 'bg-admin text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon path={icons[t.icon]} className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate text-left">{t.label}</span>
                          <Icon
                            path={isOpen ? icons.chevronDown : icons.chevronRight}
                            className="h-3.5 w-3.5 shrink-0 opacity-70"
                          />
                        </button>
                        {isOpen && (
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2.5">
                            {t.children.map((c) => {
                              const childActive = pathname + search === c.to
                              return (
                                <Link
                                  key={c.to}
                                  to={c.to}
                                  onClick={() => setMobileOpen(false)}
                                  className={`block rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors ${
                                    childActive ? 'bg-white/15 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  {c.label}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={t.to}
                      to={t.to}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? t.label : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-xs font-bold transition-colors ${
                        active ? 'bg-admin text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      <Icon path={icons[t.icon]} className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{t.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 px-2.5 py-3">
          {!collapsed && (
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-admin/90 px-3 py-1.5 text-[11px] font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Administrator
            </span>
          )}
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : ''}`}
          >
            <Icon path={icons.logout} className="h-4 w-4 shrink-0" />
            {!collapsed && 'Log out'}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden w-full items-center justify-center rounded-lg px-2.5 py-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:flex"
          >
            <Icon path={collapsed ? icons.chevronRight : icons.chevronLeft} className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Barangay + household helpers
   ───────────────────────────────────────────────────────────── */

/* "Brgy. Alae", "alae", "ALAE" and "Sto. Niño"/"Santo Nino" all become the same key */
function normKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(brgy|barangay)\.?\s*/, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^sto/, 'santo')
}

/* true when the two strings differ by at most one inserted / deleted / changed letter */
function withinOneEdit(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/* Display-only cleanup: "alae" -> "Alae" */
function tidy(text) {
  return String(text || '')
    .split(' ')
    .map((w) =>
      w.replace(/[^a-z]/gi, '').length > 2 && w === w.toLowerCase()
        ? w.charAt(0).toUpperCase() + w.slice(1)
        : w
    )
    .join(' ')
}

const OFFICIAL_KEYS = BARANGAY_POSITIONS.map((b) => ({ name: b.name, key: normKey(b.name) }))

/* Map whatever was typed to one of the 22 official barangays (case, "Brgy." prefix and
   one-letter typos such as "Matibugao" -> "Mantibugao" are forgiven). */
function canonicalBarangay(raw) {
  const key = normKey(raw)
  if (!key) return { key: 'unspecified', label: 'No barangay recorded', official: false }

  const exact = OFFICIAL_KEYS.find((o) => o.key === key)
  if (exact) return { key: exact.key, label: exact.name, official: true }

  if (key.length >= 5) {
    const near = OFFICIAL_KEYS.find((o) => o.key.length >= 5 && withinOneEdit(o.key, key))
    if (near) return { key: near.key, label: near.name, official: true }
  }

  return {
    key,
    label: tidy(String(raw).replace(/^\s*(brgy|barangay)\.?\s*/i, '').trim()),
    official: false,
  }
}

/* One list of households: the beneficiary registry PLUS families that only exist in
   distribution records (e.g. registered through "Record distribution"), merged by
   serial number or name so nobody is counted twice. */
function buildHouseholds(beneficiaries, distributions) {
  const list = []
  const bySerial = new Map()
  const byName = new Map()
  const nameKey = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')

  function add({ serial, name, barangay, createdAt, fromRegistry, id }) {
    const serialClean = serial ? String(serial).trim() : ''
    const nKey = nameKey(name)

    let h =
      (serialClean && bySerial.get(serialClean)) ||
      (nKey && byName.get(nKey)) ||
      null

    if (!h) {
      h = { id: serialClean || nKey || id, name: '', serial: '', barangay: '', latest: '', registered: false, items: 0 }
      list.push(h)
    }
    if (name && (!h.name || fromRegistry)) h.name = name
    if (serialClean && !h.serial) h.serial = serialClean
    if (barangay && !h.barangay) h.barangay = barangay
    if (fromRegistry) h.registered = true
    if (createdAt && (!h.latest || new Date(createdAt) > new Date(h.latest))) h.latest = createdAt

    if (serialClean) bySerial.set(serialClean, h)
    if (nKey) byName.set(nKey, h)
    return h
  }

  beneficiaries.forEach((b) =>
    add({
      serial: b.serial_number,
      name: b.full_name || b.household_head,
      barangay: b.barangay,
      createdAt: b.created_at,
      fromRegistry: true,
      id: b.id,
    })
  )

  distributions.forEach((d) => {
    if (!d.serial_number && !d.household_head) return
    const h = add({
      serial: d.serial_number,
      name: d.household_head,
      barangay: d.barangay,
      createdAt: d.created_at,
      fromRegistry: false,
      id: d.id,
    })
    h.items += 1
  })

  return list.sort((a, b) => new Date(b.latest || 0) - new Date(a.latest || 0))
}

export default function AdminDashboard() {
  const [donations, setDonations] = useState([])
  const [beneficiaries, setBeneficiaries] = useState([])
  const [distributions, setDistributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [mapKey, setMapKey] = useState(0) // bump to reload the map's own data
  const [openPanel, setOpenPanel] = useState(null) // 'donations' | 'beneficiaries' | 'barangays' | null

  // "All donations" panel state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [openDonationId, setOpenDonationId] = useState(null)

  const loadStats = useCallback(async () => {
    const [donationsRes, beneficiariesRes, distributionsRes] = await Promise.all([
      supabase.from('donations').select('*').neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('beneficiaries').select('*').order('created_at', { ascending: false }),
      supabase.from('distributions').select('*').order('created_at', { ascending: false }),
    ])
    setDonations(donationsRes.data || [])
    setBeneficiaries(beneficiariesRes.data || [])
    setDistributions(distributionsRes.data || [])
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  /* Load on open, then keep numbers fresh: every 30s, and whenever the tab is focused again */
  useEffect(() => {
    loadStats()
    const timer = setInterval(loadStats, 30000)
    const onFocus = () => loadStats()
    const onVisible = () => { if (document.visibilityState === 'visible') loadStats() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadStats])

  function refreshNow() {
    loadStats()
    setMapKey((k) => k + 1)
  }

  const households = useMemo(
    () => buildHouseholds(beneficiaries, distributions),
    [beneficiaries, distributions]
  )

  /* One card per barangay, however it was typed (Alae = alae = Brgy. ALAE) */
  const barangayCards = useMemo(() => {
    const map = {}
    function ensure(raw) {
      const c = canonicalBarangay(raw)
      if (!map[c.key]) map[c.key] = { ...c, donations: 0, households: 0, aided: 0 }
      return map[c.key]
    }
    donations.forEach((d) => { ensure(d.barangay).donations += 1 })
    households.forEach((h) => {
      const r = ensure(h.barangay)
      r.households += 1
      if (h.items > 0) r.aided += 1
    })
    return Object.values(map).sort(
      (a, b) =>
        Number(b.official) - Number(a.official) ||
        b.donations + b.households - (a.donations + a.households) ||
        a.label.localeCompare(b.label)
    )
  }, [donations, households])

  const coveredCount = barangayCards.filter((c) => c.official).length
  const unofficialCards = barangayCards.filter((c) => !c.official && c.key !== 'unspecified')

  const visibleDonations = useMemo(
    () => donations.filter((d) => inDates(d.created_at, dateFrom, dateTo)),
    [donations, dateFrom, dateTo]
  )

  function togglePanel(panel) {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  const confirmedCount = donations.filter((d) => d.status === 'confirmed').length
  const aidedHouseholds = households.filter((h) => h.items > 0).length
  const coveragePct = Math.min(100, Math.round((coveredCount / 22) * 100))

  const statCards = [
    {
      key: 'donations', label: 'Total donations recorded', value: donations.length,
      sub: `${confirmedCount} confirmed`, icon: 'donations',
      accent: '#A32D2D', tone: 'bg-admin-light text-admin-dark',
    },
    {
      key: 'beneficiaries', label: 'Registered beneficiary households', value: households.length,
      sub: `${aidedHouseholds} given aid`, icon: 'beneficiaries',
      accent: '#4A7A2E', tone: 'bg-donor-light text-donor-dark',
    },
    {
      key: 'barangays', label: 'Barangays covered', value: `${coveredCount} / 22`,
      sub: `${coveragePct}% of Manolo Fortich`, icon: 'barangay', progress: coveragePct,
      accent: '#2563A8', tone: 'bg-beneficiary-light text-beneficiary-dark',
    },
  ]

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      {/* ── Banner ── */}
      <div className="relative mb-6 overflow-hidden rounded-card bg-gradient-to-r from-admin-dark to-admin p-6 text-white shadow-[0_4px_14px_rgba(0,0,0,0.2)]">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-28 h-44 w-44 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={bantayayudaSeal} alt="" className="h-14 w-14 shrink-0 rounded-full bg-white/90 p-1" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                {greeting} · {dateLabel}
              </div>
              <h1 className="text-xl font-bold leading-tight">Administrator dashboard</h1>
              <p className="mt-0.5 text-xs text-white/75">DSWD / LGU staff view · live overview of relief operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-300" />
              Live
              {lastUpdated && (
                <span className="font-normal text-white/75">
                  · {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </span>
            <button
              onClick={refreshNow}
              className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-admin-dark shadow-sm transition hover:bg-white/90"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((s) => (
          <button key={s.key} onClick={() => togglePanel(s.key)} className="group text-left">
            <div
              className={`relative h-full overflow-hidden rounded-card bg-white p-5 pt-6 shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.16)] ${
                openPanel === s.key ? 'ring-2 ring-admin/50' : ''
              }`}
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: s.accent }} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-faint">{s.label}</div>
                  <div className="mt-1 text-3xl font-bold leading-none text-ink">{loading ? '…' : s.value}</div>
                  <div className="mt-2 text-[11px] font-semibold" style={{ color: s.accent }}>
                    {loading ? '' : s.sub}
                  </div>
                </div>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${s.tone}`}>
                  <Icon path={icons[s.icon]} className="h-5 w-5" />
                </div>
              </div>

              {s.progress != null && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <div className="h-full rounded-full transition-all" style={{ width: `${s.progress}%`, background: s.accent }} />
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-admin-dark">
                <span>{openPanel === s.key ? 'Hide details' : 'View details'}</span>
                <span>{openPanel === s.key ? '▲' : '▼'}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── All donations: compact boxes with date & time, calendar filter ── */}
      {openPanel === 'donations' && (
        <Card className="mt-4 p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">All donations</h2>
          {donations.length === 0 && <p className="text-xs text-faint">No donations recorded yet.</p>}

          {donations.length > 0 && (
            <>
              <DateRangeFilter
                donations={donations}
                dateFrom={dateFrom}
                dateTo={dateTo}
                setDateFrom={setDateFrom}
                setDateTo={setDateTo}
                shown={visibleDonations.length}
              />
              {visibleDonations.length === 0 && (
                <p className="text-xs text-faint">No donations in this period.</p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleDonations.map((d) => (
                  <DonationBox
                    key={d.id}
                    d={d}
                    isOpen={openDonationId === d.id}
                    onToggle={() => setOpenDonationId((cur) => (cur === d.id ? null : d.id))}
                  />
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Registered households: registry + families registered through distribution ── */}
      {openPanel === 'beneficiaries' && (
        <Card className="mt-4 p-5">
          <h2 className="mb-1 text-sm font-bold text-ink">Registered beneficiary households</h2>
          <p className="mb-3 text-[11px] text-faint">
            Includes families registered in the Beneficiary registry and those added through Record distribution.
          </p>
          {households.length === 0 && <p className="text-xs text-faint">No beneficiaries registered yet.</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {households.map((h) => (
              <div
                key={h.id}
                className="rounded-card border-t-4 bg-white p-3 shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                style={{ borderTopColor: '#4A7A2E' }}
              >
                <div className="truncate text-sm font-bold text-ink">{tidy(h.name) || 'Unnamed household'}</div>
                <div className="truncate text-[11px] text-faint">
                  Brgy. {canonicalBarangay(h.barangay).label}
                  {h.latest ? ` · ${formatDateTime(h.latest)}` : ''}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {h.serial ? (
                    <span className="rounded bg-admin-light px-2 py-1 font-mono text-[10px] font-bold text-admin-dark">
                      {h.serial}
                    </span>
                  ) : (
                    <span className="text-[10px] text-faint">No serial yet</span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      h.items > 0 ? 'bg-beneficiary-light text-beneficiary-dark' : 'bg-line-soft text-muted'
                    }`}
                  >
                    {h.items > 0 ? `${h.items} item${h.items === 1 ? '' : 's'} received` : 'No aid yet'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Barangay coverage: one card per barangay ── */}
      {openPanel === 'barangays' && (
        <Card className="mt-4 p-5">
          <h2 className="mb-1 text-sm font-bold text-ink">Barangays with recorded activity</h2>
          <p className="mb-3 text-[11px] text-faint">
            {coveredCount} of 22 official barangays. Different spellings of the same barangay are combined.
          </p>

          {unofficialCards.length > 0 && (
            <div className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-[11px] text-warn-text">
              ⚠ {unofficialCards.map((c) => c.label).join(', ')}{' '}
              {unofficialCards.length === 1 ? "isn't" : "aren't"} in the official list of 22 barangays. Possible spelling
              differences, so counted separately and not included in {coveredCount} / 22.
            </div>
          )}

          {barangayCards.length === 0 && <p className="text-xs text-faint">No barangays recorded yet.</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {barangayCards.map((c) => (
              <div
                key={c.key}
                className="overflow-hidden rounded-card border-t-4 bg-white p-3 shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                style={{ borderTopColor: c.official ? '#4A7A2E' : '#E8A33D' }}
              >
                <div className="text-sm font-bold leading-tight text-ink">
                  {c.official ? `Brgy. ${c.label}` : c.label}
                </div>
                {!c.official && c.key !== 'unspecified' && (
                  <div className="mt-0.5 text-[10px] font-semibold text-warn-text">⚠ Not in official list</div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-donor-light p-2 text-center">
                    <div className="text-xl font-bold leading-none text-donor-dark">{c.donations}</div>
                    <div className="mt-1 text-[10px] font-semibold text-muted">donations</div>
                  </div>
                  <div className="rounded-lg bg-beneficiary-light p-2 text-center">
                    <div className="text-xl font-bold leading-none text-beneficiary-dark">{c.households}</div>
                    <div className="mt-1 text-[10px] font-semibold text-muted">households</div>
                  </div>
                </div>
                {c.households > 0 && (
                  <div className="mt-2 text-center text-[10px] text-faint">
                    {c.aided} of {c.households} given aid
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center gap-2.5 text-sm font-bold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-light text-admin-dark">
            <Icon path={icons.barangay} className="h-4 w-4" />
          </span>
          Barangay aid map — Manolo Fortich, Bukidnon
        </div>
        <BarangayMap key={mapKey} height="320px" />
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