import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { CATEGORIES, UNITS } from './DonationsTab.jsx'
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

/* ── One distribution record, shown inside its category group ── */
function DistributionRow({ dist, isOpen, onToggle, isEditing, onEdit, onCancelEdit, onSaved }) {
  if (isEditing) {
    return <EditDistributionRow dist={dist} onCancel={onCancelEdit} onSaved={onSaved} />
  }

  return (
    <div className="rounded-lg border border-line-soft">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="text-sm font-semibold text-ink">
            {dist.item} {dist.quantity ? `— ${dist.quantity} ${dist.unit || ''}` : ''}
          </div>
          <div className="mt-1 text-xs text-faint">
            {dist.category || 'Uncategorized'}
          </div>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-faint">{formatDateTime(dist.created_at)}</div>
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

/* ── A collapsible section for one beneficiary, listing every item they received ── */
function BeneficiarySection({
  group, isOpen, onToggleSection,
  openDistId, setOpenDistId, editingDistId, setEditingDistId, onSaved,
}) {
  const categoryTags = useMemo(() => {
    return [...new Set(group.items.map((d) => d.category || 'Uncategorized'))]
  }, [group.items])

  return (
    <Card className="mb-3 overflow-hidden p-0">
      <button
        onClick={onToggleSection}
        className="flex w-full flex-wrap items-center justify-between gap-3 bg-navy px-5 py-3 text-left"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-white">
              {group.household_head || 'Unnamed household'}
            </span>
            <SerialChip serial={group.serial} />
          </div>
          <div className="mt-0.5 text-[11px] text-white/70">
            Brgy. {group.barangay || '—'} · {group.items.length} item{group.items.length === 1 ? '' : 's'} received
            {categoryTags.length > 0 && <> · {categoryTags.join(', ')}</>}
          </div>
        </div>
        <span className="no-print text-white">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="space-y-2 p-4">
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
    </Card>
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

  const donationsRef = useRef(null)
  const distributionsRef = useRef(null)
  const beneficiariesRef = useRef(null)
  const stockRef = useRef(null)

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
  const beneficiaryGroups = useMemo(() => {
    const map = {}
    filteredDistributions.forEach((d) => {
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
  }, [filteredDistributions])

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
        const theirDonations = donations.filter((d) => d.donor_id === donor.id)
        const theirFlags = flags.filter((f) => f.donor_id === donor.id)
        return { donor, donations: theirDonations, flags: theirFlags }
      })
      .filter((s) => s.donations.length > 0 || s.flags.length > 0)
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
    const csv = toCsv(byBarangay, [
      { key: 'barangay', label: 'Barangay' },
      { key: 'donations', label: 'Total donations' },
      { key: 'confirmed', label: 'Confirmed' },
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
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-area { box-shadow: none !important; }
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

      <Card className="no-print mb-4 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[11px] font-semibold text-muted">
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
          {(dateFrom || dateTo || search) && (
            <button
              onClick={() => {
                setDateFrom('')
                setDateTo('')
                setSearch('')
              }}
              className="text-xs font-semibold text-faint hover:text-admin"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Quick date-range shortcuts */}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line-soft pt-3">
          <span className="text-[11px] font-semibold text-muted">Quick pick:</span>
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
              className="rounded-full border border-line-soft bg-white px-3 py-1 text-[11px] font-semibold text-muted hover:border-admin hover:text-admin-dark"
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Days that actually have activity — tap to jump straight to that day */}
        {activeDates.length > 0 && (
          <div className="mt-3 border-t border-line-soft pt-3">
            <span className="mb-1.5 block text-[11px] font-semibold text-muted">
              Days with activity — tap to view that day:
            </span>
            <div className="flex flex-wrap gap-2">
              {activeDates.map(([day, count]) => (
                <button
                  key={day}
                  onClick={() => { setDateFrom(day); setDateTo(day) }}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                    dateFrom === day && dateTo === day
                      ? 'border-admin bg-admin text-white'
                      : 'border-line-soft bg-white text-muted hover:border-admin hover:text-admin-dark'
                  }`}
                >
                  {formatDayLabel(day)} · {count}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

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

          {/* ── Stock status: how much is left vs. how much was given out ── */}
          <div ref={stockRef} className="scroll-mt-24">
          <Card
            className={`mb-6 p-5 print-area transition-shadow duration-500 ${
              flashStock ? 'ring-4 ring-admin/40' : ''
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">Stock status</h2>
                <p className="text-[11px] text-faint">
                  "Given out" reflects only the selected date range above.
                </p>
              </div>
              <button
                onClick={exportStockStatusCsv}
                className="no-print text-xs font-semibold text-admin-dark"
              >
                Export CSV ↓
              </button>
            </div>

            {stockStatus.length === 0 ? (
              <p className="text-xs text-faint">No inventory items found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-faint">
                      <th className="py-2 pr-3 font-semibold">Category</th>
                      <th className="py-2 pr-3 font-semibold">Item</th>
                      <th className="py-2 pr-3 font-semibold">Stock remaining</th>
                      <th className="py-2 pr-3 font-semibold">Given out (range)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockStatus.map((row) => (
                      <tr key={row.id} className="border-b border-line-soft/60">
                        <td className="py-2 pr-3 text-muted">{row.category}</td>
                        <td className="py-2 pr-3 font-semibold text-ink">{row.item}</td>
                        <td className="py-2 pr-3">
                          <span className={row.remaining <= 0 ? 'font-bold text-admin' : 'font-bold text-ink'}>
                            {row.remaining}
                          </span>{' '}
                          <span className="text-faint">{row.unit}</span>
                          {row.remaining <= 0 && (
                            <span className="ml-1.5 rounded bg-admin-light px-1.5 py-0.5 text-[10px] font-bold text-admin-dark">
                              OUT OF STOCK
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-muted">
                          {row.given_out} {row.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <h2 className="text-sm font-bold text-ink">Beneficiaries &amp; what they received</h2>
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
              beneficiaryGroups.map((group) => (
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
              ))
            )}
          </div>

          <div
            ref={donationsRef}
            className={`scroll-mt-24 rounded-card transition-shadow duration-500 ${
              flashDonations ? 'ring-4 ring-admin/40' : ''
            }`}
          >
          <Card className="no-print mb-4 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Donations by barangay</h2>
              <button
                onClick={exportBarangaySummaryCsv}
                className="text-xs font-semibold text-admin-dark"
              >
                Export CSV ↓
              </button>
            </div>
            {byBarangay.length === 0 ? (
              <p className="text-xs text-faint">No donations in this date range.</p>
            ) : (
              <div className="divide-y divide-line-soft">
                {byBarangay.map((row) => (
                  <div key={row.barangay} className="flex items-center justify-between py-2">
                    <div className="text-sm text-ink">Brgy. {row.barangay}</div>
                    <div className="text-xs text-faint">
                      {row.donations} total · {row.confirmed} confirmed
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          </div>

          <Card className="no-print mb-4 p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Distributions by barangay</h2>
            {distributionsByBarangay.length === 0 ? (
              <p className="text-xs text-faint">No distributions in this date range.</p>
            ) : (
              <div className="divide-y divide-line-soft">
                {distributionsByBarangay.map((row) => (
                  <div key={row.barangay} className="flex items-center justify-between py-2">
                    <div className="text-sm text-ink">Brgy. {row.barangay}</div>
                    <div className="text-xs text-faint">{row.distributions} distributions</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="no-print mb-4 p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Registered donors & comments</h2>
            <p className="mb-3 text-xs text-faint">
              Archive a comment once it's been addressed — it'll move to the Archive tab.
            </p>
            {donorSummaries.length === 0 ? (
              <p className="text-xs text-faint">
                No registered donors with linked donations or comments yet.
              </p>
            ) : (
              <div className="space-y-4">
                {donorSummaries.map(({ donor, donations: theirDonations, flags: theirFlags }) => (
                  <div key={donor.id} className="rounded-lg border border-line-soft p-4">
                    <div className="mb-2 flex items-center gap-3">
                      <Avatar name={donor.full_name} size="sm" />
                      <div>
                        <div className="text-sm font-semibold text-ink">
                          {donor.full_name || 'Unnamed donor'}
                        </div>
                        <div className="text-xs text-faint">{donor.email}</div>
                      </div>
                    </div>

                    {theirDonations.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {theirDonations.map((d) => (
                          <div key={d.id} className="text-xs text-muted">
                            • {d.item} {d.quantity ? `(${d.quantity})` : ''} — Brgy.{' '}
                            {d.barangay} —{' '}
                            <span className="text-faint">
                              {formatDateTime(d.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {theirFlags.length > 0 && (
                      <div className="mt-2 space-y-2 border-t border-line-soft pt-2">
                        {theirFlags.map((f) => (
                          <div key={f.id}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="rounded-lg bg-warn-bg px-3 py-2 text-[11px] text-warn-text">
                                "{f.message}"{' '}
                                <span className="text-faint">
                                  — {formatDateTime(f.created_at)}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm('Archive this comment? It will move to the Archive tab.')) {
                                    archiveFlag(f.id)
                                  }
                                }}
                                disabled={busyFlagId === f.id}
                                className="shrink-0 rounded-lg bg-admin px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-admin-dark disabled:opacity-50"
                              >
                                {busyFlagId === f.id ? 'Archiving…' : 'Archive'}
                              </button>
                            </div>
                            <ReplyForm flag={f} onReplied={loadAll} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  )
}