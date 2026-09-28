import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import { supabase } from '../../lib/supabase.js'

const LOW_STOCK_THRESHOLD = 10

/* One color family per category: soft background, border, strong accent */
const CATEGORY_COLORS = {
  'Food & Nutrition':              { bg: '#FFF4E5', border: '#F5D5A8', accent: '#D97706' },
  'Hygiene & Personal Care':       { bg: '#E8F3FD', border: '#B9D9F5', accent: '#2563A8' },
  'Medical & Health Supplies':     { bg: '#FDECEC', border: '#F3BDBD', accent: '#C0392B' },
  'Clothing & Linens':             { bg: '#F3ECFB', border: '#D9C6F0', accent: '#7C3AED' },
  'Shelter & Survival Gear':       { bg: '#E9F6EC', border: '#BFE3C8', accent: '#2F855A' },
  'Education & Child Development': { bg: '#E6F7F6', border: '#B5E3DF', accent: '#0F8B8D' },
}
const FALLBACK_COLORS = [
  { bg: '#FCE9F3', border: '#F1BFDA', accent: '#C2378A' },
  { bg: '#EEF1F4', border: '#CBD2DA', accent: '#4A5568' },
  { bg: '#FFF9DB', border: '#F0E29A', accent: '#B7950B' },
]

function colorFor(category, index) {
  return CATEGORY_COLORS[category] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

function StatusBadge({ qty }) {
  if (qty <= 0) {
    return (
      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-admin-dark">
        Out of stock
      </span>
    )
  }
  if (qty <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-warn-text">
        Low stock
      </span>
    )
  }
  return (
    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-beneficiary-dark">
      In stock
    </span>
  )
}

const STATUS_LABELS = {
  all: 'all items',
  low: 'low stock items',
  out: 'out of stock items',
}

