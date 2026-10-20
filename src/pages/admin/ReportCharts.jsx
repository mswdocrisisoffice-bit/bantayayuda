import { useMemo, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import { BARANGAY_POSITIONS } from '../../components/ui/BarangayMap.jsx'

const norm = (s) => String(s || '').trim().toLowerCase()

const CATEGORY_ACCENT = {
  'Food & Nutrition': '#D97706',
  'Hygiene & Personal Care': '#2563A8',
  'Medical & Health Supplies': '#C0392B',
  'Clothing & Linens': '#7C3AED',
  'Shelter & Survival Gear': '#2F855A',
  'Education & Child Development': '#0F8B8D',
}

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''

/* Add up quantities per item (+unit) so a detail panel stays short */
function sumByItem(rows) {
  const map = {}
  rows.forEach((r) => {
    const k = `${norm(r.item)}|${r.unit || ''}`
    if (!map[k]) map[k] = { item: r.item || '—', unit: r.unit || '', total: 0 }
    map[k].total += Number(r.quantity) || 0
  })
  return Object.values(map).sort((a, b) => b.total - a.total)
}

function Donut({ served, total, view, onPick }) {
  const r = 52
  const c = 2 * Math.PI * r
  const pct = total ? served / total : 0
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70" cy="70" r={r} fill="none" strokeWidth="18"
          stroke={view === 'notYet' ? '#B9B9AE' : '#D9D9D2'}
          className="cursor-pointer transition-all"
          onClick={() => onPick('notYet')}
        />
        <circle
          cx="70" cy="70" r={r} fill="none" strokeWidth={view === 'served' ? 22 : 18}
          stroke="#4A7A2E"
          strokeDasharray={`${c * pct} ${c}`}
          className="cursor-pointer transition-all"
          onClick={() => onPick('served')}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-ink">{served} / {total}</div>
        <div className="text-[10px] font-semibold text-faint">barangays served</div>
      </div>
    </div>
  )
}

const segBtn = (active) =>
  `inline-flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition ${
    active
      ? 'border-admin bg-admin text-white shadow-sm'
      : 'border-line bg-white text-ink hover:border-admin hover:bg-admin-light hover:text-admin-dark'
  }`

