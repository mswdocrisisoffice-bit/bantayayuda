import { useMemo, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Avatar from '../../components/ui/Avatar.jsx'

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
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')

function toCsv(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(',')
  const body = rows
    .map((row) => columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  return `${header}\n${body}`
}
function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const CAT_COLORS = {
  'Food & Nutrition':              { bg: '#FFF4E5', accent: '#D97706' },
  'Hygiene & Personal Care':       { bg: '#E8F3FD', accent: '#2563A8' },
  'Medical & Health Supplies':     { bg: '#FDECEC', accent: '#C0392B' },
  'Clothing & Linens':             { bg: '#F3ECFB', accent: '#7C3AED' },
  'Shelter & Survival Gear':       { bg: '#E9F6EC', accent: '#2F855A' },
  'Education & Child Development': { bg: '#E6F7F6', accent: '#0F8B8D' },
}
const EXTRA_CAT_COLORS = [
  { bg: '#EEF2FF', accent: '#4F46E5' },
  { bg: '#FDF2F8', accent: '#DB2777' },
  { bg: '#ECFEFF', accent: '#0E7490' },
  { bg: '#FEFCE8', accent: '#A16207' },
]
function catColor(category) {
  if (CAT_COLORS[category]) return CAT_COLORS[category]
  if (!category) return { bg: '#EEF1F4', accent: '#4A5568' }
  let h = 0
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return EXTRA_CAT_COLORS[h % EXTRA_CAT_COLORS.length]
}
const nameKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New (7 days)' },
  { key: 'with', label: 'Has donated' },
  { key: 'none', label: 'No donation yet' },
  { key: 'dupe', label: 'Same name' },
]

/**
 * Lists EVERY registered donor account (not only those who already donated),
 * so staff can see who signed up, when, and whether they were ever linked to a donation.
 *
 * Props:
 *   donors    -> rows from profiles where role = 'donor'
 *   donations -> all donations (archived ones are ignored here)
 */
export default function DonorRegistry({ donors = [], donations = [] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null) // which donor row is expanded

  const rows = useMemo(() => {
    const byDonor = {}
    const unlinkedByName = {}
    donations.forEach((d) => {
      if (d.status === 'archived') return
      if (!d.donor_id) {
        const k = nameKey(d.donor_name)
        if (k) unlinkedByName[k] = (unlinkedByName[k] || 0) + 1
        return
      }
      const e = byDonor[d.donor_id] || (byDonor[d.donor_id] = { count: 0, last: null, list: [] })
      e.count += 1
      e.list.push(d)
      if (!e.last || new Date(d.created_at) > new Date(e.last)) e.last = d.created_at
    })

    const nameCounts = {}
    donors.forEach((d) => {
      const nm = d.full_name || (d.email ? d.email.split('@')[0] : '')
      const k = nameKey(nm)
      if (k) nameCounts[k] = (nameCounts[k] || 0) + 1
    })

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    return donors
      .map((d) => {
        const info = byDonor[d.id] || { count: 0, last: null, list: [] }
        const name = d.full_name || (d.email ? d.email.split('@')[0] : 'Unnamed donor')
        return {
          id: d.id,
          name,
          email: d.email || '',
          registered: d.created_at || null,
          type: d.donor_type || '',
          barangay: d.barangay || '',
          donations: info.count,
          last: info.last,
          list: [...info.list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
          unlinked: unlinkedByName[nameKey(name)] || 0,
          isNew: d.created_at ? new Date(d.created_at).getTime() >= weekAgo : false,
          sameName: nameCounts[nameKey(name)] > 1,
        }
      })
      .sort((a, b) => {
        const ta = a.registered ? new Date(a.registered).getTime() : 0
        const tb = b.registered ? new Date(b.registered).getTime() : 0
        return tb - ta || a.name.localeCompare(b.name)
      })
  }, [donors, donations])

  const stats = useMemo(
    () => ({
      total: rows.length,
      with: rows.filter((r) => r.donations > 0).length,
      none: rows.filter((r) => r.donations === 0).length,
      fresh: rows.filter((r) => r.isNew).length,
      dupe: rows.filter((r) => r.sameName).length,
    }),
    [rows]
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'new' && !r.isNew) return false
      if (filter === 'with' && r.donations === 0) return false
      if (filter === 'none' && r.donations > 0) return false
      if (filter === 'dupe' && !r.sameName) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    })
  }, [rows, search, filter])

  function exportCsv() {
    const csv = toCsv(
      visible.map((r) => ({
        ...r,
        registered: r.registered ? fmtDateTime(r.registered) : '',
        last: r.last ? fmtDateTime(r.last) : '',
      })),
      [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'registered', label: 'Registered' },
        { key: 'donations', label: 'Donations' },
        { key: 'last', label: 'Last donation' },
      ]
    )
    downloadCsv('donor_registry.csv', csv)
  }

  const tiles = [
    { label: 'Registered donors', value: stats.total, accent: '#1d5fa8' },
    { label: 'Has donated', value: stats.with, accent: '#2f855a' },
    { label: 'No donation yet', value: stats.none, accent: '#718096' },
    { label: 'New this week', value: stats.fresh, accent: '#0e7490' },
  ]

  return (
    <Card className="mb-4 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">Donor registry</h2>
        <button onClick={exportCsv} className="no-print text-xs font-semibold text-admin-dark">
          Export CSV ↓
        </button>
      </div>
      <p className="mb-4 text-[11px] text-faint">
        Everyone who registered a donor account, newest first. Tap a donor to see what they donated and when. Not affected by the date filter above.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
            style={{ borderTop: `3px solid ${t.accent}` }}
          >
            <div className="text-[11px] text-faint">{t.label}</div>
            <div className="mt-0.5 text-2xl font-extrabold text-ink">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email"
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                filter === f.key
                  ? 'border-admin bg-admin text-white'
                  : 'border-line-soft bg-white text-muted hover:border-admin hover:text-admin-dark'
              }`}
            >
              {f.label}
              {f.key === 'dupe' && stats.dupe > 0 ? ` · ${stats.dupe}` : ''}
            </button>
          ))}
        </div>
      </div>

      {stats.dupe > 0 && filter !== 'dupe' && (
        <div className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-[11px] text-warn-text">
          ⚠ {stats.dupe} accounts share a name with another donor. When recording a donation, pick the donor from
          the suggestions (or type their email) so it goes to the right account.
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-xs text-faint">
          {rows.length === 0 ? 'No donors have registered yet.' : 'No donors match your search.'}
        </p>
      ) : (
        <div className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line-soft">
          {visible.map((r) => {
            const open = openId === r.id
            return (
              <div key={r.id} className="bg-white">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenId(open ? null : r.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenId(open ? null : r.id) }}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-line-soft/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.name} size="sm" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold capitalize text-ink">{r.name}</span>
                        {r.isNew && (
                          <span className="rounded-full bg-[#ECFEFF] px-2 py-0.5 text-[10px] font-bold text-[#0e7490]">NEW</span>
                        )}
                        {r.sameName && (
                          <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[10px] font-bold text-warn-text">
                            SAME NAME
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-faint">{r.email}</div>
                      <div className="text-[11px] text-faint">
                        Registered: {r.registered ? fmtDateTime(r.registered) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-lg px-3 py-1.5 text-center ${
                          r.donations > 0 ? 'bg-donor-light text-donor-dark' : 'bg-black/5 text-faint'
                        }`}
                      >
                        <span className="block text-lg font-bold leading-none">{r.donations}</span>
                        <span className="text-[10px] font-semibold">donation{r.donations === 1 ? '' : 's'}</span>
                      </span>
                      <div className="mt-1 text-[10px] text-faint">
                        {r.last ? `Last: ${fmtDate(r.last)}` : 'No donation yet'}
                      </div>
                    </div>
                    <span className="no-print text-xs text-faint">{open ? '▲' : '▼'}</span>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-line-soft bg-line-soft/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">What they donated</span>
                      <span className="text-[11px] text-faint">
                        {r.list.length} donation{r.list.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {r.list.length === 0 ? (
                      <p className="rounded-lg bg-white px-3 py-4 text-center text-xs text-faint">
                        No donations are linked to this account yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {r.list.map((d) => {
                          const c = catColor(d.category)
                          const confirmed = d.status === 'confirmed'
                          return (
                            <div
                              key={d.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2.5"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: c.accent }} />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-ink">{d.item}</div>
                                  <div className="text-[11px] text-faint">
                                    {d.category || 'Uncategorized'}
                                    {d.barangay ? ` · Brgy. ${d.barangay}` : ''}
                                  </div>
                                  <div className="text-[11px] font-semibold text-muted">🕒 {fmtDateTime(d.created_at)}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="rounded-md px-2.5 py-1 text-xs font-bold"
                                  style={{ background: c.bg, color: c.accent }}
                                >
                                  {d.quantity} {d.unit || ''}
                                </span>
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                                  style={
                                    confirmed
                                      ? { background: '#E9F6EC', color: '#2F855A' }
                                      : { background: '#EEF1F4', color: '#4A5568' }
                                  }
                                >
                                  {d.status || '—'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {r.unlinked > 0 && (
                      <p className="mt-3 rounded-lg bg-warn-bg px-3 py-2 text-[11px] text-warn-text">
                        ⚠ {r.unlinked} donation{r.unlinked === 1 ? ' was' : 's were'} recorded under the name “{r.name}” but
                        {r.unlinked === 1 ? ' is' : ' are'} not linked to any account, so {r.unlinked === 1 ? 'it' : 'they'} won't
                        show here or on the donor's dashboard.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}