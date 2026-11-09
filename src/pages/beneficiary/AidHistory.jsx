import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { supabase } from '../../lib/supabase.js'
import { fetchBeneficiaryAid } from '../../lib/beneficiaryAid.js'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6h18v-6h-5l-1 2h-6l-1-2z" /></>,
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.2-3 4" /><path d="M12 17h.01" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
}

const ACCENTS = ['#1d5fa8', '#2f855a', '#0e7490', '#b7791f']

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AidHistory() {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/beneficiary/login')
  }

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) { setLoading(false); return }

      // `distributions` rows aren't always tagged with household_id — the
      // shared helper matches on every identifier this household has on file
      // (household head and contact numbers) and merges the results.
      const { data: beneficiary } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle()

      const combined = await fetchBeneficiaryAid(userData.user.id, beneficiary)
      setRecords(combined)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = records.filter((r) =>
    r.item?.toLowerCase().includes(search.toLowerCase())
  )

  const lastDate = records[0]?.created_at ? fmtDate(records[0].created_at) : '—'

  const navItem = (active) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
      active ? 'bg-[#1d5fa8] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream">
      {/* Sidebar — desktop only. Phones use the bottom navigation below. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy text-white lg:flex">
        <Link to="/beneficiary/dashboard" className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold">BantayAyuda</div>
          <div className="text-xs text-white/60">Manolo Fortich</div>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link to="/beneficiary/dashboard" className={navItem(false)}>
            <Icon path={icons.home} className="h-4 w-4" /> Overview
          </Link>
          <Link to="/beneficiary/history" className={navItem(true)}>
            <Icon path={icons.history} className="h-4 w-4" /> Aid history
          </Link>
          <Link to="/beneficiary/dashboard?tab=profile" className={navItem(false)}>
            <Icon path={icons.user} className="h-4 w-4" /> My profile
          </Link>
          <Link to="/beneficiary/dashboard?tab=security" className={navItem(false)}>
            <Icon path={icons.lock} className="h-4 w-4" /> Security
          </Link>
          <Link to="/beneficiary/dashboard?tab=help" className={navItem(false)}>
            <Icon path={icons.help} className="h-4 w-4" /> Help &amp; guide
          </Link>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <span className="inline-block rounded-full bg-[#1d5fa8] px-3 py-1 text-xs font-bold">Beneficiary</span>
          <button onClick={handleLogout} className="mt-3 flex w-full items-center gap-3 px-1 py-2 text-sm font-semibold text-white/70 hover:text-white">
            <Icon path={icons.logout} className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="pb-28 lg:pl-64 lg:pb-10">
        <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-4 sm:pt-6">
          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e4a7a] to-[#0b2545] p-4 text-white shadow-lg sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#1d5fa8]/20" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon path={icons.history} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/75">Beneficiary · Aid history</p>
                  <h1 className="truncate text-lg font-extrabold sm:text-2xl">My aid history</h1>
                  <p className="text-xs text-white/70 sm:text-sm">
                    Every relief item you have received, confirmed with your e-signature.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/90">
                  <Icon path={icons.gift} className="h-3 w-3" />
                  {loading ? 'Loading…' : `${records.length} distribution${records.length === 1 ? '' : 's'}`}
                </span>
                {lastDate !== '—' && (
                  <span className="text-[10px] text-white/55">Last received {lastDate}</span>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
            <Card className="p-3 pt-4 sm:p-5" style={{ borderTop: '4px solid #1d5fa8' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold leading-tight text-faint sm:text-xs">Total distributions</div>
                  <div className="mt-1 text-lg font-bold text-ink sm:text-2xl">{loading ? '…' : records.length}</div>
                </div>
                <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 sm:flex" style={{ color: '#1d5fa8' }}>
                  <Icon path={icons.gift} className="h-5 w-5" />
                </div>
              </div>
            </Card>
            <Card className="p-3 pt-4 sm:p-5" style={{ borderTop: '4px solid #2f855a' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold leading-tight text-faint sm:text-xs">Last received</div>
                  <div className="mt-1 truncate text-sm font-bold text-ink sm:text-base">{loading ? '…' : lastDate}</div>
                </div>
                <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 sm:flex" style={{ color: '#2f855a' }}>
                  <Icon path={icons.calendar} className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card className="mt-4 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">All distributions</h2>
                <p className="text-xs text-faint">Search by item name</p>
              </div>
              <span className="rounded-full bg-beneficiary-light px-2.5 py-1 text-[10px] font-bold text-beneficiary-dark">
                {loading ? '…' : `${filtered.length} shown`}
              </span>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
                <Icon path={icons.search} className="h-4 w-4" />
              </span>
              <input
                placeholder="Search by item name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-base py-3 pl-10"
              />
            </div>
          </Card>

          {/* States */}
          {loading && (
            <Card className="mt-4 p-8 text-center text-sm text-faint">Loading…</Card>
          )}
          {!loading && filtered.length === 0 && (
            <Card className="mt-4 flex flex-col items-center gap-2 p-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-faint">
                <Icon path={icons.inbox} className="h-6 w-6" />
              </span>
              <p className="text-sm font-bold text-ink">
                {search ? 'No items match your search' : 'No distributions on record yet'}
              </p>
              <p className="text-xs text-faint">
                {search ? 'Try a different item name.' : 'Aid you receive will appear here once it is confirmed.'}
              </p>
            </Card>
          )}

          {/* Aid cards */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {filtered.map((r, i) => {
              const accent = ACCENTS[i % ACCENTS.length]
              return (
                <Card key={r.id} className="p-4 sm:p-5" style={{ borderTop: `4px solid ${accent}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5"
                        style={{ color: accent }}
                      >
                        <Icon path={icons.gift} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-base font-bold text-ink">{r.item}</div>
                        <div className="mt-0.5 text-sm font-semibold" style={{ color: accent }}>
                          {r.quantity} {r.unit || ''}
                        </div>
                      </div>
                    </div>
                    <Badge tone="confirmed">Confirmed</Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-line-soft pt-3 text-xs text-faint">
                    <Icon path={icons.calendar} className="h-3.5 w-3.5" />
                    {fmtDate(r.created_at)}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </main>

      {/* ── Phone bottom navigation ── */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Link
            to="/beneficiary/dashboard"
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold text-faint transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl">
              <Icon path={icons.home} className="h-5 w-5" />
            </span>
            <span className="truncate">Overview</span>
          </Link>

          <Link
            to="/beneficiary/history"
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold text-beneficiary transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-beneficiary-light">
              <Icon path={icons.history} className="h-5 w-5" />
            </span>
            <span className="truncate">History</span>
          </Link>

          <Link
            to="/beneficiary/dashboard?tab=profile"
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold text-faint transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl">
              <Icon path={icons.user} className="h-5 w-5" />
            </span>
            <span className="truncate">Profile</span>
          </Link>

          <Link
            to="/beneficiary/dashboard?tab=security"
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold text-faint transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl">
              <Icon path={icons.lock} className="h-5 w-5" />
            </span>
            <span className="truncate">Security</span>
          </Link>

          <Link
            to="/beneficiary/dashboard?tab=help"
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold text-faint transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl">
              <Icon path={icons.help} className="h-5 w-5" />
            </span>
            <span className="truncate">Help</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
