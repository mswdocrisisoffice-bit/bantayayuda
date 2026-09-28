import { useMemo } from 'react'
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

function Donut({ served, total }) {
  const r = 52
  const c = 2 * Math.PI * r
  const pct = total ? served / total : 0
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#D9D9D2" strokeWidth="18" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="#4A7A2E" strokeWidth="18"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-ink">{served} / {total}</div>
        <div className="text-[10px] font-semibold text-faint">barangays served</div>
      </div>
    </div>
  )
}

export default function ReportCharts({ donations, distributions, inventory }) {
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

  /* Donations per month (last 6 months) + this month's donors */
  const monthly = useMemo(() => {
    const now = new Date()
    const months = []
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        count: 0,
      })
    }
    donations.forEach((d) => {
      const m = months.find((x) => x.key === d.created_at?.slice(0, 7))
      if (m) m.count += 1
    })
    const currentKey = months[months.length - 1].key
    const thisMonth = donations.filter((d) => d.created_at?.slice(0, 7) === currentKey)
    const donors = new Set(thisMonth.map((d) => d.donor_id || norm(d.donor_name)).filter(Boolean))
    return {
      months,
      max: Math.max(1, ...months.map((m) => m.count)),
      thisMonthCount: thisMonth.length,
      thisMonthDonors: donors.size,
      monthName: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    }
  }, [donations])

  return (
    <div className="mb-6 space-y-4">
      {/* ── Barangay coverage ── */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-ink">Barangay coverage</h2>
        <p className="mb-4 text-[11px] text-faint">
          Which barangays already received aid, and which are still waiting (based on distribution records in the selected range).
        </p>
        <div className="flex flex-wrap items-start gap-6">
          <Donut served={coverage.served.length} total={BARANGAY_POSITIONS.length} />

          <div className="min-w-[240px] flex-1 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-beneficiary-dark">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#4A7A2E' }} />
                Given aid ({coverage.served.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {coverage.served.length === 0 && <span className="text-[11px] text-faint">None yet</span>}
                {coverage.served.map((n) => (
                  <span key={n} className="rounded-full bg-beneficiary-light px-2.5 py-1 text-[11px] font-semibold text-beneficiary-dark">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#D9D9D2' }} />
                Not yet served ({coverage.notYet.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {coverage.notYet.length === 0 && <span className="text-[11px] text-faint">All barangays served ✓</span>}
                {coverage.notYet.map((n) => (
                  <span key={n} className="rounded-full bg-line-soft px-2.5 py-1 text-[11px] font-semibold text-muted">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {coverage.unmatched > 0 && (
              <p className="text-[11px] text-warn-text">
                {coverage.unmatched} record(s) have a barangay name that doesn't match the official list (possible typo), so they aren't counted above.
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Most stocked items ── */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Most stocked items</h2>
          <p className="mb-4 text-[11px] text-faint">Top items by quantity on hand (units differ, so compare with care).</p>
          {topStock.length === 0 ? (
            <p className="text-xs text-faint">No stock on hand.</p>
          ) : (
            <div className="space-y-3">
              {topStock.map((i) => {
                const accent = CATEGORY_ACCENT[i.category] || '#4A5568'
                return (
                  <div key={i.id}>
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
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ── Donations this month ── */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Donations this month</h2>
          <p className="mb-4 text-[11px] text-faint">{monthly.monthName}</p>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-admin-light p-3">
              <div className="text-2xl font-bold text-admin-dark">{monthly.thisMonthCount}</div>
              <div className="text-[11px] font-semibold text-muted">donations</div>
            </div>
            <div className="rounded-lg bg-donor-light p-3">
              <div className="text-2xl font-bold text-donor-dark">{monthly.thisMonthDonors}</div>
              <div className="text-[11px] font-semibold text-muted">donors</div>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-muted">Last 6 months</div>
          <div className="mt-2 flex h-32 items-end gap-2">
            {monthly.months.map((m, idx) => {
              const isCurrent = idx === monthly.months.length - 1
              return (
                <div key={m.key} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-bold text-ink">{m.count}</span>
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${Math.max(4, (m.count / monthly.max) * 80)}px`,
                      background: isCurrent ? '#A32D2D' : '#D9B8B8',
                    }}
                  />
                  <span className={`text-[10px] ${isCurrent ? 'font-bold text-ink' : 'text-faint'}`}>{m.label}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}