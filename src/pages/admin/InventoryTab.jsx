import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { supabase } from '../../lib/supabase.js'

const LOW_STOCK_THRESHOLD = 10

export default function InventoryTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const filtered = items.filter((i) =>
    !search.trim() ||
    i.item.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = items.filter((i) => i.quantity_on_hand <= LOW_STOCK_THRESHOLD).length
  const outOfStockCount = items.filter((i) => i.quantity_on_hand <= 0).length

  return (
    <>
      <div className="mb-6 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
  <h1 className="mb-1 text-xl font-bold text-admin-dark">Inventory</h1>
  <p className="text-xs text-faint">
    Auto-updated — stock increases when a donation is confirmed and decreases when it's distributed.
  </p>
</div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm text-faint">Low stock items (≤ {LOW_STOCK_THRESHOLD})</div>
          <div className="mt-1 text-2xl font-bold text-warn-text">{loading ? '…' : lowStockCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-faint">Out of stock</div>
          <div className="mt-1 text-2xl font-bold text-admin">{loading ? '…' : outOfStockCount}</div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-ink">Current stock</h2>
          <input
            placeholder="Search item or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin sm:w-64"
          />
        </div>

        {loading && <p className="text-xs text-faint">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-xs text-faint">No inventory records yet — items appear here once a donation is confirmed.</p>
        )}

        <div className="space-y-2">
          {filtered.map((i) => {
            const isOut = i.quantity_on_hand <= 0
            const isLow = !isOut && i.quantity_on_hand <= LOW_STOCK_THRESHOLD
            return (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-soft px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">{i.item}</div>
                  <div className="text-xs text-faint">{i.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-ink">
                      {i.quantity_on_hand} <span className="text-xs font-normal text-faint">{i.unit}</span>
                    </div>
                  </div>
                  {isOut && <Badge tone="pending">Out of stock</Badge>}
                  {isLow && <Badge tone="government">Low stock</Badge>}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </>
  )
}