import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import { supabase } from '../../lib/supabase.js'
import StockDetailsModal from './Stockdetailsmodal.jsx'

const LOW_STOCK_THRESHOLD = 10

/* Small inline icons so the stock cards match the Overview page styling. */
function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></>,
  low: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.4 18a1.8 1.8 0 0 0 1.6 2.7h16a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  out: <><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>,
}

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
      <span className="rounded-full bg-admin-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-admin-dark">
        Out of stock
      </span>
    )
  }
  if (qty <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="rounded-full bg-warn-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-warn-text">
        Low stock
      </span>
    )
  }
  return (
    <span className="rounded-full bg-donor-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-donor-dark">
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
  const [selected, setSelected] = useState(null) // the stock card that was tapped
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
    { key: 'all', label: 'Total items', value: items.length, tone: 'text-ink', accent: '#0B2545', tint: '#E8ECF2', icon: 'box' },
    { key: 'low', label: `Low stock (≤ ${LOW_STOCK_THRESHOLD})`, value: lowStockCount, tone: 'text-warn-text', accent: '#E8A33D', tint: '#FAEEDA', icon: 'low' },
    { key: 'out', label: 'Out of stock', value: outOfStockCount, tone: 'text-admin', accent: '#A32D2D', tint: '#FCEBEB', icon: 'out' },
  ]

  return (
    <>
      {/* ── Banner (same look as the Overview page) ── */}
      <div className="relative mb-4 overflow-hidden rounded-card bg-gradient-to-r from-admin-dark to-admin p-4 text-white shadow-[0_4px_14px_rgba(0,0,0,0.2)] sm:mb-6 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-28 h-44 w-44 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:h-14 sm:w-14">
            <Icon path={icons.box} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight sm:text-xl">Inventory</h1>
            <p className="mt-0.5 text-[11px] leading-snug text-white/75 sm:text-xs">
              Auto-updated — stock goes up when a donation is confirmed and down when it's distributed.
              <span className="hidden sm:inline"> Tap an item to see who donated it, when, and to edit or archive an entry.</span>
            </p>
            <p className="mt-0.5 text-[11px] text-white/75 sm:hidden">Tap an item to see its donors.</p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
        {statCards.map((s) => {
          const active = statusFilter === s.key
          return (
            <button key={s.key} onClick={() => pickStatus(s.key)} className="group text-left">
              <div
                className={`relative h-full overflow-hidden rounded-card bg-white p-3 pt-4 shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.16)] sm:p-5 sm:pt-6 ${
                  active ? 'ring-2 ring-admin/60' : ''
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: s.accent }} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold leading-tight text-faint sm:text-xs">{s.label}</div>
                    <div className={`mt-1 text-2xl font-bold leading-none sm:text-3xl ${s.tone}`}>
                      {loading ? '…' : s.value}
                    </div>
                  </div>
                  <div
                    className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:flex"
                    style={{ background: s.tint, color: s.accent }}
                  >
                    <Icon path={icons[s.icon]} className="h-5 w-5" />
                  </div>
                </div>
                <div
                  className="mt-2 flex items-center justify-between text-[10px] font-bold sm:mt-3"
                  style={{ color: s.accent }}
                >
                  <span>{active ? 'Showing these' : 'Tap to view'}</span>
                  <span>{active ? '▲' : '▼'}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div ref={stockRef} className="scroll-mt-4">
        <Card className="p-4 sm:p-6">
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

          {/* Category filter chips, each with its category color dot.
              On a phone they stay on one swipeable row instead of stacking into 4 lines. */}
          <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCategory('All')}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
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
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
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

                  {/* Designed stock cards, like the Overview tiles but one per row
                      on a phone so a long item name still has room to breathe. */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((i) => {
                      const qty = i.quantity_on_hand
                      const isOut = qty <= 0
                      const open = () => setSelected({ id: i.id, category: i.category, item: i.item, unit: i.unit })
                      return (
                        <div
                          key={i.id}
                          role="button"
                          tabIndex={0}
                          onClick={open}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open() }}
                          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.14)] focus:outline-none focus:ring-2 focus:ring-admin/40"
                          style={{ opacity: isOut ? 0.85 : 1 }}
                        >
                          <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: c.accent }} />

                          <div className="p-3.5 pt-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-bold leading-snug text-ink">{i.item}</div>
                                <div className="mt-1.5">
                                  <StatusBadge qty={qty} />
                                </div>
                              </div>
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                                style={{ background: c.bg, color: c.accent }}
                              >
                                <Icon path={icons.box} className="h-5 w-5" />
                              </span>
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-2 border-t pt-2.5" style={{ borderColor: c.border }}>
                              <div className="flex items-baseline gap-1.5">
                                <span
                                  className="text-3xl font-extrabold leading-none"
                                  style={{ color: isOut ? '#9A9A92' : c.accent }}
                                >
                                  {qty}
                                </span>
                                <span
                                  className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                  style={{ background: c.bg, color: c.accent }}
                                >
                                  {i.unit}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold" style={{ color: c.accent }}>
                                View donors →
                              </span>
                            </div>
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

      {selected && (
        <StockDetailsModal
          category={selected.category}
          item={selected.item}
          unit={selected.unit}
          inventoryId={selected.id}
          onClose={() => setSelected(null)}
          onChanged={loadInventory}
        />
      )}
    </>
  )
}