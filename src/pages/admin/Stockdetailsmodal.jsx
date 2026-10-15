import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { DonationBox, EditDonationRow, useAllCategories, categoryColor } from './DonationsTab.jsx'

/**
 * Opens when a stock card in Inventory is tapped.
 * Lists every donation of that item (who gave it, when, how much, where) with Edit / Archive.
 *
 * Props:
 *   category, item  -> the stock card that was tapped
 *   unit            -> optional, for the summary line
 *   inventoryId     -> id of the inventory row (enables "Delete item" for empty / misspelled items)
 *   onClose()       -> close the modal
 *   onChanged()     -> call your inventory reload function (stock changes after edit / archive)
 */
export default function StockDetailsModal({ category, item, unit, inventoryId, onClose, onChanged = () => {} }) {
  const { categories } = useAllCategories()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const color = categoryColor(category)

  const load = useCallback(async () => {
    setLoading(true)
    const esc = (v) => String(v).replace(/[%_\\]/g, '\\$&')
    const { data } = await supabase
      .from('donations')
      .select('*')
      .ilike('category', esc(category))
      .ilike('item', esc(item))
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }, [category, item])

  useEffect(() => { load() }, [load])

  // close with the Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function archive(id) {
    setBusyId(id)
    const { error } = await supabase
      .from('donations')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', id)
    setBusyId(null)
    if (!error) {
      await load()
      onChanged()
    }
  }

  async function removeItem() {
    if (!confirm(`Delete "${item}" from Inventory? This removes the item card. Archived donations stay on record in the Archive tab.`)) return
    setDeleting(true)
    setDeleteError('')
    // .select() returns the deleted rows, so we can tell when nothing was actually deleted
    // (Supabase does not raise an error when a row-level-security rule silently blocks a delete).
    const { data, error } = await supabase.from('inventory').delete().eq('id', inventoryId).select()
    setDeleting(false)
    if (error || !data || data.length === 0) {
      setDeleteError(
        'Nothing was deleted. The inventory table needs a delete permission (RLS policy) for admins. Run the SQL policy in Supabase, then try again.'
      )
      return
    }
    onChanged()
    onClose()
  }

  const received = rows
    .filter((r) => r.status === 'confirmed')
    .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
  const donorCount = new Set(rows.map((r) => r.donor_id || r.donor_name)).size

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line-soft bg-white px-6 py-4"
          style={{ borderTop: `5px solid ${color.accent}` }}
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: color.accent }}>
              {category}
            </div>
            <h2 className="truncate text-xl font-bold text-ink">{item}</h2>
            {!loading && (
              <p className="mt-0.5 text-xs text-faint">
                {rows.length} donation{rows.length === 1 ? '' : 's'} from {donorCount} donor{donorCount === 1 ? '' : 's'} ·
                received in total: <span className="font-bold text-ink">{received} {unit || rows[0]?.unit || ''}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-faint hover:bg-line-soft hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-6">
          {loading && <p className="text-sm text-faint">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="rounded-lg border border-dashed border-line-soft p-6 text-center text-sm text-faint">
              No donation entries for this item.
            </p>
          )}

          {rows.map((d) => {
            if (editingId === d.id) {
              return (
                <EditDonationRow
                  key={d.id}
                  donation={d}
                  categories={categories}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null)
                    await load()
                    onChanged()
                  }}
                />
              )
            }
            return (
              <DonationBox
                key={d.id}
                d={d}
                isOpen={openId === d.id}
                onToggle={() => setOpenId((cur) => (cur === d.id ? null : d.id))}
                actions={
                  <>
                    <button
                      onClick={() => setEditingId(d.id)}
                      className="rounded-lg bg-line-soft px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Archive this donation? It will be removed from Inventory, the donor dashboard, the public feed and reports.')) {
                          archive(d.id)
                        }
                      }}
                      disabled={busyId === d.id}
                      className="rounded-lg bg-admin px-3 py-1.5 text-xs font-semibold text-white hover:bg-admin-dark disabled:opacity-50"
                    >
                      {busyId === d.id ? 'Archiving…' : 'Archive'}
                    </button>
                  </>
                }
              />
            )
          })}

          {/* Wrong spelling / empty item cleanup */}
          {!loading && (
            <div className="mt-2 rounded-xl border border-dashed border-line bg-white/70 p-4">
              {rows.length === 0 ? (
                <>
                  <p className="text-xs text-muted">
                    There are no active donations for this item. If it is a wrong spelling or is no longer needed,
                    you can delete it from Inventory.
                  </p>
                  {inventoryId && (
                    <button
                      onClick={removeItem}
                      disabled={deleting}
                      className="mt-3 rounded-lg bg-admin px-4 py-2 text-xs font-bold text-white hover:bg-admin-dark disabled:opacity-50"
                    >
                      {deleting ? 'Deleting…' : 'Delete item from inventory'}
                    </button>
                  )}
                  {deleteError && <p className="mt-2 text-xs font-semibold text-admin">{deleteError}</p>}
                </>
              ) : (
                <p className="text-xs text-muted">
                  Wrong spelling? Open an entry above, tap <span className="font-semibold">Edit</span> and fix the item name.
                  Once this item has no donations left, a delete button will appear here.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}