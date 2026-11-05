import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import PageBanner from '../../components/ui/PageBanner.jsx'
import { supabase } from '../../lib/supabase.js'
import {
  loadReturnableDistributions,
  returnDistributionsToInventory,
} from '../../lib/inventoryReturns.js'

const emptyMember = { name: '', relation: '', age: '', sex: '' }

/* ── Small inline icons (same style as Reports and Archive) ── */
function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  archive: <><rect x="2.5" y="4" width="19" height="4.5" rx="1" /><path d="M4 8.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8.5" /><path d="M10 12.5h4" /></>,
}

/* Numbers count up when they change */
function CountUp({ value }) {
  const [shown, setShown] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const target = Number(value) || 0
    const from = prev.current
    const start = performance.now()
    const duration = 600
    let raf
    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else prev.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{shown.toLocaleString()}</>
}

/* Display-only cleanup: "fabila, jeanrose, rivera" -> "Fabila, Jeanrose, Rivera" */
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

function normName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function EditHouseholdRow({ household, onCancel, onSaved }) {
  const [form, setForm] = useState({
    lastName: household.last_name || '',
    firstName: household.first_name || '',
    middleName: household.middle_name || '',
    barangay: household.barangay || '',
    permanentAddress: household.permanent_address || '',
    householdSize: household.household_size || '',
    contactNumber: household.contact_number || '',
    is4Ps: household.is_4ps_beneficiary || false,
  })
  const [familyMembers, setFamilyMembers] = useState(
    household.family_members && household.family_members.length > 0
      ? household.family_members
      : [{ ...emptyMember }]
  )
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function updateMember(index, field, value) {
    setFamilyMembers((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addMemberRow() {
    setFamilyMembers((rows) => [...rows, { ...emptyMember }])
  }

  function removeMemberRow(index) {
    setFamilyMembers((rows) => rows.filter((_, i) => i !== index))
  }

  async function save() {
    setSaving(true)
    const householdHead = [form.lastName, form.firstName, form.middleName]
      .filter(Boolean)
      .join(', ')
    const { error } = await supabase
      .from('beneficiaries')
      .update({
        household_head: householdHead,
        last_name: form.lastName,
        first_name: form.firstName,
        middle_name: form.middleName,
        barangay: form.barangay,
        permanent_address: form.permanentAddress,
        household_size: Number(form.householdSize) || 0,
        contact_number: form.contactNumber,
        is_4ps_beneficiary: form.is4Ps,
        family_members: familyMembers.filter((m) => m.name.trim() !== ''),
      })
      .eq('id', household.id)
    setSaving(false)
    if (!error) onSaved()
  }

  return (
    <div className="rounded-card border-2 border-admin bg-admin-light px-4 py-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-admin-dark">Editing household</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={form.lastName}
          onChange={(e) => update('lastName', e.target.value)}
          placeholder="Last name"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.firstName}
          onChange={(e) => update('firstName', e.target.value)}
          placeholder="First name"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.middleName}
          onChange={(e) => update('middleName', e.target.value)}
          placeholder="Middle name"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.barangay}
          onChange={(e) => update('barangay', e.target.value)}
          placeholder="Barangay"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.permanentAddress}
          onChange={(e) => update('permanentAddress', e.target.value)}
          placeholder="Permanent address"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin sm:col-span-2"
        />
        <input
          type="number"
          min="1"
          value={form.householdSize}
          onChange={(e) => update('householdSize', e.target.value)}
          placeholder="Household size"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.contactNumber}
          onChange={(e) => update('contactNumber', e.target.value)}
          placeholder="Contact number"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <label className="flex items-center gap-2 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={form.is4Ps}
            onChange={(e) => update('is4Ps', e.target.checked)}
          />
          4Ps beneficiary household
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-ink">Family members</span>
          <button
            type="button"
            onClick={addMemberRow}
            className="text-xs font-semibold text-admin-dark hover:underline"
          >
            + Add member
          </button>
        </div>
        <div className="space-y-2">
          {familyMembers.map((m, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              <input
                placeholder="Name"
                value={m.name}
                onChange={(e) => updateMember(i, 'name', e.target.value)}
                className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-admin sm:col-span-2"
              />
              <input
                placeholder="Relation"
                value={m.relation}
                onChange={(e) => updateMember(i, 'relation', e.target.value)}
                className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-admin"
              />
              <input
                placeholder="Age"
                value={m.age}
                onChange={(e) => updateMember(i, 'age', e.target.value)}
                className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-admin"
              />
              <div className="flex gap-1">
                <input
                  placeholder="Sex"
                  value={m.sex}
                  onChange={(e) => updateMember(i, 'sex', e.target.value)}
                  className="w-full rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-admin"
                />
                {familyMembers.length > 1 && (
                  <button type="button" onClick={() => removeMemberRow(i)} className="px-1 text-admin">
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-admin px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-[11px] font-semibold text-faint hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ArchiveHouseholdModal({ household, onClose, onArchived }) {
  const [rows, setRows] = useState([])
  const [trackingReady, setTrackingReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [returnStock, setReturnStock] = useState(false)
  const [picked, setPicked] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const result = await loadReturnableDistributions(household)
      if (!alive) return
      setRows(result.rows)
      setTrackingReady(result.trackingReady)
      setLoadError(result.error ? result.error.message : '')
      setLoading(false)
    }
    load()
    return () => {
      alive = false
    }
  }, [household])

  const selectedIds = useMemo(
    () => rows.filter((row) => picked[row.id] !== false).map((row) => row.id),
    [rows, picked]
  )
  const allSelected = rows.length > 0 && selectedIds.length === rows.length
  const canReturn = trackingReady && rows.length > 0

  function toggleAll() {
    if (allSelected) {
      const next = {}
      rows.forEach((row) => {
        next[row.id] = false
      })
      setPicked(next)
    } else {
      setPicked({})
    }
  }

  function toggleRow(id) {
    setPicked((current) => ({ ...current, [id]: current[id] === false }))
  }

  async function confirmArchive() {
    if (busy) return
    setError('')

    if (returnStock && selectedIds.length === 0) {
      setError('Select at least one item to return, or untick the return option.')
      return
    }

    setBusy(true)

    let returnResult = null
    if (returnStock) {
      returnResult = await returnDistributionsToInventory(selectedIds, household.id)
      if (returnResult.error) {
        setBusy(false)
        setError(
          returnResult.error.code === 'RETURN_FUNCTION_MISSING'
            ? 'Stock return is not set up in the database yet. Run supabase/migrations/20261105_return_distribution_stock.sql in the Supabase SQL Editor, then try again.'
            : `Could not return the items: ${returnResult.error.message}`
        )
        return
      }
    }

    const { data: archived, error: archiveError } = await supabase
      .from('beneficiaries')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', household.id)
      .select('id')

    setBusy(false)

    if (archiveError || !archived || archived.length === 0) {
      setError(
        archiveError
          ? `The household could not be archived: ${archiveError.message}`
          : 'The household could not be archived. Check that your account still has admin access.'
      )
      return
    }

    onArchived(returnResult)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line-soft bg-white px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">Archive household</h2>
            <p className="truncate text-xs text-faint">
              {household.household_head}
              {household.barangay ? ` · Brgy. ${household.barangay}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold text-faint hover:bg-line-soft hover:text-ink disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <p className="text-xs leading-relaxed text-muted">
            Archiving hides this household from the active registry. You can restore it later from
            the Archive tab.
          </p>

          {loading && (
            <p className="text-xs text-faint">Loading the household's distribution records…</p>
          )}

          {!loading && loadError && (
            <p className="rounded-lg border border-warn-text bg-warn-bg px-3 py-2 text-xs font-semibold text-warn-text">
              Could not load the distribution records: {loadError}
            </p>
          )}

          {!loading && !loadError && !trackingReady && (
            <div className="rounded-lg border border-warn-text bg-warn-bg px-3 py-2.5 text-xs text-warn-text">
              <p className="font-bold">One-time database setup needed</p>
              <p className="mt-1 leading-relaxed">
                To return items to inventory, run{' '}
                <span className="font-mono font-semibold">
                  supabase/migrations/20261105_return_distribution_stock.sql
                </span>{' '}
                in the Supabase SQL Editor. You can still archive without returning stock.
              </p>
            </div>
          )}

          {!loading && !loadError && trackingReady && rows.length === 0 && (
            <p className="rounded-lg border border-line-soft bg-line-soft/40 px-3 py-2.5 text-xs text-faint">
              No active distribution records were found for this household. There is nothing to
              return to inventory.
            </p>
          )}

          {!loading && !loadError && canReturn && (
            <div className="rounded-lg border border-line-soft p-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={returnStock}
                  onChange={(e) => {
                    setReturnStock(e.target.checked)
                    if (e.target.checked) setPicked({})
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-admin"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-ink">
                    Return the items given to this household to inventory
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-faint">
                    Stock goes back up by the quantity recorded for each selected distribution.
                    Items with no matching inventory record are skipped and kept on record.
                  </span>
                </span>
              </label>

              {returnStock && (
                <div className="mt-3 border-t border-line-soft pt-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                      {selectedIds.length} of {rows.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-[11px] font-bold text-admin-dark hover:underline"
                    >
                      {allSelected ? 'Clear all' : 'Select all'}
                    </button>
                  </div>

                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                    {rows.map((row) => {
                      const date = row.created_at
                        ? new Date(row.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : ''
                      return (
                        <label
                          key={row.id}
                          className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft px-2.5 py-2 hover:bg-line-soft/40"
                        >
                          <input
                            type="checkbox"
                            checked={picked[row.id] !== false}
                            onChange={() => toggleRow(row.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-admin"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-ink">{row.item}</span>
                            <span className="block text-[11px] text-faint">
                              {row.quantity} {row.unit || ''}
                              {date ? ` · ${date}` : ''}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-warn-text bg-warn-bg px-3 py-2 text-xs font-semibold text-warn-text">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-faint hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmArchive}
              disabled={busy || loading}
              className="rounded-lg bg-admin px-4 py-2 text-xs font-bold text-white hover:bg-admin-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? returnStock
                  ? 'Returning stock…'
                  : 'Archiving…'
                : returnStock
                  ? 'Archive & return stock'
                  : 'Archive household'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'eligible', label: 'Eligible' },
  { key: 'recent', label: 'Recent aid' },
  { key: '4ps', label: '4Ps' },
  { key: 'dupes', label: 'Possible duplicates' },
]

export default function BeneficiaryRegistryTab() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true)
    const { data } = await supabase
      .from('beneficiaries')
      .select('*')
      .neq('status', 'archived')
      .order('household_head')
    setHouseholds(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load(true)
  }, [])

  function handleArchived(returnResult) {
    const returned = Number(returnResult?.returned) || 0
    const skipped = returnResult?.skipped?.length || 0

    setArchiveTarget(null)
    setExpandedId(null)
    setError('')

    if (returnResult) {
      setNotice(
        [
          'Household archived.',
          returned
            ? `${returned} distribution${returned === 1 ? '' : 's'} returned to inventory.`
            : 'No stock was returned.',
          skipped
            ? `${skipped} item${skipped === 1 ? '' : 's'} could not be returned automatically and stayed on record.`
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      )
    } else {
      setNotice('Household archived. You can restore it later from the Archive tab.')
    }

    load()
  }

  /* Households that share the same name are flagged: usually the same family registered twice */
  const dupCountByName = useMemo(() => {
    const map = {}
    households.forEach((h) => {
      const k = normName(h.household_head)
      if (k) map[k] = (map[k] || 0) + 1
    })
    return map
  }, [households])

  const isDupe = (h) => (dupCountByName[normName(h.household_head)] || 0) > 1

  const counts = useMemo(
    () => ({
      all: households.length,
      eligible: households.filter((h) => !h.last_aid_within_30_days).length,
      recent: households.filter((h) => h.last_aid_within_30_days).length,
      '4ps': households.filter((h) => h.is_4ps_beneficiary).length,
      dupes: households.filter((h) => (dupCountByName[normName(h.household_head)] || 0) > 1).length,
    }),
    [households, dupCountByName]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return households
      .filter((h) => {
        if (filter === 'eligible') return !h.last_aid_within_30_days
        if (filter === 'recent') return !!h.last_aid_within_30_days
        if (filter === '4ps') return !!h.is_4ps_beneficiary
        if (filter === 'dupes') return (dupCountByName[normName(h.household_head)] || 0) > 1
        return true
      })
      .filter(
        (h) =>
          !q ||
          [h.household_head, h.barangay, h.contact_number, h.permanent_address]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
      )
  }, [households, filter, search, dupCountByName])

  const summary = [
    { label: 'Total households', value: counts.all, accent: '#0e7490', icon: 'users' },
    { label: 'Eligible for aid', value: counts.eligible, accent: '#2f855a', icon: 'check' },
    { label: 'Recent aid · review', value: counts.recent, accent: '#b45309', icon: 'clock' },
    { label: 'Possible duplicates', value: counts.dupes, accent: '#A32D2D', icon: 'copy' },
  ]

  return (
    <>
      {/* ── Header ── */}
      <PageBanner
        title="Beneficiary registry"
        description="Search households and check for duplicate aid."
        icon={<Icon path={icons.users} className="h-6 w-6 sm:h-7 sm:w-7" />}
        className="mb-3"
      />

      {/* ── Summary ── */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((c) => (
          <div
            key={c.label}
            className="rounded-card bg-white px-4 py-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(0,0,0,0.10)]"
            style={{ borderTop: `4px solid ${c.accent}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-faint">{c.label}</div>
                <div className="mt-1 text-2xl font-extrabold leading-none text-ink">
                  {loading ? '…' : <CountUp value={c.value} />}
                </div>
              </div>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5"
                style={{ color: c.accent }}
              >
                <Icon path={icons[c.icon]} className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + filter chips ── */}
      <Card className="mb-3 p-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            <Icon path={icons.search} className="h-4 w-4" />
          </span>
          <input
            placeholder="Search by name, barangay, or contact number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-admin focus:ring-2 focus:ring-admin/20"
          />
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {FILTER_CHIPS.map((c) => {
            const active = filter === c.key
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`shrink-0 whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-[11px] font-bold transition ${
                  active
                    ? 'border-admin bg-admin text-white'
                    : 'border-line-soft bg-white text-muted hover:border-admin hover:text-admin-dark'
                }`}
              >
                {c.label} · {loading ? '…' : counts[c.key]}
              </button>
            )
          })}
        </div>
      </Card>

      {error && (
        <div className="mb-3 rounded-lg bg-warn-bg px-4 py-2.5 text-xs font-semibold text-warn-text">{error}</div>
      )}

      {notice && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-beneficiary-dark bg-beneficiary-light px-4 py-2.5 text-xs font-semibold text-beneficiary-dark">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss"
            className="shrink-0 text-beneficiary-dark/70 hover:text-beneficiary-dark"
          >
            ✕
          </button>
        </div>
      )}

      {loading && <p className="text-xs text-faint">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold text-ink">No households match.</p>
          <p className="mt-1 text-xs text-faint">Try a different search or filter.</p>
        </Card>
      )}

      {/* ── Household cards ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filtered.map((h) => {
          const open = expandedId === h.id
          const editing = editingId === h.id
          const recent = !!h.last_aid_within_30_days
          const dupe = isDupe(h)
          const members = h.family_members || []

          if (editing) {
            return (
              <div key={h.id} className="md:col-span-2">
                <EditHouseholdRow
                  household={h}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null)
                    load()
                  }}
                />
              </div>
            )
          }

          return (
            <div
              key={h.id}
              className={`overflow-hidden rounded-card bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] ${
                open ? 'md:col-span-2' : ''
              }`}
              style={{ borderLeft: `5px solid ${recent ? '#E8A33D' : '#4A7A2E'}` }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(open ? null : h.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setExpandedId(open ? null : h.id)
                }}
                className="cursor-pointer p-3.5 transition hover:bg-line-soft/40 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={tidy(h.household_head)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold leading-snug text-ink [overflow-wrap:anywhere]">
                      {tidy(h.household_head) || 'Unnamed household'}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-faint">
                      <span className="inline-flex items-center gap-1">
                        <Icon path={icons.pin} className="h-3 w-3" />
                        {tidy(h.barangay) || '—'}
                      </span>
                      {h.contact_number && (
                        <span className="inline-flex items-center gap-1">
                          <Icon path={icons.phone} className="h-3 w-3" />
                          {h.contact_number}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          recent ? 'bg-warn-bg text-warn-text' : 'bg-beneficiary-light text-beneficiary-dark'
                        }`}
                      >
                        {recent ? 'Recent aid · review' : 'Eligible'}
                      </span>
                      {h.is_4ps_beneficiary && (
                        <span className="rounded-full bg-donor-light px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-donor-dark">
                          4Ps
                        </span>
                      )}
                      {dupe && (
                        <span className="rounded-full bg-admin-light px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-admin-dark">
                          Possible duplicate
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-admin-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-admin-dark">
                    <Icon path={icons.users} className="h-3 w-3" />
                    {h.household_size || 0} member{Number(h.household_size) === 1 ? '' : 's'}
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-admin-dark">
                    {open ? 'Hide details ▲' : 'View details ▼'}
                  </span>
                </div>
              </div>

              {open && (
                <div className="border-t border-line-soft bg-line-soft/30 p-3.5 sm:p-4">
                  <div className="grid gap-2 text-xs text-muted sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-ink">Address:</span>{' '}
                      {h.permanent_address || '—'}
                    </div>
                    <div>
                      <span className="font-semibold text-ink">Contact:</span> {h.contact_number || '—'}
                    </div>
                  </div>

                  {dupe && (
                    <div className="mt-3 rounded-lg bg-admin-light px-3 py-2 text-[11px] text-admin-dark">
                      Another household has the same name ({(dupCountByName[normName(h.household_head)] || 1) - 1} more).
                      If it's the same family registered twice, archive the extra one.
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                      Family members
                    </div>
                    {members.length === 0 ? (
                      <p className="text-xs text-faint">No family members listed.</p>
                    ) : (
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {members.map((m, i) => (
                          <div
                            key={i}
                            className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg bg-white px-3 py-2 text-xs"
                          >
                            <span className="min-w-0 font-semibold text-ink [overflow-wrap:anywhere]">
                              {tidy(m.name) || '—'}
                              {m.relation ? <span className="font-normal text-faint"> · {m.relation}</span> : null}
                            </span>
                            <span className="shrink-0 text-faint">
                              {m.age ? `${m.age} yrs` : ''}
                              {m.sex ? ` (${m.sex})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button
                      onClick={() => setEditingId(h.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[11px] font-bold text-ink shadow-sm hover:bg-line-soft"
                    >
                      <Icon path={icons.edit} className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setNotice('')
                        setArchiveTarget(h)
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-admin px-3.5 py-2 text-[11px] font-bold text-white hover:bg-admin-dark"
                    >
                      <Icon path={icons.archive} className="h-3.5 w-3.5" />
                      Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-[11px] text-faint">
        "Recent aid · review" flags households that received aid within the last 30 days, based
        on a backend query against the distributions table. Check before recording a new entry
        to avoid duplicate aid. Archived households appear in the Archive tab and can be
        restored from there. When archiving, you can choose to return the items they received
        to inventory first.
      </p>

      {archiveTarget && (
        <ArchiveHouseholdModal
          household={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onArchived={handleArchived}
        />
      )}
    </>
  )
}