export default function ReportCharts({ donations, distributions, inventory }) {
  const [view, setView] = useState('served') // 'served' | 'notYet'
  const [pickedBrgy, setPickedBrgy] = useState(null)
  const [pickedItem, setPickedItem] = useState(null)
  const [pickedMonth, setPickedMonth] = useState(null)

  /* Which of the 22 barangays already received aid (based on distribution records) */
  const coverage = useMemo(() => {
    const servedKeys = new Set(distributions.map((d) => norm(d.barangay)).filter(Boolean))
    const official = BARANGAY_POSITIONS.map((b) => b.name)
    const officialKeys = new Set(official.map(norm))
    return {
      served: official.filter((n) => servedKeys.has(norm(n))),
      notYet: official.filter((n) => !servedKeys.has(norm(n))),
      unmatched: distributions.filter((d) => d.barangay && !officialKeys.has(norm(d.barangay))).length,
    }
  }, [distributions])

  const brgyDetail = useMemo(() => {
    if (!pickedBrgy) return null
    const rows = distributions.filter((d) => norm(d.barangay) === norm(pickedBrgy))
    const households = new Set(rows.map((d) => norm(d.household_head)).filter(Boolean))
    return { rows, households: households.size, items: sumByItem(rows) }
  }, [pickedBrgy, distributions])

  /* Items with the most stock */
  const topStock = useMemo(
    () =>
      [...inventory]
        .filter((i) => Number(i.quantity_on_hand) > 0)
        .sort((a, b) => b.quantity_on_hand - a.quantity_on_hand)
        .slice(0, 8),
    [inventory]
  )
  const maxQty = topStock[0]?.quantity_on_hand || 1

  const itemDetail = useMemo(() => {
    if (!pickedItem) return null
    const rows = distributions.filter((d) => norm(d.item) === norm(pickedItem.item))
    const people = {}
    rows.forEach((d) => {
      const k = norm(d.household_head) || '—'
      if (!people[k]) people[k] = { name: d.household_head || '—', brgy: d.barangay, total: 0 }
      people[k].total += Number(d.quantity) || 0
    })
    return {
      given: rows.reduce((s, d) => s + (Number(d.quantity) || 0), 0),
      recipients: Object.values(people).sort((a, b) => b.total - a.total),
    }
  }, [pickedItem, distributions])

  /* Donations per month (last 6 months) */
  const monthly = useMemo(() => {
    const now = new Date()
    const months = []
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        name: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        count: 0,
      })
    }
    donations.forEach((d) => {
      const m = months.find((x) => x.key === d.created_at?.slice(0, 7))
      if (m) m.count += 1
    })
    return { months, max: Math.max(1, ...months.map((m) => m.count)) }
  }, [donations])

  const currentKey = monthly.months[monthly.months.length - 1].key
  const activeKey = pickedMonth || currentKey
  const activeMonth = monthly.months.find((m) => m.key === activeKey)
  const monthDonations = useMemo(
    () => donations.filter((d) => d.created_at?.slice(0, 7) === activeKey),
    [donations, activeKey]
  )
  const monthDonors = useMemo(
    () => new Set(monthDonations.map((d) => d.donor_id || norm(d.donor_name)).filter(Boolean)).size,
    [monthDonations]
  )

  return (
    <div className="mb-6 space-y-4">
      {/* ── Barangay coverage ── */}
      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-ink">Barangay coverage</h2>
          <p className="text-[11px] text-faint">
            Which barangays already received aid, and which are still waiting (selected date range).
            <span className="no-print"> Tap the chart or a barangay to see details.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <Donut
            served={coverage.served.length}
            total={BARANGAY_POSITIONS.length}
            view={view}
            onPick={(v) => { setView(v); setPickedBrgy(null) }}
          />

          <div className="min-w-[260px] flex-1">
            <div className="no-print mb-3 flex flex-wrap gap-2">
              <button onClick={() => { setView('served'); setPickedBrgy(null) }} className={segBtn(view === 'served')}>
                <span className="h-2.5 w-2.5 rounded-full bg-[#4A7A2E] ring-2 ring-white" />
                Given aid ({coverage.served.length})
              </button>
              <button onClick={() => { setView('notYet'); setPickedBrgy(null) }} className={segBtn(view === 'notYet')}>
                <span className="h-2.5 w-2.5 rounded-full bg-[#B9B9AE] ring-2 ring-white" />
                Not yet served ({coverage.notYet.length})
              </button>
            </div>

            {[['served', coverage.served, 'Given aid'], ['notYet', coverage.notYet, 'Not yet served']].map(([g, names, title]) => (
              <div key={g} className={view === g ? 'block' : 'hidden print:block print:mt-3'}>
                <div className="mb-1.5 hidden text-xs font-bold text-ink print:block">{title} ({names.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {names.length === 0 && (
                    <span className="text-[11px] text-faint">
                      {g === 'served' ? 'None yet' : 'All barangays served ✓'}
                    </span>
                  )}
                  {names.map((n) => {
                    const on = pickedBrgy === n
                    return (
                      <button
                        key={n}
                        onClick={() => setPickedBrgy(on ? null : n)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                          on
                            ? 'border-admin bg-admin text-white'
                            : g === 'served'
                              ? 'border-beneficiary/30 bg-beneficiary-light text-beneficiary-dark hover:border-beneficiary'
                              : 'border-line bg-white text-ink hover:border-admin hover:text-admin-dark'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {pickedBrgy && brgyDetail && (
              <div className="tab-fade mt-4 rounded-xl border border-line-soft bg-black/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-ink">Brgy. {pickedBrgy}</div>
                  <button onClick={() => setPickedBrgy(null)} className="no-print text-[11px] font-bold text-muted hover:text-ink">
                    ✕ Close
                  </button>
                </div>
                {brgyDetail.rows.length === 0 ? (
                  <p className="mt-1 text-[11px] text-faint">No aid distributed here in this date range.</p>
                ) : (
                  <>
                    <p className="mt-1 text-[11px] text-muted">
                      {brgyDetail.households} household{brgyDetail.households === 1 ? '' : 's'} ·{' '}
                      {brgyDetail.rows.length} distribution{brgyDetail.rows.length === 1 ? '' : 's'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {brgyDetail.items.map((it) => (
                        <span key={`${it.item}|${it.unit}`} className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-ink shadow-sm">
                          {it.item} · {it.total} {it.unit}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {coverage.unmatched > 0 && (
              <p className="mt-3 text-[11px] text-warn-text">
                ⚠ {coverage.unmatched} record(s) have a barangay name that doesn't match the official list (possible typo), so they aren't counted above.
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* ── Most stocked items ── */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Most stocked items</h2>
          <p className="mb-4 text-[11px] text-faint">
            Top items by quantity on hand (units differ, so compare with care).
            <span className="no-print"> Tap an item for details.</span>
          </p>
          {topStock.length === 0 ? (
            <p className="text-xs text-faint">No stock on hand.</p>
          ) : (
            <div className="space-y-2">
              {topStock.map((i) => {
                const accent = CATEGORY_ACCENT[i.category] || '#4A5568'
                const on = pickedItem?.id === i.id
                return (
                  <div key={i.id}>
                    <button
                      onClick={() => setPickedItem(on ? null : i)}
                      className={`w-full rounded-lg border-2 px-3 py-2 text-left transition ${
                        on ? 'border-admin bg-admin-light/50' : 'border-transparent hover:border-line hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-semibold text-ink">{i.item}</span>
                        <span className="font-bold text-ink">
                          {i.quantity_on_hand} <span className="font-normal text-faint">{i.unit}</span>
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-line-soft">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(3, (i.quantity_on_hand / maxQty) * 100)}%`, background: accent }}
                        />
                      </div>
                    </button>

                    {on && itemDetail && (
                      <div className="tab-fade mx-1 mt-1 rounded-xl border border-line-soft bg-black/[0.03] p-3 text-[11px]">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                          <span><b className="text-ink">{i.quantity_on_hand}</b> {i.unit} in stock</span>
                          <span><b className="text-ink">{itemDetail.given}</b> {i.unit} given out (selected range)</span>
                          {i.category && <span>{i.category}</span>}
                        </div>
                        {itemDetail.recipients.length === 0 ? (
                          <p className="mt-1.5 text-faint">Not given to anyone in this date range.</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {itemDetail.recipients.slice(0, 8).map((p) => (
                              <span key={p.name} className="rounded-md bg-white px-2 py-1 font-semibold text-ink shadow-sm">
                                {p.name} · {p.total}
                              </span>
                            ))}
                            {itemDetail.recipients.length > 8 && (
                              <span className="px-1 py-1 text-faint">+{itemDetail.recipients.length - 8} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ── Donations by month ── */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Donations by month</h2>
          <p className="mb-4 text-[11px] text-faint">
            {activeMonth?.name}
            <span className="no-print"> · tap a bar to switch month</span>
          </p>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-admin-light p-3">
              <div className="text-2xl font-bold text-admin-dark">{monthDonations.length}</div>
              <div className="text-[11px] font-semibold text-muted">donations</div>
            </div>
            <div className="rounded-lg bg-donor-light p-3">
              <div className="text-2xl font-bold text-donor-dark">{monthDonors}</div>
              <div className="text-[11px] font-semibold text-muted">donors</div>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-muted">Last 6 months</div>
          <div className="mt-2 flex h-36 items-end gap-2">
            {monthly.months.map((m) => {
              const on = m.key === activeKey
              return (
                <button
                  key={m.key}
                  onClick={() => setPickedMonth(m.key)}
                  className={`flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg border-2 px-1 pb-1 transition ${
                    on ? 'border-admin/40 bg-admin-light/50' : 'border-transparent hover:border-line hover:bg-black/[0.03]'
                  }`}
                >
                  <span className="text-[11px] font-bold text-ink">{m.count}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(4, (m.count / monthly.max) * 80)}px`,
                      background: on ? '#A32D2D' : '#D9B8B8',
                    }}
                  />
                  <span className={`text-[10px] ${on ? 'font-bold text-ink' : 'text-faint'}`}>{m.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 border-t border-line-soft pt-3">
            <div className="mb-2 text-[11px] font-bold text-ink">What came in · {activeMonth?.name}</div>
            {monthDonations.length === 0 ? (
              <p className="text-[11px] text-faint">No donations this month.</p>
            ) : (
              <ul className="max-h-44 space-y-1 overflow-y-auto pr-1 text-[11px]">
                {monthDonations.slice(0, 30).map((d) => (
                  <li key={d.id} className="flex items-baseline justify-between gap-2 rounded-md bg-black/[0.03] px-2.5 py-1.5">
                    <span className="min-w-0 truncate">
                      <b className="text-ink">{d.donor_name || 'Anonymous'}</b>
                      <span className="text-muted"> · {d.item}{d.quantity ? ` (${d.quantity} ${d.unit || ''})` : ''}</span>
                    </span>
                    <span className="shrink-0 text-faint">{fmtDate(d.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}