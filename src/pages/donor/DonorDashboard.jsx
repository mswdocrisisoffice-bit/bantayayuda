import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Badge from '../../components/ui/Badge.jsx'
import BarangayMap from '../../components/ui/BarangayMap.jsx'
import { supabase } from '../../lib/supabase.js'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  gift: <><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1.5 0-4-1-4-3.2A2.3 2.3 0 0 1 10.3 2 3 3 0 0 1 12 3" /><path d="M12 7c1.5 0 4-1 4-3.2A2.3 2.3 0 0 0 13.7 2 3 3 0 0 0 12 3" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></>,
  pin: <><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  heart: <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />,
}

const GREEN = '#4d7c0f'

/* Category colors (custom categories get a stable color from their name) */
const CATEGORY_COLORS = {
  'Food & Nutrition':              { bg: '#FFF4E5', accent: '#D97706' },
  'Hygiene & Personal Care':       { bg: '#E8F3FD', accent: '#2563A8' },
  'Medical & Health Supplies':     { bg: '#FDECEC', accent: '#C0392B' },
  'Clothing & Linens':             { bg: '#F3ECFB', accent: '#7C3AED' },
  'Shelter & Survival Gear':       { bg: '#E9F6EC', accent: '#2F855A' },
  'Education & Child Development': { bg: '#E6F7F6', accent: '#0F8B8D' },
}
const EXTRA_COLORS = [
  { bg: '#EEF2FF', accent: '#4F46E5' },
  { bg: '#FDF2F8', accent: '#DB2777' },
  { bg: '#ECFEFF', accent: '#0E7490' },
  { bg: '#FEFCE8', accent: '#A16207' },
]
const FALLBACK = { bg: '#EEF1F4', accent: '#4A5568' }

function categoryColor(category) {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]
  if (!category) return FALLBACK
  let h = 0
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return EXTRA_COLORS[h % EXTRA_COLORS.length]
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtQty(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const DIST_STYLES = {
  full: { label: 'Distributed', bg: '#E9F6EC', color: '#2F855A' },
  partial: { label: 'Partially distributed', bg: '#FFF4E5', color: '#B45309' },
  none: { label: 'Not yet distributed', bg: '#EEF1F4', color: '#4A5568' },
}

function DistPill({ info }) {
  if (!info) return null
  const st = DIST_STYLES[info.status]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: st.bg, color: st.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
      {st.label}
    </span>
  )
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'map', label: 'Map', icon: 'map' },
  { key: 'history', label: 'History', icon: 'clock' },
]

