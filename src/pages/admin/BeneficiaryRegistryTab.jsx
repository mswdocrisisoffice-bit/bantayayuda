import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { supabase } from '../../lib/supabase.js'

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
  const [busyId, setBusyId] = useState(null)
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

  async function archiveHousehold(id) {
    setBusyId(id)
    setError('')
    const { error: err } = await supabase
      .from('beneficiaries')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', id)
    setBusyId(null)
    if (err) {
      setError(`Could not archive: ${err.message}`)
      return
    }
    setExpandedId(null)
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
      <div className="mb-3 flex items-center gap-3 rounded-card bg-white/90 px-5 py-4 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-admin-light text-admin-dark">
          <Icon path={icons.users} className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold leading-tight text-admin-dark">Beneficiary registry</h1>
          <p className="text-xs text-faint">Search households and check for duplicate aid</p>
        </div>
      </div>

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
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTER_CHIPS.map((c) => {
            const active = filter === c.key
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`rounded-full border-2 px-3.5 py-1.5 text-[11px] font-bold transition ${
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
                className="flex cursor-pointer items-start justify-between gap-3 p-4 transition hover:bg-line-soft/40"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={tidy(h.household_head)} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink">
                      {tidy(h.household_head) || 'Unnamed household'}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-faint">
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

                <div className="flex shrink-0 flex-col items-center">
                  <span className="rounded-lg bg-admin-light px-3 py-1.5 text-center text-admin-dark">
                    <span className="block text-xl font-bold leading-none">{h.household_size || 0}</span>
                    <span className="text-[10px] font-semibold">member{Number(h.household_size) === 1 ? '' : 's'}</span>
                  </span>
                  <span className="mt-1 text-xs text-faint">{open ? '▲' : '▼'}</span>
                </div>
              </div>

              {open && (
                <div className="border-t border-line-soft bg-line-soft/30 p-4">
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
                            className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"
                          >
                            <span className="min-w-0 truncate font-semibold text-ink">
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

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditingId(h.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[11px] font-bold text-ink shadow-sm hover:bg-line-soft"
                    >
                      <Icon path={icons.edit} className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Archive this household? It will be hidden from the active registry.')) {
                          archiveHousehold(h.id)
                        }
                      }}
                      disabled={busyId === h.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-admin px-3.5 py-2 text-[11px] font-bold text-white hover:bg-admin-dark disabled:opacity-50"
                    >
                      <Icon path={icons.archive} className="h-3.5 w-3.5" />
                      {busyId === h.id ? 'Archiving…' : 'Archive'}
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
        restored from there.
      </p>
    </>
  )
}