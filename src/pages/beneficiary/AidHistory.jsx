import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { supabase } from '../../lib/supabase.js'

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
  back: <><path d="M15 6l-6 6 6 6" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6h18v-6h-5l-1 2h-6l-1-2z" /></>,
}

const ACCENTS = ['#1d5fa8', '#2f855a', '#0e7490', '#b7791f']

export default function AidHistory() {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) { setLoading(false); return }

      // `distributions` rows aren't tagged with household_id — match them up
      // using whatever this household has on file. household_head is always
      // filled in (it comes straight from the required name fields), while
      // contact_number is optional, so try both and merge the results.
      const { data: beneficiary } = await supabase
        .from('beneficiaries')
        .select('household_head, contact_number')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (!beneficiary?.household_head && !beneficiary?.contact_number) {
        setLoading(false)
        return
      }

      const queries = [
        supabase.from('distributions').select('*').eq('household_id', userData.user.id),
      ]
      if (beneficiary.household_head) {
        queries.push(
          supabase
            .from('distributions')
            .select('*')
            .ilike('household_head', beneficiary.household_head)
        )
      }
      if (beneficiary.contact_number) {
        queries.push(
          supabase
            .from('distributions')
            .select('*')
            .eq('contact_primary', beneficiary.contact_number)
        )
      }

      const results = await Promise.all(queries)
      const merged = new Map()
      results.forEach(({ data }) => (data || []).forEach((r) => merged.set(r.id, r)))
      const combined = Array.from(merged.values()).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )

      setRecords(combined)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = records.filter((r) =>
    r.item?.toLowerCase().includes(search.toLowerCase())
  )

  const lastDate = records[0]?.created_at
    ? new Date(records[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e4a7a] to-[#0b2545] p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white/75">Beneficiary</p>
              <h1 className="text-2xl font-extrabold">My aid history</h1>
              <p className="text-sm text-white/75">Every relief item you have received, confirmed with your e-signature.</p>
            </div>
            <Link
              to="/beneficiary/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#0b2545] shadow hover:bg-white/90"
            >
              <Icon path={icons.back} className="h-4 w-4" /> Back to dashboard
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Card className="p-5" style={{ borderTop: '4px solid #1d5fa8' }}>
            <div className="text-sm text-faint">Total distributions</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{loading ? '…' : records.length}</div>
          </Card>
          <Card className="p-5" style={{ borderTop: '4px solid #2f855a' }}>
            <div className="text-sm text-faint">Last received</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{loading ? '…' : lastDate}</div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mt-5">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
            <Icon path={icons.search} className="h-4 w-4" />
          </span>
          <input
            placeholder="Search by item name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-[#1d5fa8] focus:ring-2 focus:ring-[#1d5fa8]/20"
          />
        </div>

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
              <Card key={r.id} className="p-5" style={{ borderTop: `4px solid ${accent}` }}>
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
                  {r.created_at
                    ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}