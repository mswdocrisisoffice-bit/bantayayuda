import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import BarangayMap from '../components/ui/BarangayMap.jsx'
import { supabase } from '../lib/supabase.js'
import bantayayudaSeal from '../assets/bantayayuda-seal.png'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  gift: <><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1.5 0-4-1-4-3.2A2.3 2.3 0 0 1 10.3 2 3 3 0 0 1 12 3" /><path d="M12 7c1.5 0 4-1 4-3.2A2.3 2.3 0 0 0 13.7 2 3 3 0 0 0 12 3" /></>,
  pin: <><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  donor: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  beneficiary: <><path d="M9 21H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 12v7a2 2 0 0 1-2 2h-4" /><path d="M9 21v-6h6v6" /></>,
  shield: <><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" /><path d="M9 12l2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  truck: <><path d="M1 6h13v10H1z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
}

const CATEGORY_ICONS = {
  'Medical & Health Supplies': 'gift',
  'Food & Nutrition': 'gift',
  'Hygiene & Personal Care': 'gift',
  'Clothing & Linens': 'gift',
  'Shelter & Survival Gear': 'box',
  'Education & Child Development': 'box',
}

const STEPS = [
  { icon: 'edit', title: 'Donation recorded', text: 'DSWD/LGU staff log every donation received.' },
  { icon: 'shield', title: 'Verified', text: 'The donor and items are checked before release.' },
  { icon: 'truck', title: 'Distributed', text: 'Goods reach registered households by barangay.' },
  { icon: 'check', title: 'Confirmed', text: 'Each family e-signs to confirm what they received.' },
]

const TRUST = [
  { icon: 'shield', label: 'Every aid e-signed' },
  { icon: 'pin', label: 'All 22 barangays' },
  { icon: 'lock', label: 'Donor privacy protected' },
]

