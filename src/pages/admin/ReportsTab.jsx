import { useEffect, useMemo, useState } from 'react'
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

function DistributionRow({ dist, isOpen, onToggle, isEditing, onEdit, onCancelEdit, onSaved }) {
  if (isEditing) {
    return <EditDistributionRow dist={dist} onCancel={onCancelEdit} onSaved={onSaved} />
  }

  return (
    <div className="rounded-lg border border-line-soft">
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-ink">
            {dist.item} {dist.quantity ? `— ${dist.quantity} ${dist.unit || ''}` : ''}
          </div>
         <div className="flex flex-wrap items-center gap-1.5 text-xs text-faint">
  <span>{dist.household_head || 'Unnamed household'} · Brgy. {dist.barangay || '—'} ·</span>
  <span className="rounded bg-admin-light px-1.5 py-0.5 font-mono text-[11px] font-bold text-admin-dark">
    {dist.serial_number || '—'}
  </span>
</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-faint">{new Date(dist.created_at).toLocaleDateString()}</div>
          <span className="text-xs text-faint">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

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
          </div>
          <button
            onClick={onEdit}
            className="mt-3 rounded-lg bg-line-soft px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-line"
          >
            Edit this record
          </button>
        </div>
      )}
    </div>
  )
}

export default function ReportsTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [donations, setDonations] = useState([])
  const [distributions, setDistributions] = useState([])
  const [donors, setDonors] = useState([])
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyFlagId, setBusyFlagId] = useState(null)
  const [openDistId, setOpenDistId] = useState(null)
  const [editingDistId, setEditingDistId] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [donationsRes, distributionsRes, donorsRes, flagsRes] = await Promise.all([
      supabase.from('donations').select('*').order('created_at', { ascending: false }),
      supabase.from('distributions').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'donor'),
      supabase
        .from('donation_flags')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false }),
    ])
    setDonations(donationsRes.data || [])
    setDistributions(distributionsRes.data || [])
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

  const filteredDistributions = useMemo(() => {
    return distributions.filter((d) => {
      const created = d.created_at?.slice(0, 10)
      if (dateFrom && created < dateFrom) return false
      if (dateTo && created > dateTo) return false
      return true
    })
  }, [distributions, dateFrom, dateTo])

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
      { key: 'created_at', label: 'Date' },
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

  return (
    <>
      <div className="mb-6 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
  <h1 className="mb-1 text-xl font-bold text-admin-dark">Reports</h1>
  <p className="text-xs text-faint">
    Filter by date range and export records for DSWD / LGU reporting
  </p>
</div>

      <Card className="mb-4 p-5">
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
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
              className="text-xs font-semibold text-faint hover:text-admin"
            >
              Clear dates
            </button>
          )}
        </div>
      </Card>

      {loading ? (
        <p className="text-xs text-faint">Loading report data…</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="text-xs text-faint">Donations in range</div>
              <div className="mt-1 text-2xl font-bold text-ink">{filteredDonations.length}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-faint">Distributions in range</div>
              <div className="mt-1 text-2xl font-bold text-ink">
                {filteredDistributions.length}
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-faint">Households served</div>
              <div className="mt-1 text-2xl font-bold text-ink">{uniqueHouseholds}</div>
            </Card>
          </div>

          <Card className="mb-4 p-5">
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

          <Card className="mb-4 p-5">
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

          <Card className="mb-4 p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Recent distributions</h2>
            <p className="mb-3 text-xs text-faint">Tap a record to view details, or edit it directly.</p>
            {filteredDistributions.length === 0 ? (
              <p className="text-xs text-faint">No distributions in this date range.</p>
            ) : (
              <div className="space-y-2">
                {filteredDistributions.map((d) => (
                  <DistributionRow
                    key={d.id}
                    dist={d}
                    isOpen={openDistId === d.id}
                    onToggle={() => setOpenDistId((cur) => (cur === d.id ? null : d.id))}
                    isEditing={editingDistId === d.id}
                    onEdit={() => setEditingDistId(d.id)}
                    onCancelEdit={() => setEditingDistId(null)}
                    onSaved={() => {
                      setEditingDistId(null)
                      loadAll()
                    }}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="mb-4 p-5">
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
                              {new Date(d.created_at).toLocaleString()}
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
                                  — {new Date(f.created_at).toLocaleString()}
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

          <Card className="p-5">
            <div className="mb-1 text-sm font-bold text-ink">Distributions report</div>
            <p className="mb-3 text-xs text-faint">
              {filteredDistributions.length} records — household, item, date confirmed
            </p>
            <Button variant="admin" onClick={exportDistributionsCsv}>
              Export distributions CSV
            </Button>
          </Card>
        </>
      )}
    </>
  )
}