export default function InventoryTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'low' | 'out'
  const stockRef = useRef(null)

  async function loadInventory() {
    setLoading(true)
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('category', { ascending: true })
      .order('item', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadInventory()
  }, [])

  const withCategory = useMemo(
    () => items.map((i) => ({ ...i, category: i.category || 'Uncategorized' })),
    [items]
  )

  const categoryCounts = useMemo(() => {
    const map = {}
    withCategory.forEach((i) => {
      map[i.category] = (map[i.category] || 0) + 1
    })
    return map
  }, [withCategory])

  const categoryList = useMemo(() => Object.keys(categoryCounts).sort(), [categoryCounts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return withCategory.filter((i) => {
      const qty = i.quantity_on_hand
      if (statusFilter === 'out' && qty > 0) return false
      if (statusFilter === 'low' && !(qty > 0 && qty <= LOW_STOCK_THRESHOLD)) return false
      if (activeCategory !== 'All' && i.category !== activeCategory) return false
      if (!q) return true
      return (
        (i.item || '').toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      )
    })
  }, [withCategory, search, activeCategory, statusFilter])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach((i) => {
      if (!map[i.category]) map[i.category] = []
      map[i.category].push(i)
    })
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const lowStockCount = items.filter((i) => i.quantity_on_hand > 0 && i.quantity_on_hand <= LOW_STOCK_THRESHOLD).length
  const outOfStockCount = items.filter((i) => i.quantity_on_hand <= 0).length

  function pickStatus(key) {
    setStatusFilter(key)
    setActiveCategory('All')
    setSearch('')
    setTimeout(() => {
      stockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const statCards = [
    { key: 'all', label: 'Total items', value: items.length, tone: 'text-ink' },
    { key: 'low', label: `Low stock (≤ ${LOW_STOCK_THRESHOLD})`, value: lowStockCount, tone: 'text-warn-text' },
    { key: 'out', label: 'Out of stock', value: outOfStockCount, tone: 'text-admin' },
  ]

  return (
    <>
      <div className="mb-6 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <h1 className="mb-1 text-xl font-bold text-admin-dark">Inventory</h1>
        <p className="text-xs text-faint">
          Auto-updated — stock increases when a donation is confirmed and decreases when it's distributed.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((s) => {
          const active = statusFilter === s.key
          return (
            <button key={s.key} onClick={() => pickStatus(s.key)} className="text-left">
              <Card
                className={`p-5 transition hover:-translate-y-0.5 hover:border-admin ${
                  active ? 'border-admin ring-2 ring-admin/40' : ''
                }`}
              >
                <div className="text-sm text-faint">{s.label}</div>
                <div className={`mt-1 text-2xl font-bold ${s.tone}`}>{loading ? '…' : s.value}</div>
                <div className="mt-2 text-[10px] font-semibold text-admin-dark">
                  {active ? 'Showing these ▲' : 'Tap to view ↓'}
                </div>
              </Card>
            </button>
          )
        })}
      </div>

      <div ref={stockRef} className="scroll-mt-4">
        <Card className="p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">Current stock</h2>
              {statusFilter !== 'all' && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-faint">
                  Showing {STATUS_LABELS[statusFilter]} only
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="font-semibold text-admin-dark hover:underline"
                  >
                    Show all
                  </button>
                </div>
              )}
            </div>
            <input
              placeholder="Search item or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin sm:w-64"
            />
          </div>

          {/* Category filter chips, each with its category color dot */}
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('All')}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                activeCategory === 'All'
                  ? 'border-admin bg-admin text-white'
                  : 'border-line-soft bg-white text-muted hover:border-admin hover:text-admin-dark'
              }`}
            >
              All · {items.length}
            </button>
            {categoryList.map((cat, idx) => {
              const active = activeCategory === cat
              const c = colorFor(cat, idx)
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
                  style={
                    active
                      ? { background: c.accent, borderColor: c.accent, color: '#fff' }
                      : { background: c.bg, borderColor: c.border, color: c.accent }
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: active ? '#fff' : c.accent }}
                  />
                  {cat} · {categoryCounts[cat]}
                </button>
              )
            })}
          </div>

          {loading && <p className="text-xs text-faint">Loading…</p>}
          {!loading && grouped.length === 0 && (
            <p className="text-xs text-faint">
              {statusFilter === 'all'
                ? 'No inventory records found — items appear here once a donation is confirmed.'
                : `No ${STATUS_LABELS[statusFilter]} right now.`}
            </p>
          )}

          <div className="space-y-6">
            {grouped.map(([category, rows]) => {
              const c = colorFor(category, categoryList.indexOf(category))
              return (
                <section key={category}>
                  <div
                    className="mb-3 flex items-center justify-between border-b pb-2"
                    style={{ borderColor: c.border }}
                  >
                    <h3
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
                      style={{ color: c.accent }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.accent }} />
                      {category}
                    </h3>
                    <span className="text-[11px] font-semibold text-faint">
                      {rows.length} item{rows.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {rows.map((i) => {
                      const qty = i.quantity_on_hand
                      const isOut = qty <= 0
                      return (
                        <div
                          key={i.id}
                          className="flex min-h-[170px] flex-col justify-between rounded-lg border border-t-4 p-4 text-center"
                          style={{
                            background: c.bg,
                            borderColor: c.border,
                            borderTopColor: c.accent,
                            opacity: isOut ? 0.75 : 1,
                          }}
                        >
                          <div className="text-sm font-semibold leading-tight text-ink">{i.item}</div>

                          <div>
                            <div
                              className="text-3xl font-bold"
                              style={{ color: isOut ? '#9A9A92' : c.accent }}
                            >
                              {qty}
                            </div>
                            <span
                              className="mt-1 inline-block rounded-md px-2.5 py-0.5 text-xs font-bold"
                              style={{ background: '#fff', color: c.accent }}
                            >
                              {i.unit}
                            </span>
                          </div>

                          <div>
                            <StatusBadge qty={qty} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </Card>
      </div>
    </>
  )
}