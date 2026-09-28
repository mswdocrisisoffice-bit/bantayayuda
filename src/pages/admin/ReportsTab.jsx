import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { CATEGORIES, UNITS } from './DonationsTab.jsx'
import ReportCharts from './ReportCharts.jsx'
import { BARANGAY_POSITIONS } from '../../components/ui/BarangayMap.jsx'
import { supabase } from '../../lib/supabase.js'

function toCsv(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')
  return `${header}\n${body}`
}

function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const LOW_STOCK_THRESHOLD = 10

/* One color family per category so every box is easy to tell apart */
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

function colorFor(category) {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]
  let hash = 0
  for (const ch of String(category || '')) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

/* Display-only cleanup: "alae" -> "Alae", "fabila, gl, rivera" -> "Fabila, gl, Rivera" */
function tidy(text) {
  return String(text || '')
    .split(' ')
    .map((w) =>
      w.replace(/[^a-z]/gi, '').length > 2 && w === w.toLowerCase()
        ? w.charAt(0).toUpperCase() + w.slice(1)
        : w
    )
    .join(' ')
}

function StockBadge({ qty }) {
  if (qty <= 0) {
    return (
      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-admin-dark">
        Out of stock
      </span>
    )
  }
  if (qty <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn-text">
        Low stock
      </span>
    )
  }
  return (
    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-beneficiary-dark">
      In stock
    </span>
  )
}

/* ── Copyable serial number chip ── */
function SerialChip({ serial }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e) {
    e.stopPropagation()
    if (!serial) return
    try {
      await navigator.clipboard.writeText(serial)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — fall back to manual select
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy serial number"
      className="no-print inline-flex items-center gap-1 rounded bg-admin-light px-2 py-1 font-mono text-[11px] font-bold text-admin-dark hover:bg-admin/20"
    >
      {serial || '—'}
      <span className="text-[10px]">{copied ? '✓ Copied' : '⧉'}</span>
    </button>
  )
}

