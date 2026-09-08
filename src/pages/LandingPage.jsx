import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
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
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2.1z" />,
}

const CATEGORY_ICONS = {
  'Medical & Health Supplies': 'gift',
  'Food & Nutrition': 'gift',
  'Hygiene & Personal Care': 'gift',
  'Clothing & Linens': 'gift',
  'Shelter & Survival Gear': 'box',
  'Education & Child Development': 'box',
}

export default function LandingPage() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'confirmed')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(8)

      setFeed(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-navy px-4 pb-16 pt-8 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={bantayayudaSeal} alt="BantayAyuda seal" className="h-20 w-20 shrink-0" />
              <div>
                <div className="text-lg font-bold leading-tight">BantayAyuda</div>
                <div className="text-[11px] text-white/60">Manolo Fortich, Bukidnon</div>
              </div>
            </div>
            <Link to="/admin/login" className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white">
              <Icon path={icons.shield} className="h-3.5 w-3.5" />
              Staff / Admin login
            </Link>
          </div>

          <div className="max-w-xl">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Relief goods, tracked from donor to doorstep.</h1>
            <p className="mt-3 text-sm text-white/70">
              A transparent record of relief donations and distribution across all 22 barangays of Manolo Fortich —
              built for donors, beneficiaries, and DSWD/LGU staff alike.
            </p>
          </div>
        </div>
      </div>

      {/* Role cards — pulled up over the hero */}
      <div className="mx-auto -mt-8 max-w-5xl px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer border-2 border-donor-border p-6 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-donor-light text-donor-dark">
              <Icon path={icons.donor} className="h-5 w-5" />
            </div>
            <div className="mb-1 text-lg font-bold text-ink">Donor</div>
            <div className="mb-3 text-xs text-faint">Individuals and organizations</div>
            <p className="mb-5 text-sm text-muted"> track exactly how relief reaches families in each barangay.</p>
            <Link to="/donor/login">
              <Button variant="donor">
                <span className="flex items-center justify-center gap-2">
                  Continue as donor
                  <Icon path={icons.arrow} className="h-4 w-4" />
                </span>
              </Button>
            </Link>
          </Card>

          <Card className="cursor-pointer border-2 border-beneficiary-border p-6 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-beneficiary-light text-beneficiary-dark">
              <Icon path={icons.beneficiary} className="h-5 w-5" />
            </div>
            <div className="mb-1 text-lg font-bold text-ink">Beneficiary</div>
            <div className="mb-3 text-xs text-faint">Registered households</div>
            <p className="mb-5 text-sm text-muted">Sign for aid received and view your household's assistance history.</p>
            <Link to="/beneficiary/login">
              <Button variant="beneficiary">
                <span className="flex items-center justify-center gap-2">
                  Continue as beneficiary
                  <Icon path={icons.arrow} className="h-4 w-4" />
                </span>
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Recent donations feed + community map */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <Card className="overflow-hidden p-0 lg:col-span-3">
            <div className="flex items-center justify-between border-b border-line-soft bg-line-soft/40 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-donor-light text-donor-dark">
                  <Icon path={icons.clock} className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-ink">Recent donations</h2>
              </div>
              {!loading && feed.length > 0 && (
                <span className="text-[11px] font-semibold text-faint">{feed.length} shown</span>
              )}
            </div>

            <div className="p-4">
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
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-soft px-4 py-3 transition-colors hover:bg-line-soft/30"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-beneficiary-light text-beneficiary-dark">
                        <Icon path={icons[CATEGORY_ICONS[entry.category] || 'gift']} className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-ink">
                          {entry.item} {entry.quantity ? `— ${entry.quantity} ${entry.unit || ''}` : ''}
                        </div>
                        <div className="text-xs text-faint">
                          Donated by {entry.donor_name || 'Anonymous'} · Brgy. {entry.barangay} ·{' '}
                          {new Date(entry.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {entry.category && <Badge tone="neutral">{entry.category}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0 lg:col-span-2">
            <div className="border-b border-line-soft bg-line-soft/40 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-donor-light text-donor-dark">
                  <Icon path={icons.pin} className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-ink">Coverage map</h2>
              </div>
              <p className="mt-1 pl-10 text-xs text-faint">Manolo Fortich, Bukidnon — 22 barangays.</p>
            </div>
            <div className="p-4">
              <BarangayMap height="280px" />
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-navy text-white/70">
        <div className="mx-auto max-w-5xl px-4 py-10">
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
                <li><Link to="/admin/login" className="transition-colors hover:text-white">Staff / Admin login</Link></li>
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