/* Short, friendly age labels for the public feed. */
function timeAgo(iso) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fullDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function LandingPage() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [stats, setStats] = useState({ donations: null, households: null, served: null })

  useEffect(() => {
    let cancelled = false

    // Keep the feed defensive: archived entries never appear, and older
    // deployments without the archived_at column still render the feed.
    async function loadFeed() {
      const base = () =>
        supabase
          .from('donations')
          .select('*')
          .eq('status', 'confirmed')
          .eq('is_private', false)
          .order('created_at', { ascending: false })
          .limit(8)

      let { data, error } = await base().is('archived_at', null)
      if (error && /archived_at/i.test(error.message || '')) {
        ;({ data } = await base())
      }
      return data || []
    }

    async function load(silent = false) {
      if (silent) setRefreshing(true)
      else setLoading(true)

      const [rows, statsRes] = await Promise.all([
        loadFeed(),
        supabase.rpc('public_stats'),
      ])
      if (cancelled) return

      setFeed(rows)
      setLoading(false)
      setRefreshing(false)
      setUpdatedAt(new Date())

      // Public counts come from a database function that returns totals only (no personal data),
      // because visitors are not allowed to read the beneficiaries table directly.
      const row = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data
      if (!statsRes.error && row) {
        setStats({
          donations: Number(row.donations),
          households: Number(row.households),
          served: Number(row.served),
        })
      }
    }

    load()
    // New donations (and newly archived ones) show up without a manual reload.
    const timer = window.setInterval(() => load(true), 60000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const statTiles = [
    { label: 'Barangays covered', value: '22' },
    stats.donations != null && { label: 'Donations recorded', value: stats.donations },
    stats.households != null && { label: 'Households registered', value: stats.households },
    stats.served != null && { label: 'Households given aid', value: stats.served },
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f3a6b] via-[#0b2545] to-[#081a31] px-4 pb-20 pt-6 text-white sm:pb-24 sm:pt-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#1d5fa8]/25" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#2f855a]/15" />

        <div className="relative mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between gap-3 sm:mb-12">
            <div className="flex min-w-0 items-center gap-3">
              <img src={bantayayudaSeal} alt="BantayAyuda seal" className="h-12 w-12 shrink-0 sm:h-16 sm:w-16" />
              <div className="min-w-0">
                <div className="text-lg font-bold leading-tight">BantayAyuda</div>
                <div className="text-[11px] text-white/60">Manolo Fortich, Bukidnon</div>
              </div>
            </div>
            <Link
              to="/admin/login"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-white/85 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              <Icon path={icons.shield} className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Staff access</span><span className="sm:hidden">Staff</span>
            </Link>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
              Relief goods, tracked from donor to doorstep.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/75 sm:mt-4 sm:text-base">
              See where every donation goes. A transparent record of relief across all 22 barangays of Manolo Fortich,
              built for donors, beneficiaries, and DSWD/LGU staff.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">
              <Link
                to="/donor/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0b2545] shadow-lg transition-transform hover:-translate-y-0.5"
              >
                I want to donate
                <Icon path={icons.arrow} className="h-4 w-4" />
              </Link>
              <Link
                to="/beneficiary/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                I'm a beneficiary
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 sm:mt-8 sm:gap-x-6">
              {TRUST.map((t) => (
                <span key={t.label} className="inline-flex items-center gap-2 text-xs font-semibold text-white/75">
                  <Icon path={icons[t.icon]} className="h-4 w-4 text-white/60" />
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live stats — pulled up over the hero */}
      <div className="relative mx-auto -mt-12 max-w-5xl px-4">
        <div
          className="grid grid-cols-2 gap-3 sm:gap-4 md:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
          style={{ '--n': statTiles.length }}
        >
          {statTiles.map((s, i) => (
            <Card key={s.label} className={`p-4 text-center shadow-lg sm:p-5 ${statTiles.length % 2 === 1 && i === statTiles.length - 1 ? 'col-span-2 md:col-span-1' : ''}`} style={{ borderTop: `4px solid ${['#1d5fa8', '#2f855a', '#0e7490'][i % 3]}` }}>
              <div className="text-2xl font-extrabold text-ink sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs font-semibold text-faint">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-5xl px-4 pt-10 sm:pt-14">
        <h2 className="mb-1 text-xl font-bold text-ink">How a donation reaches a family</h2>
        <p className="mb-5 text-sm text-faint">Four steps, each one recorded and visible.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="relative p-4 sm:p-5">
              <span className="absolute right-4 top-3 text-3xl font-extrabold text-black/5">{i + 1}</span>
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-beneficiary-light text-beneficiary-dark">
                <Icon path={icons[s.icon]} className="h-5 w-5" />
              </span>
              <div className="text-sm font-bold text-ink">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-faint">{s.text}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent donations feed + community map */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <h2 className="mb-1 text-xl font-bold text-ink">Happening now</h2>
        <p className="mb-5 text-sm text-faint">Public donations and where aid has reached so far.</p>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <Card className="overflow-hidden p-0 lg:col-span-3">
            <div className="flex items-center justify-between border-b border-line-soft bg-line-soft/40 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-donor opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-donor" />
                </span>
                <h3 className="text-sm font-bold text-ink">Recent donations</h3>
              </div>
              <span className="text-[11px] font-semibold text-faint">
                {refreshing
                  ? 'Refreshing…'
                  : updatedAt
                    ? `Updated ${updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                    : ''}
              </span>
            </div>

            <div className="p-3 sm:p-4">
              <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-line-soft/50 px-3 py-2 text-[11px] leading-relaxed text-faint">
                <Icon path={icons.shield} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Only confirmed public donations are listed. Entries the MSWDO corrects or archives are removed from this feed automatically.
              </p>
              {loading && <p className="p-4 text-xs text-faint">Loading…</p>}
              {!loading && feed.length === 0 && (
                <div className="rounded-lg border border-dashed border-line-soft py-10 text-center">
                  <p className="text-sm text-faint">No public donations recorded yet.</p>
                  <p className="mt-1 text-xs text-faint">Entries appear here once an admin records and confirms them.</p>
                </div>
              )}

              <div className="space-y-2">
                {feed.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-soft px-3 py-3 transition-colors hover:bg-line-soft/30 sm:px-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-beneficiary-light text-beneficiary-dark">
                        <Icon path={icons[CATEGORY_ICONS[entry.category] || 'gift']} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold text-ink">
                          {entry.item}
                          {entry.quantity ? (
                            <span className="font-normal text-muted"> · {entry.quantity} {entry.unit || ''}</span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-faint">
                          <span>
                            Donated by <span className="font-semibold text-muted">{entry.donor_name || 'Anonymous'}</span>
                          </span>
                          {entry.barangay && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Brgy. {entry.barangay}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <time dateTime={entry.created_at} title={fullDate(entry.created_at)}>
                            {timeAgo(entry.created_at)}
                          </time>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {entry.category && <Badge tone="neutral">{entry.category}</Badge>}
                      <span className="inline-flex items-center gap-1 rounded-full bg-donor-light px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-donor-dark">
                        <Icon path={icons.check} className="h-3 w-3" />
                        Verified
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0 lg:col-span-2">
            <div className="border-b border-line-soft bg-line-soft/40 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-donor-light text-donor-dark">
                  <Icon path={icons.pin} className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-ink">Coverage map</h3>
              </div>
              <p className="mt-1 pl-10 text-xs text-faint">Manolo Fortich, Bukidnon — 22 barangays.</p>
            </div>
            <div className="p-3 sm:p-4">
              <BarangayMap height="300px" />
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-navy text-white/70">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <img src={bantayayudaSeal} alt="BantayAyuda seal" className="h-10 w-10 shrink-0" />
                <span className="text-base font-bold text-white">BantayAyuda</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                A transparent relief goods and distribution tracking system for Manolo Fortich, Bukidnon —
                connecting donors, beneficiaries, and DSWD/LGU staff.
              </p>
            </div>

            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-white">Quick links</div>
              <ul className="space-y-2 text-xs">
                <li><Link to="/donor/login" className="transition-colors hover:text-white">Donor login</Link></li>
                <li><Link to="/beneficiary/login" className="transition-colors hover:text-white">Beneficiary login</Link></li>
              </ul>
            </div>

            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-white">Contact</div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <Icon path={icons.pin} className="h-3.5 w-3.5 shrink-0" />
                  Municipal Social Welfare and Development Office, Manolo Fortich, Bukidnon
                </li>
                <li className="flex items-center gap-2">
                  <Icon path={icons.mail} className="h-3.5 w-3.5 shrink-0" />
                  mswdo@manolofortich.gov.ph
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-[11px] text-white/50">
          BantayAyuda · Relief goods and distribution tracking for Manolo Fortich, Bukidnon
        </div>
      </footer>
    </div>
  )
}