function ReplyForm({ flag, onReplied }) {
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState(flag.admin_reply || '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!reply.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('donation_flags')
      .update({ admin_reply: reply.trim(), replied_at: new Date().toISOString() })
      .eq('id', flag.id)
    setSaving(false)
    if (!error) {
      setOpen(false)
      onReplied?.()
    }
  }

  if (flag.admin_reply && !open) {
    return (
      <div className="mt-1">
        <div className="rounded-lg bg-beneficiary-light px-3 py-2 text-[11px] text-beneficiary-dark">
          Your reply: "{flag.admin_reply}"
        </div>
        <button
          onClick={() => setOpen(true)}
          className="mt-1 text-[11px] font-semibold text-faint hover:text-admin"
        >
          Edit reply
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-[11px] font-semibold text-admin-dark"
      >
        Reply to donor
      </button>
    )
  }

  return (
    <div className="mt-1">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="e.g. Corrected the quantity to 25kg, thank you for flagging."
        rows={2}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
      />
      <div className="mt-1 flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-admin px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Sending…' : 'Send reply'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-faint"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

const editInputClass = "w-full rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"

function EditDistributionRow({ dist, onCancel, onSaved }) {
  const [form, setForm] = useState({
    category: dist.category || '',
    item: dist.item || '',
    quantity: dist.quantity ?? '',
    unit: dist.unit || 'kg',
    barangay: dist.barangay || '',
    household_head: dist.household_head || '',
    serial_number: dist.serial_number || '',
  })
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('distributions')
      .update({
        category: form.category,
        item: form.item,
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        barangay: form.barangay,
        household_head: form.household_head,
        serial_number: form.serial_number,
      })
      .eq('id', dist.id)
    setSaving(false)
    if (!error) onSaved()
  }

  return (
    <div className="rounded-lg border border-admin bg-admin-light px-4 py-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Category</label>
          <select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className={editInputClass}
          >
            <option value="" disabled>Select category</option>
            {Object.keys(CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Item</label>
          <input value={form.item} onChange={(e) => update('item', e.target.value)} className={editInputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Quantity</label>
          <input type="number" min="0" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} className={editInputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Unit</label>
          <select value={form.unit} onChange={(e) => update('unit', e.target.value)} className={editInputClass}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Barangay</label>
          <input value={form.barangay} onChange={(e) => update('barangay', e.target.value)} className={editInputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Household head</label>
          <input value={form.household_head} onChange={(e) => update('household_head', e.target.value)} className={editInputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-muted">Serial number</label>
          <input value={form.serial_number} onChange={(e) => update('serial_number', e.target.value)} className={editInputClass} />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-admin px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-faint">
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ── One distribution record, shown inside its beneficiary card ── */
function DistributionRow({ dist, isOpen, onToggle, isEditing, onEdit, onCancelEdit, onSaved }) {
  if (isEditing) {
    return <EditDistributionRow dist={dist} onCancel={onCancelEdit} onSaved={onSaved} />
  }

  const c = colorFor(dist.category)

  return (
    <div className="rounded-lg border border-line-soft bg-white">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: c.accent }} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{dist.item}</div>
            <div className="text-[11px] text-faint">
              {dist.category || 'Uncategorized'} · {formatDateTime(dist.created_at)}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <span
            className="rounded-md px-2.5 py-1 text-xs font-bold"
            style={{ background: c.bg, color: c.accent }}
          >
            {dist.quantity ?? 0} {dist.unit || ''}
          </span>
          <button onClick={onToggle} className="no-print text-xs text-faint">{isOpen ? '▲' : '▼'}</button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-line-soft px-4 py-3 text-xs text-muted">
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            <div><span className="text-faint">Category:</span> {dist.category || '—'}</div>
            <div><span className="text-faint">Region/Province:</span> {[dist.region, dist.province].filter(Boolean).join(', ') || '—'}</div>
            <div><span className="text-faint">City/Municipality:</span> {dist.city_municipality || '—'}</div>
            <div><span className="text-faint">Evacuation center:</span> {dist.evacuation_center || '—'}</div>
            <div><span className="text-faint">Contact:</span> {dist.contact_primary || '—'}</div>
            <div><span className="text-faint">4Ps beneficiary:</span> {dist.is_4ps_beneficiary ? 'Yes' : 'No'}</div>
            <div><span className="text-faint">Status:</span> {dist.status || '—'}</div>
            <div><span className="text-faint">Recorded:</span> {formatDateTime(dist.created_at)}</div>
          </div>
          <button
            onClick={onEdit}
            className="no-print mt-3 rounded-lg bg-line-soft px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-line"
          >
            Edit this record
          </button>
        </div>
      )}
    </div>
  )
}

/* ── One beneficiary household as a tappable card; opens to list everything they received ── */
function BeneficiarySection({
  group, isOpen, onToggleSection,
  openDistId, setOpenDistId, editingDistId, setEditingDistId, onSaved,
}) {
  const categories = useMemo(() => {
    return [...new Set(group.items.map((d) => d.category || 'Uncategorized'))]
  }, [group.items])

  return (
    <div
      className={`overflow-hidden rounded-card bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] ${
        isOpen ? 'md:col-span-2 print:col-span-1' : ''
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleSection}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleSection() }}
        className="flex w-full cursor-pointer items-start justify-between gap-3 p-4 text-left transition hover:bg-line-soft/40"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-ink">
            {tidy(group.household_head) || 'Unnamed household'}
          </div>
          <div className="mt-0.5 text-[11px] text-faint">
            Brgy. {tidy(group.barangay) || '—'} · Last: {formatDateTime(group.latest)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SerialChip serial={group.serial} />
            <span className="flex items-center gap-1">
              {categories.map((cat) => (
                <span
                  key={cat}
                  title={cat}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: colorFor(cat).accent }}
                />
              ))}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center">
          <span className="rounded-lg bg-admin-light px-3 py-1.5 text-center text-admin-dark">
            <span className="block text-xl font-bold leading-none">{group.items.length}</span>
            <span className="text-[10px] font-semibold">item{group.items.length === 1 ? '' : 's'}</span>
          </span>
          <span className="no-print mt-1 text-xs text-faint">{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-2 border-t border-line-soft bg-line-soft/30 p-4">
          {group.items.map((d) => (
            <DistributionRow
              key={d.id}
              dist={d}
              isOpen={openDistId === d.id}
              onToggle={() => setOpenDistId((cur) => (cur === d.id ? null : d.id))}
              isEditing={editingDistId === d.id}
              onEdit={() => setEditingDistId(d.id)}
              onCancelEdit={() => setEditingDistId(null)}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── One barangay as a tappable box: donations from it + aid given to it ── */
function BarangayBox({ row, isOpen, onToggle }) {
  return (
    <div
      className={`overflow-hidden rounded-card border-t-4 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] ${
        isOpen ? 'col-span-2 sm:col-span-3 lg:col-span-4' : ''
      }`}
      style={{ borderTopColor: row.official ? '#4A7A2E' : '#E8A33D' }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}
        className="cursor-pointer p-3 transition hover:bg-line-soft/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-bold leading-tight text-ink">{row.label}</div>
          <span className="no-print text-xs text-faint">{isOpen ? '▲' : '▼'}</span>
        </div>
        {!row.official && row.key !== 'unspecified' && (
          <div className="mt-0.5 text-[10px] font-semibold text-warn-text">⚠ Not in official list</div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-donor-light p-2 text-center">
            <div className="text-xl font-bold leading-none text-donor-dark">{row.donations}</div>
            <div className="mt-1 text-[10px] font-semibold text-muted">donations</div>
          </div>
          <div className="rounded-lg bg-beneficiary-light p-2 text-center">
            <div className="text-xl font-bold leading-none text-beneficiary-dark">{row.distributions}</div>
            <div className="mt-1 text-[10px] font-semibold text-muted">given aid</div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="grid gap-4 border-t border-line-soft bg-line-soft/30 p-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-donor-dark">
              Donated from here · {row.confirmed} of {row.donations} confirmed
            </div>
            {row.donatedItems.length === 0 ? (
              <p className="text-[11px] text-faint">No donations.</p>
            ) : (
              <div className="space-y-1.5">
                {row.donatedItems.map((it) => (
                  <div key={`${it.item}|${it.unit}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="font-semibold text-ink">{it.item}{it.count > 1 ? ` ×${it.count}` : ''}</span>
                    <span className="font-bold text-donor-dark">{it.total} {it.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-beneficiary-dark">
              Given to here · {row.households} household{row.households === 1 ? '' : 's'}
            </div>
            {row.givenItems.length === 0 ? (
              <p className="text-[11px] text-faint">No aid given yet.</p>
            ) : (
              <div className="space-y-1.5">
                {row.givenItems.map((it) => (
                  <div key={`${it.item}|${it.unit}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="font-semibold text-ink">{it.item}{it.count > 1 ? ` ×${it.count}` : ''}</span>
                    <span className="font-bold text-beneficiary-dark">{it.total} {it.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── One donor as a tappable card: donations grouped by item, plus their comments ── */
function DonorCard({ donor, donations, flags, onArchiveFlag, busyFlagId, onReplied }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const name =
    donor.full_name ||
    donations.find((d) => d.donor_name)?.donor_name ||
    (donor.email ? donor.email.split('@')[0] : 'Unnamed donor')

  const grouped = useMemo(() => {
    const map = {}
    donations.forEach((d) => {
      const k = `${String(d.item || '').trim().toLowerCase()}|${d.unit || ''}`
      if (!map[k]) map[k] = { item: d.item || '—', unit: d.unit || '', category: d.category, count: 0, total: 0, last: d.created_at }
      map[k].count += 1
      map[k].total += Number(d.quantity) || 0
      if (new Date(d.created_at) > new Date(map[k].last)) map[k].last = d.created_at
    })
    return Object.values(map).sort((a, b) => b.count - a.count || b.total - a.total)
  }, [donations])

  const unreplied = flags.filter((f) => !f.admin_reply).length
  const latest = donations[0]?.created_at

  return (
    <div
      className={`overflow-hidden rounded-card border border-line-soft bg-white ${
        open ? 'md:col-span-2' : ''
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((o) => !o) }}
        className="flex cursor-pointer items-center justify-between gap-3 p-4 transition hover:bg-line-soft/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-ink">{name}</div>
            <div className="truncate text-[11px] text-faint">{donor.email}</div>
            {latest && <div className="text-[11px] text-faint">Last donated: {formatDateTime(latest)}</div>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-lg bg-donor-light px-3 py-1.5 text-center text-donor-dark">
            <span className="block text-xl font-bold leading-none">{donations.length}</span>
            <span className="text-[10px] font-semibold">donation{donations.length === 1 ? '' : 's'}</span>
          </span>
          {flags.length > 0 && (
            <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[10px] font-bold text-warn-text">
              {unreplied > 0 ? `${unreplied} to reply` : `${flags.length} comment${flags.length === 1 ? '' : 's'}`}
            </span>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-line-soft bg-line-soft/30 p-4">
          {donations.length > 0 && (
            <>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">What they donated</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {grouped.map((g) => {
                  const c = colorFor(g.category)
                  return (
                    <div key={`${g.item}|${g.unit}`} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2">
                      <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: c.accent }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{g.item}</div>
                        <div className="text-[11px] text-faint">
                          {g.count} time{g.count === 1 ? '' : 's'} · last {formatDateTime(g.last)}
                        </div>
                      </div>
                      <span className="rounded-md px-2.5 py-1 text-xs font-bold" style={{ background: c.bg, color: c.accent }}>
                        {g.total} {g.unit}
                      </span>
                    </div>
                  )
                })}
              </div>

              {donations.length > grouped.length && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-[11px] font-semibold text-admin-dark hover:underline"
                  >
                    {showAll ? 'Hide' : 'Show'} all {donations.length} entries
                  </button>
                  {showAll && (
                    <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg bg-white p-3">
                      {donations.map((d) => (
                        <div key={d.id} className="text-xs text-muted">
                          • {d.item} {d.quantity ? `(${d.quantity} ${d.unit || ''})` : ''} — Brgy. {tidy(d.barangay)} —{' '}
                          <span className="text-faint">{formatDateTime(d.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {flags.length > 0 && (
            <div className={`${donations.length > 0 ? 'mt-4 border-t border-line-soft pt-3' : ''}`}>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Comments</div>
              <div className="space-y-3">
                {flags.map((f) => (
                  <div key={f.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="rounded-lg bg-warn-bg px-3 py-2 text-[11px] text-warn-text">
                        "{f.message}"{' '}
                        <span className="text-faint">— {formatDateTime(f.created_at)}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Archive this comment? It will move to the Archive tab.')) {
                            onArchiveFlag(f.id)
                          }
                        }}
                        disabled={busyFlagId === f.id}
                        className="shrink-0 rounded-lg bg-admin px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-admin-dark disabled:opacity-50"
                      >
                        {busyFlagId === f.id ? 'Archiving…' : 'Archive'}
                      </button>
                    </div>
                    <ReplyForm flag={f} onReplied={onReplied} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReportsTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [donations, setDonations] = useState([])
  const [distributions, setDistributions] = useState([])
  const [inventory, setInventory] = useState([])
  const [donors, setDonors] = useState([])
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyFlagId, setBusyFlagId] = useState(null)
  const [openDistId, setOpenDistId] = useState(null)
  const [editingDistId, setEditingDistId] = useState(null)
  const [openBeneficiaries, setOpenBeneficiaries] = useState({})
  const [flashDonations, setFlashDonations] = useState(false)
  const [flashDistributions, setFlashDistributions] = useState(false)
  const [flashBeneficiaries, setFlashBeneficiaries] = useState(false)
  const [flashStock, setFlashStock] = useState(false)
  const [itemFilter, setItemFilter] = useState('') // tapped stock item -> show who received it
  const [stockView, setStockView] = useState('all') // 'all' | 'attention'
  const [openBarangays, setOpenBarangays] = useState({})

  const donationsRef = useRef(null)
  const distributionsRef = useRef(null)
  const beneficiariesRef = useRef(null)
  const stockRef = useRef(null)
  const rootRef = useRef(null)

  /* When printing (button or Ctrl+P), hide everything on the page except this report,
     e.g. the admin sidebar, then restore it afterwards. */
  useEffect(() => {
    const marked = []
    function mark(el, attr) {
      el.setAttribute(attr, '')
      marked.push([el, attr])
    }
    function beforePrint() {
      let node = rootRef.current
      while (node && node !== document.documentElement) {
        mark(node, 'data-print-keep')
        const parent = node.parentElement
        if (parent) {
          Array.from(parent.children).forEach((sib) => {
            if (sib !== node && !['STYLE', 'SCRIPT', 'LINK', 'HEAD'].includes(sib.tagName)) {
              mark(sib, 'data-print-hide')
            }
          })
        }
        node = parent
      }
    }
    function afterPrint() {
      marked.forEach(([el, attr]) => el.removeAttribute(attr))
      marked.length = 0
    }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
      afterPrint()
    }
  }, [])

  function showRecipientsOf(itemName) {
    setItemFilter(itemName)
    setOpenBeneficiaries({})
    scrollToSection(beneficiariesRef, setFlashBeneficiaries)
  }

  function scrollToSection(ref, highlightSetter) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (highlightSetter) {
      highlightSetter(true)
      setTimeout(() => highlightSetter(false), 1200)
    }
  }

  async function loadAll() {
    setLoading(true)
    const [donationsRes, distributionsRes, inventoryRes, donorsRes, flagsRes] = await Promise.all([
      supabase.from('donations').select('*').order('created_at', { ascending: false }),
      supabase.from('distributions').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory').select('*').order('category', { ascending: true }).order('item', { ascending: true }),
      supabase.from('profiles').select('*').eq('role', 'donor'),
      supabase
        .from('donation_flags')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false }),
    ])
    setDonations(donationsRes.data || [])
    setDistributions(distributionsRes.data || [])
    setInventory(inventoryRes.data || [])
    setDonors(donorsRes.data || [])
    setFlags(flagsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function archiveFlag(id) {
    setBusyFlagId(id)
    const { error } = await supabase
      .from('donation_flags')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', id)
    setBusyFlagId(null)
    if (!error) loadAll()
  }

  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      if (d.status === 'archived') return false
      const created = d.created_at?.slice(0, 10)
      if (dateFrom && created < dateFrom) return false
      if (dateTo && created > dateTo) return false
      return true
    })
  }, [donations, dateFrom, dateTo])

  const dateFilteredDistributions = useMemo(() => {
    return distributions.filter((d) => {
      const created = d.created_at?.slice(0, 10)
      if (dateFrom && created < dateFrom) return false
      if (dateTo && created > dateTo) return false
      return true
    })
  }, [distributions, dateFrom, dateTo])

  const filteredDistributions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return dateFilteredDistributions
    return dateFilteredDistributions.filter((d) => {
      return [
        d.serial_number, d.household_head, d.barangay,
        d.item, d.category, d.city_municipality, d.evacuation_center,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [dateFilteredDistributions, search])

  /* Group distribution records by beneficiary (serial number) — the serial belongs
     to the household, and one household can receive many different items. */
  const beneficiaryDistributions = useMemo(() => {
    if (!itemFilter) return filteredDistributions
    const key = itemFilter.trim().toLowerCase()
    return filteredDistributions.filter((d) => String(d.item || '').trim().toLowerCase() === key)
  }, [filteredDistributions, itemFilter])

  const beneficiaryGroups = useMemo(() => {
    const map = {}
    beneficiaryDistributions.forEach((d) => {
      const key = d.serial_number || `no-serial-${d.household_head || d.id}`
      if (!map[key]) {
        map[key] = {
          key,
          serial: d.serial_number || '',
          household_head: d.household_head,
          barangay: d.barangay,
          latest: d.created_at,
          items: [],
        }
      }
      map[key].items.push(d)
      if (new Date(d.created_at) > new Date(map[key].latest)) map[key].latest = d.created_at
    })
    return Object.values(map).sort((a, b) => new Date(b.latest) - new Date(a.latest))
  }, [beneficiaryDistributions])

  const beneficiariesRegisteredCount = beneficiaryGroups.length

  /* Total quantity given out per (category, item, unit) within the filtered range */
  const givenOutByKey = useMemo(() => {
    const map = {}
    filteredDistributions.forEach((d) => {
      const key = `${d.category || ''}|${d.item || ''}|${d.unit || ''}`
      map[key] = (map[key] || 0) + (Number(d.quantity) || 0)
    })
    return map
  }, [filteredDistributions])

  /* Current stock (live, from inventory table) alongside how much was given out
     in the selected date range — "bilin" vs "nabawas". */
  const stockStatus = useMemo(() => {
    return inventory
      .map((inv) => {
        const key = `${inv.category || ''}|${inv.item || ''}|${inv.unit || ''}`
        return {
          id: inv.id,
          category: inv.category || 'Uncategorized',
          item: inv.item,
          unit: inv.unit,
          remaining: inv.quantity_on_hand,
          given_out: givenOutByKey[key] || 0,
        }
      })
      .filter((row) => {
        if (!search.trim()) return true
        const q = search.trim().toLowerCase()
        return [row.item, row.category].some((v) => String(v).toLowerCase().includes(q))
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.item.localeCompare(b.item))
  }, [inventory, givenOutByKey, search])

  const needsAttentionCount = useMemo(
    () => stockStatus.filter((r) => Number(r.remaining) <= LOW_STOCK_THRESHOLD).length,
    [stockStatus]
  )

  const stockGroups = useMemo(() => {
    const rows =
      stockView === 'attention'
        ? stockStatus.filter((r) => Number(r.remaining) <= LOW_STOCK_THRESHOLD)
        : stockStatus
    const map = {}
    rows.forEach((r) => {
      if (!map[r.category]) map[r.category] = []
      map[r.category].push(r)
    })
    return Object.entries(map)
  }, [stockStatus, stockView])

  const totalItemsGivenOut = useMemo(() => {
    return filteredDistributions.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0)
  }, [filteredDistributions])

  /* Dates that actually have distribution activity, with counts — used as
     quick-jump suggestions so staff don't have to guess which day to open. */
  const activeDates = useMemo(() => {
    const map = {}
    distributions.forEach((d) => {
      const day = d.created_at?.slice(0, 10)
      if (!day) return
      map[day] = (map[day] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
  }, [distributions])

  function formatDayLabel(isoDay) {
    const d = new Date(`${isoDay}T00:00:00`)
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  function applyQuickRange(kind) {
    const now = new Date()
    const toISODate = (d) => d.toISOString().slice(0, 10)

    if (kind === 'today') {
      const t = toISODate(now)
      setDateFrom(t)
      setDateTo(t)
    } else if (kind === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      const t = toISODate(y)
      setDateFrom(t)
      setDateTo(t)
    } else if (kind === 'week') {
      const start = new Date(now)
      start.setDate(start.getDate() - 6)
      setDateFrom(toISODate(start))
      setDateTo(toISODate(now))
    } else if (kind === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateFrom(toISODate(start))
      setDateTo(toISODate(now))
    } else if (kind === 'all') {
      setDateFrom('')
      setDateTo('')
    }
  }

  const byBarangay = useMemo(() => {
    const map = {}
    filteredDonations.forEach((d) => {
      const b = d.barangay || 'Unspecified'
      map[b] = map[b] || { barangay: b, donations: 0, confirmed: 0 }
      map[b].donations += 1
      if (d.status === 'confirmed') map[b].confirmed += 1
    })
    return Object.values(map).sort((a, b) => b.donations - a.donations)
  }, [filteredDonations])

  const distributionsByBarangay = useMemo(() => {
    const map = {}
    filteredDistributions.forEach((d) => {
      const b = d.barangay || 'Unspecified'
      map[b] = map[b] || { barangay: b, distributions: 0 }
      map[b].distributions += 1
    })
    return Object.values(map).sort((a, b) => b.distributions - a.distributions)
  }, [filteredDistributions])

  /* One row per barangay: donations FROM it + aid given TO it (date range applies) */
  const barangaySummary = useMemo(() => {
    const officialByKey = {}
    BARANGAY_POSITIONS.forEach((b) => { officialByKey[b.name.trim().toLowerCase()] = b.name })

    const map = {}
    function ensure(raw) {
      const key = String(raw || '').trim().toLowerCase() || 'unspecified'
      if (!map[key]) {
        const official = officialByKey[key]
        map[key] = {
          key,
          official: !!official,
          label: official || (key === 'unspecified' ? 'No barangay recorded' : tidy(String(raw).trim())),
          donations: 0, confirmed: 0, distributions: 0,
          households: new Set(), donated: {}, given: {},
        }
      }
      return map[key]
    }
    function addItem(bucket, d) {
      const k = `${String(d.item || '').trim().toLowerCase()}|${d.unit || ''}`
      if (!bucket[k]) bucket[k] = { item: d.item || '—', unit: d.unit || '', count: 0, total: 0 }
      bucket[k].count += 1
      bucket[k].total += Number(d.quantity) || 0
    }

    filteredDonations.forEach((d) => {
      const r = ensure(d.barangay)
      r.donations += 1
      if (d.status === 'confirmed') r.confirmed += 1
      addItem(r.donated, d)
    })
    filteredDistributions.forEach((d) => {
      const r = ensure(d.barangay)
      r.distributions += 1
      const id = d.serial_number || d.household_head
      if (id) r.households.add(id)
      addItem(r.given, d)
    })

    return Object.values(map)
      .map((r) => ({
        ...r,
        households: r.households.size,
        donatedItems: Object.values(r.donated).sort((a, b) => b.total - a.total),
        givenItems: Object.values(r.given).sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.donations + b.distributions - (a.donations + a.distributions))
  }, [filteredDonations, filteredDistributions])

  const unofficialBarangays = barangaySummary.filter((r) => !r.official && r.key !== 'unspecified')

  const uniqueHouseholds = useMemo(() => {
    return new Set(
      filteredDistributions
        .map((d) => d.serial_number || d.household_head)
        .filter(Boolean)
    ).size
  }, [filteredDistributions])

  const donorSummaries = useMemo(() => {
    return donors
      .map((donor) => {
        const theirDonations = donations.filter((d) => d.donor_id === donor.id && d.status !== 'archived')
        const theirFlags = flags.filter((f) => f.donor_id === donor.id)
        return { donor, donations: theirDonations, flags: theirFlags }
      })
      .filter((s) => s.donations.length > 0 || s.flags.length > 0)
      .sort((a, b) => new Date(b.donations[0]?.created_at || 0) - new Date(a.donations[0]?.created_at || 0))
  }, [donors, donations, flags])

  function exportDistributionsCsv() {
    const csv = toCsv(filteredDistributions, [
      { key: 'created_at', label: 'Date & time' },
      { key: 'serial_number', label: 'Serial number' },
      { key: 'household_head', label: 'Household head' },
      { key: 'barangay', label: 'Barangay' },
      { key: 'category', label: 'Category' },
      { key: 'item', label: 'Item' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unit', label: 'Unit' },
      { key: 'status', label: 'Status' },
    ])
    downloadCsv(`distributions_report_${dateFrom || 'all'}_${dateTo || 'all'}.csv`, csv)
  }

  function exportBarangaySummaryCsv() {
    const csv = toCsv(barangaySummary, [
      { key: 'label', label: 'Barangay' },
      { key: 'donations', label: 'Donations from barangay' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'distributions', label: 'Distribution records' },
      { key: 'households', label: 'Households given aid' },
    ])
    downloadCsv(`barangay_summary_${dateFrom || 'all'}_${dateTo || 'all'}.csv`, csv)
  }

  function exportStockStatusCsv() {
    const csv = toCsv(stockStatus, [
      { key: 'category', label: 'Category' },
      { key: 'item', label: 'Item' },
      { key: 'unit', label: 'Unit' },
      { key: 'remaining', label: 'Stock remaining' },
      { key: 'given_out', label: 'Given out (in range)' },
    ])
    downloadCsv(`stock_status_${dateFrom || 'all'}_${dateTo || 'all'}.csv`, csv)
  }

  function toggleBeneficiary(key) {
    setOpenBeneficiaries((cur) => ({ ...cur, [key]: !cur[key] }))
  }

  function expandAllBeneficiaries() {
    const all = {}
    beneficiaryGroups.forEach((g) => { all[g.key] = true })
    setOpenBeneficiaries(all)
  }

  function handlePrint() {
    expandAllBeneficiaries()
    // Give React a tick to render expanded sections before the print dialog opens.
    setTimeout(() => window.print(), 50)
  }

  return (
    <div ref={rootRef}>
      <style>{`
        @page { margin: 10mm; }
        @media print {
          /* Everything outside the report (sidebar, top bars, background) is hidden */
          [data-print-hide] { display: none !important; }
          /* Layout wrappers that contain the report: strip sizing/scroll/background so it flows across pages */
          [data-print-keep] {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: none !important;
            box-shadow: none !important;
            transform: none !important;
          }
          html, body { background: white !important; height: auto !important; overflow: visible !important; }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          [class*="shadow-"] { box-shadow: none !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; }
          button { break-inside: avoid; }
          section h3 { break-after: avoid; }
        }
      `}</style>

      <div className="mb-6 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-xl font-bold text-admin-dark">Reports</h1>
            <p className="text-xs text-faint">
              Filter by date, search records, and export or print for DSWD / LGU reporting
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="no-print rounded-lg bg-admin px-4 py-2 text-xs font-bold text-white hover:bg-admin-dark"
          >
            🖨 Print report
          </button>
        </div>
      </div>

      {/* ── Filters: styled like the other report cards ── */}
      <div className="no-print mb-4 overflow-hidden rounded-card border-t-4 border-t-admin bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Filters</h2>
            {(dateFrom || dateTo || search) && (
              <button
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                  setSearch('')
                }}
                className="rounded-full bg-admin-light px-3 py-1 text-[11px] font-semibold text-admin-dark hover:bg-admin/20"
              >
                Clear filters ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Search (serial no., name, barangay, item)
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. MF-2026-117072 or Rivera"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
              />
            </div>
          </div>
        </div>

        {/* Quick date-range shortcuts */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line-soft bg-line-soft/30 px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Quick pick</span>
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'week', label: 'Last 7 days' },
            { key: 'month', label: 'This month' },
            { key: 'all', label: 'All time' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => applyQuickRange(opt.key)}
              className="rounded-full bg-admin-light px-3 py-1 text-[11px] font-bold text-admin-dark transition hover:bg-admin hover:text-white"
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Days that actually have activity — tap to jump straight to that day */}
        {activeDates.length > 0 && (
          <div className="border-t border-line-soft px-5 py-3">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-muted">
              Days with activity — tap to view that day
            </span>
            <div className="flex flex-wrap gap-2">
              {activeDates.map(([day, count]) => {
                const active = dateFrom === day && dateTo === day
                return (
                  <button
                    key={day}
                    onClick={() => { setDateFrom(day); setDateTo(day) }}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
                      active
                        ? 'border-admin bg-admin text-white'
                        : 'border-line-soft bg-white text-ink hover:border-admin hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    {formatDayLabel(day)}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        active ? 'bg-white/25 text-white' : 'bg-admin-light text-admin-dark'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-faint">Loading report data…</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
            <button
              onClick={() => {
                setOpenBeneficiaries({})
                scrollToSection(donationsRef, setFlashDonations)
              }}
              className="no-print-hover rounded-card bg-white p-5 text-left shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] active:translate-y-0"
            >
              <div className="text-xs text-faint">Donations in range</div>
              <div className="mt-1 text-2xl font-bold text-ink">{filteredDonations.length}</div>
              <div className="mt-1 text-[10px] font-semibold text-admin-dark">Tap to view ↓</div>
            </button>
            <button
              onClick={() => scrollToSection(beneficiariesRef, setFlashDistributions)}
              className="no-print-hover rounded-card bg-white p-5 text-left shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] active:translate-y-0"
            >
              <div className="text-xs text-faint">Distribution records</div>
              <div className="mt-1 text-2xl font-bold text-ink">
                {filteredDistributions.length}
              </div>
              <div className="mt-1 text-[10px] font-semibold text-admin-dark">Tap to view ↓</div>
            </button>
            <button
              onClick={() => {
                expandAllBeneficiaries()
                scrollToSection(beneficiariesRef, setFlashBeneficiaries)
              }}
              className="no-print-hover rounded-card bg-white p-5 text-left shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] active:translate-y-0"
            >
              <div className="text-xs text-faint">Beneficiaries registered</div>
              <div className="mt-1 text-2xl font-bold text-ink">{beneficiariesRegisteredCount}</div>
              <div className="mt-1 text-[10px] font-semibold text-admin-dark">Tap to view ↓</div>
            </button>
            <button
              onClick={() => scrollToSection(stockRef, setFlashStock)}
              className="no-print-hover rounded-card bg-white p-5 text-left shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] active:translate-y-0"
            >
              <div className="text-xs text-faint">Total items given out</div>
              <div className="mt-1 text-2xl font-bold text-ink">{totalItemsGivenOut}</div>
              <div className="mt-1 text-[10px] font-semibold text-admin-dark">Tap to view stock ↓</div>
            </button>
          </div>

          {/* ── Charts: barangay coverage, most stocked items, donations this month ── */}
          <ReportCharts
            donations={donations}
            distributions={filteredDistributions}
            inventory={inventory}
          />

          {/* ── Stock status: how much is left vs. how much was given out ── */}
          <div ref={stockRef} className="scroll-mt-24">
          <Card
            className={`mb-6 p-5 print-area transition-shadow duration-500 ${
              flashStock ? 'ring-4 ring-admin/40' : ''
            }`}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">Stock status</h2>
                <p className="text-[11px] text-faint">
                  Big number = stock remaining now. "Given out" only counts the selected date range.
                  <span className="no-print"> Tap an item to see who received it.</span>
                </p>
              </div>
              <button
                onClick={exportStockStatusCsv}
                className="no-print text-xs font-semibold text-admin-dark"
              >
                Export CSV ↓
              </button>
            </div>

            <div className="no-print mb-4 flex flex-wrap gap-2">
              {[
                { key: 'all', label: `All items · ${stockStatus.length}` },
                { key: 'attention', label: `Needs attention · ${needsAttentionCount}` },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStockView(opt.key)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                    stockView === opt.key
                      ? 'border-admin bg-admin text-white'
                      : 'border-line-soft bg-white text-muted hover:border-admin hover:text-admin-dark'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {stockGroups.length === 0 ? (
              <p className="text-xs text-faint">
                {stockView === 'attention' ? 'Nothing is low or out of stock right now.' : 'No inventory items found.'}
              </p>
            ) : (
              <div className="space-y-5">
                {stockGroups.map(([category, rows]) => {
                  const c = colorFor(category)
                  return (
                    <section key={category}>
                      <div
                        className="mb-2 flex items-center justify-between border-b pb-1.5"
                        style={{ borderColor: c.border }}
                      >
                        <h3
                          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide"
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
                        {rows.map((row) => {
                          const out = Number(row.remaining) <= 0
                          const handled = Number(row.remaining) + Number(row.given_out)
                          const pct = handled > 0 ? Math.min(100, (Number(row.given_out) / handled) * 100) : 0
                          return (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => showRecipientsOf(row.item)}
                              className="flex min-h-[150px] flex-col justify-between rounded-lg border border-t-4 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                              style={{
                                background: c.bg,
                                borderColor: c.border,
                                borderTopColor: c.accent,
                              }}
                            >
                              <div className="text-sm font-semibold leading-tight text-ink">{row.item}</div>

                              <div className="mt-2">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                                  Stock remaining
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span
                                    className="text-2xl font-bold"
                                    style={{ color: out ? '#9A9A92' : c.accent }}
                                  >
                                    {row.remaining}
                                  </span>
                                  <span
                                    className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold"
                                    style={{ color: c.accent }}
                                  >
                                    {row.unit}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-faint">Given out</span>
                                  <span className="font-bold text-ink">
                                    {row.given_out} {row.unit}
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, background: c.accent }}
                                  />
                                </div>
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-1">
                                <StockBadge qty={Number(row.remaining)} />
                                <span className="no-print text-[10px] font-semibold text-admin-dark">Who received? →</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </Card>
          </div>

          {/* ── Distributions grouped by beneficiary (the serial number is theirs) ── */}
          <div
            ref={beneficiariesRef}
            className={`mb-6 scroll-mt-24 rounded-card transition-shadow duration-500 ${
              flashBeneficiaries || flashDistributions ? 'ring-4 ring-admin/40' : ''
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">Beneficiaries &amp; what they received</h2>
                <p className="no-print text-[11px] text-faint">Tap a household to see everything they received.</p>
                {itemFilter && (
                  <button
                    onClick={() => setItemFilter('')}
                    className="no-print mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-admin px-3 py-1 text-[11px] font-semibold text-white"
                  >
                    Showing who received: {itemFilter} ✕
                  </button>
                )}
              </div>
              <div className="no-print flex items-center gap-3">
                <button
                  onClick={expandAllBeneficiaries}
                  className="text-xs font-semibold text-faint hover:text-admin"
                >
                  Expand all
                </button>
                <button
                  onClick={() => setOpenBeneficiaries({})}
                  className="text-xs font-semibold text-faint hover:text-admin"
                >
                  Collapse all
                </button>
                <button
                  onClick={exportDistributionsCsv}
                  className="text-xs font-semibold text-admin-dark"
                >
                  Export CSV ↓
                </button>
              </div>
            </div>

            {beneficiaryGroups.length === 0 ? (
              <Card className="p-5">
                <p className="text-xs text-faint">No distributions match your filters.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 print:grid-cols-1">
                {beneficiaryGroups.map((group) => (
                  <BeneficiarySection
                    key={group.key}
                    group={group}
                    isOpen={!!openBeneficiaries[group.key]}
                    onToggleSection={() => toggleBeneficiary(group.key)}
                    openDistId={openDistId}
                    setOpenDistId={setOpenDistId}
                    editingDistId={editingDistId}
                    setEditingDistId={setEditingDistId}
                    onSaved={() => {
                      setEditingDistId(null)
                      loadAll()
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            ref={donationsRef}
            className={`scroll-mt-24 rounded-card transition-shadow duration-500 ${
              flashDonations ? 'ring-4 ring-admin/40' : ''
            }`}
          >
          <Card className="no-print mb-4 p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-ink">Barangay summary</h2>
              <button
                onClick={exportBarangaySummaryCsv}
                className="text-xs font-semibold text-admin-dark"
              >
                Export CSV ↓
              </button>
            </div>
            <p className="mb-3 text-[11px] text-faint">
              <span className="font-semibold text-donor-dark">Donations</span> = came from that barangay.{' '}
              <span className="font-semibold text-beneficiary-dark">Given aid</span> = distributed to households there.
              Tap a box to see the items.
            </p>

            {unofficialBarangays.length > 0 && (
              <div className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-[11px] text-warn-text">
                ⚠ {unofficialBarangays.map((r) => r.label).join(', ')} {unofficialBarangays.length === 1 ? "isn't" : "aren't"} in the
                official list of 22 barangays. Possible spelling differences, so they're counted separately.
              </div>
            )}

            {barangaySummary.length === 0 ? (
              <p className="text-xs text-faint">No donations or distributions in this date range.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {barangaySummary.map((row) => (
                  <BarangayBox
                    key={row.key}
                    row={row}
                    isOpen={!!openBarangays[row.key]}
                    onToggle={() => setOpenBarangays((cur) => ({ ...cur, [row.key]: !cur[row.key] }))}
                  />
                ))}
              </div>
            )}
          </Card>
          </div>

          <Card className="no-print mb-4 p-5">
            <h2 className="text-sm font-bold text-ink">Registered donors &amp; comments</h2>
            <p className="mb-4 text-[11px] text-faint">
              Tap a donor to see what they donated. Archive a comment once it's been addressed. It moves to the Archive tab.
            </p>
            {donorSummaries.length === 0 ? (
              <p className="text-xs text-faint">
                No registered donors with linked donations or comments yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {donorSummaries.map(({ donor, donations: theirDonations, flags: theirFlags }) => (
                  <DonorCard
                    key={donor.id}
                    donor={donor}
                    donations={theirDonations}
                    flags={theirFlags}
                    onArchiveFlag={archiveFlag}
                    busyFlagId={busyFlagId}
                    onReplied={loadAll}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}