export default function DonorDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [dist, setDist] = useState({}) // donation_id -> list of distributions that came from it
  const [distReady, setDistReady] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: u } = await supabase.auth.getUser()
      const user = u?.user
      if (!user) {
        setLoading(false)
        return
      }
      setEmail(user.email || '')

      const [{ data: profile }, { data: rows }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase
          .from('donations')
          .select('*')
          .eq('donor_id', user.id)
          .neq('status', 'archived')
          .order('created_at', { ascending: false }),
      ])
      setFullName(profile?.full_name || '')
      setDonations(rows || [])

      // Who received each donation (names are masked on the database side)
      const { data: dRows, error: dErr } = await supabase.rpc('donor_donation_distribution')
      if (!dErr) {
        const map = {}
        ;(dRows || []).forEach((r) => {
          ;(map[r.donation_id] = map[r.donation_id] || []).push(r)
        })
        setDist(map)
        setDistReady(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/donor/login')
  }

  const displayName = fullName || (email ? email.split('@')[0] : 'Donor')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  function distInfo(d) {
    if (!distReady) return null
    const rows = dist[d.id] || []
    const given = rows.reduce((sum, r) => sum + Number(r.qty || 0), 0)
    const total = Number(d.quantity) || 0
    const status = given <= 0 ? 'none' : given + 0.0001 >= total ? 'full' : 'partial'
    return { rows, given, total, status }
  }

  const stats = useMemo(() => {
    const confirmed = donations.filter((d) => d.status === 'confirmed').length
    const distributed = distReady ? donations.filter((d) => distInfo(d)?.status === 'full').length : 0
    const barangays = new Set(donations.map((d) => (d.barangay || '').trim().toLowerCase()).filter(Boolean))

    const byBarangay = {}
    const byCategory = {}
    donations.forEach((d) => {
      const b = (d.barangay || 'Unknown').trim()
      ;(byBarangay[b] = byBarangay[b] || { name: b, count: 0, items: [] })
      byBarangay[b].count += 1
      if (d.item && !byBarangay[b].items.includes(d.item)) byBarangay[b].items.push(d.item)

      const c = d.category || 'Uncategorized'
      byCategory[c] = (byCategory[c] || 0) + 1
    })

    return {
      total: donations.length,
      confirmed,
      distributed,
      barangayCount: barangays.size,
      last: donations[0]?.created_at,
      byBarangay: Object.values(byBarangay).sort((a, b) => b.count - a.count),
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    }
  }, [donations, dist, distReady])

  const categoryChips = useMemo(() => stats.byCategory.map(([c]) => c), [stats])

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase()
    return donations.filter((d) => {
      if (catFilter !== 'All' && (d.category || 'Uncategorized') !== catFilter) return false
      if (!q) return true
      return (
        (d.item || '').toLowerCase().includes(q) ||
        (d.barangay || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      )
    })
  }, [donations, search, catFilter])

  const statCards = [
    { label: 'Total donations', value: stats.total, icon: 'gift', accent: GREEN },
    distReady
      ? { label: 'Given to families', value: `${stats.distributed} / ${stats.total}`, icon: 'check', accent: '#2f855a' }
      : { label: 'Confirmed', value: stats.confirmed, icon: 'check', accent: '#2f855a' },
    { label: 'Barangays helped', value: `${stats.barangayCount} / 22`, icon: 'pin', accent: '#1d5fa8' },
    { label: 'Last donation', value: stats.last ? fmtDate(stats.last) : '—', icon: 'clock', accent: '#0e7490', small: true },
  ]

  return (
    <div className="min-h-screen bg-cream pb-12">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0f3a6b] via-[#0b2545] to-[#081a31] px-4 pb-16 pt-8 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#1d5fa8]/25" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-[#4d7c0f]/20" />

        <div className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={displayName} size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/70">{greeting}</p>
              <h1 className="truncate text-2xl font-extrabold capitalize sm:text-3xl">{displayName}</h1>
              <p className="truncate text-xs text-white/60">{email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10"
          >
            Log out
          </button>
        </div>

        <p className="relative mx-auto mt-6 flex max-w-5xl items-center gap-2 text-sm text-white/80">
          <Icon path={icons.heart} className="h-4 w-4 text-[#9ccc4a]" />
          Thank you for helping families across Manolo Fortich.
        </p>
      </header>

      <div className="relative z-10 mx-auto -mt-9 max-w-5xl px-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label} className="p-5 shadow-lg" style={{ borderTop: `4px solid ${s.accent}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-faint">{s.label}</div>
                  <div className={`mt-1 truncate font-extrabold text-ink ${s.small ? 'text-lg' : 'text-2xl'}`}>
                    {loading ? '…' : s.value}
                  </div>
                </div>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5"
                  style={{ color: s.accent }}
                >
                  <Icon path={icons[s.icon]} className="h-5 w-5" />
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active ? 'text-white shadow' : 'text-muted hover:bg-black/5'
                }`}
                style={active ? { background: GREEN } : undefined}
              >
                <Icon path={icons[t.icon]} className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ───────── Overview ───────── */}
        {tab === 'overview' && (
          <div className="mt-5 space-y-5">
            {!loading && donations.length === 0 && (
              <Card className="flex flex-col items-center gap-2 p-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-faint">
                  <Icon path={icons.gift} className="h-6 w-6" />
                </span>
                <p className="text-sm font-bold text-ink">No donations on your record yet</p>
                <p className="text-xs text-faint">
                  Once the MSWDO staff records a donation under your account, it will appear here.
                </p>
              </Card>
            )}

            {donations.length > 0 && (
              <>
                {/* Recent donations */}
                <Card className="overflow-hidden p-0">
                  <div className="flex items-center justify-between border-b border-line-soft bg-line-soft/40 px-6 py-4">
                    <h2 className="text-sm font-bold text-ink">Your recent donations</h2>
                    {donations.length > 5 && (
                      <button
                        onClick={() => setTab('history')}
                        className="text-xs font-bold hover:underline"
                        style={{ color: GREEN }}
                      >
                        View all {donations.length} →
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    {donations.slice(0, 5).map((d) => {
                      const c = categoryColor(d.category)
                      return (
                        <div
                          key={d.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft px-4 py-3 transition hover:bg-line-soft/30"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                              style={{ background: c.bg, color: c.accent }}
                            >
                              <Icon path={icons.gift} className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-ink">{d.item}</div>
                              <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-faint">
                                <span className="inline-flex items-center gap-1">
                                  <Icon path={icons.pin} className="h-3 w-3" />
                                  Brgy. {d.barangay || '—'}
                                </span>
                                <span>{fmtDate(d.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <DistPill info={distInfo(d)} />
                            <span
                              className="rounded-lg px-3 py-1.5 text-xs font-bold"
                              style={{ background: c.bg, color: c.accent }}
                            >
                              {d.quantity} {d.unit || ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Where it went */}
                  <Card className="p-6">
                    <h2 className="text-sm font-bold text-ink">Where your donations went</h2>
                    <p className="mb-4 text-xs text-faint">
                      {stats.barangayCount} barangay{stats.barangayCount === 1 ? '' : 's'} reached so far
                    </p>
                    <div className="space-y-3">
                      {stats.byBarangay.slice(0, 6).map((b) => (
                        <div key={b.name}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink">Brgy. {b.name}</span>
                            <span className="text-faint">
                              {b.count} donation{b.count === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-black/5">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(8, (b.count / stats.byBarangay[0].count) * 100)}%`,
                                background: GREEN,
                              }}
                            />
                          </div>
                          <div className="mt-1 truncate text-[11px] text-faint">
                            {b.items.slice(0, 3).join(', ')}{b.items.length > 3 ? ` +${b.items.length - 3} more` : ''}
                          </div>
                        </div>
                      ))}
                      {stats.byBarangay.length > 6 && (
                        <p className="text-[11px] text-faint">+{stats.byBarangay.length - 6} more barangays</p>
                      )}
                    </div>
                  </Card>

                  {/* What you gave */}
                  <Card className="p-6">
                    <h2 className="text-sm font-bold text-ink">What you gave</h2>
                    <p className="mb-4 text-xs text-faint">Your donations by category</p>
                    <div className="space-y-3">
                      {stats.byCategory.map(([name, count]) => {
                        const c = categoryColor(name)
                        return (
                          <div key={name}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-semibold text-ink">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.accent }} />
                                {name}
                              </span>
                              <span className="text-faint">{count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full" style={{ background: c.bg }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(8, (count / stats.byCategory[0][1]) * 100)}%`,
                                  background: c.accent,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────── Map ───────── */}
        {tab === 'map' && (
          <Card className="mt-5 overflow-hidden p-0">
            <div className="border-b border-line-soft bg-line-soft/40 px-6 py-4">
              <h2 className="text-sm font-bold text-ink">Coverage map</h2>
              <p className="text-xs text-faint">Manolo Fortich, Bukidnon — 22 barangays</p>
            </div>
            <div className="p-4">
              <BarangayMap height="420px" />
            </div>
          </Card>
        )}

        {/* ───────── History ───────── */}
        {tab === 'history' && (
          <div className="mt-5">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
                <Icon path={icons.search} className="h-4 w-4" />
              </span>
              <input
                placeholder="Search by item, barangay, or category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-[#4d7c0f] focus:ring-2 focus:ring-[#4d7c0f]/20"
              />
            </div>

            {categoryChips.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {['All', ...categoryChips].map((c) => {
                  const active = catFilter === c
                  const col = c === 'All' ? { accent: GREEN, bg: '#ECF3DF' } : categoryColor(c)
                  return (
                    <button
                      key={c}
                      onClick={() => setCatFilter(c)}
                      className="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
                      style={
                        active
                          ? { background: col.accent, borderColor: col.accent, color: '#fff' }
                          : { background: col.bg, borderColor: col.bg, color: col.accent }
                      }
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            )}

            <p className="mt-3 text-[11px] font-semibold text-faint">
              Showing {filteredHistory.length} of {donations.length}
            </p>

            {!loading && filteredHistory.length === 0 && (
              <Card className="mt-3 p-8 text-center text-sm text-faint">
                {donations.length === 0 ? 'No donations on your record yet.' : 'No donations match your search.'}
              </Card>
            )}

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {filteredHistory.map((d) => {
                const c = categoryColor(d.category)
                return (
                  <Card key={d.id} className="p-5" style={{ borderTop: `4px solid ${c.accent}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: c.bg, color: c.accent }}
                        >
                          <Icon path={icons.gift} className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-ink">{d.item}</div>
                          <div className="text-sm font-bold" style={{ color: c.accent }}>
                            {d.quantity} {d.unit || ''}
                          </div>
                        </div>
                      </div>
                      {distReady ? (
                        <DistPill info={distInfo(d)} />
                      ) : (
                        <Badge tone={d.status === 'confirmed' ? 'confirmed' : 'pending'}>{d.status}</Badge>
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-line-soft pt-3 text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <Icon path={icons.pin} className="h-3.5 w-3.5 text-faint" />
                        Brgy. {d.barangay || '—'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon path={icons.clock} className="h-3.5 w-3.5 text-faint" />
                        {fmtDateTime(d.created_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon path={icons.user} className="h-3.5 w-3.5 text-faint" />
                        Donated as {d.donor_name || displayName}
                        {d.recorded_by ? <span className="text-faint"> · recorded by {d.recorded_by}</span> : null}
                      </div>
                    </div>

                    {(() => {
                      const info = distInfo(d)
                      if (!info) return null
                      if (info.status === 'none') {
                        return (
                          <p className="mt-3 rounded-lg bg-black/[0.03] px-3 py-2 text-xs text-muted">
                            Waiting to be given to a registered household.
                          </p>
                        )
                      }
                      return (
                        <div className="mt-3 rounded-xl bg-[#ECF3DF] p-3">
                          <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[#2f855a]">
                            <span>Given to</span>
                            <span>{fmtQty(info.given)} of {fmtQty(info.total)} {d.unit || ''}</span>
                          </div>
                          <div className="space-y-2">
                            {info.rows.slice(0, 6).map((r, i) => (
                              <div key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <div className="font-semibold text-ink">
                                    Household {r.recipient_name || ''}
                                  </div>
                                  <div className="text-faint">
                                    Brgy. {r.barangay || '—'} · {fmtDateTime(r.distributed_at)}
                                  </div>
                                </div>
                                <span className="font-bold text-[#2f855a]">
                                  {fmtQty(r.qty)} {d.unit || ''}
                                </span>
                              </div>
                            ))}
                            {info.rows.length > 6 && (
                              <p className="text-[11px] text-faint">+{info.rows.length - 6} more households</p>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {d.description && (
                      <div className="mt-3 rounded-lg bg-black/[0.03] px-3 py-2 text-xs italic text-muted">
                        "{d.description}"
                      </div>
                    )}

                    {d.category && (
                      <div className="mt-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: c.bg, color: c.accent }}
                        >
                          {d.category}
                        </span>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}