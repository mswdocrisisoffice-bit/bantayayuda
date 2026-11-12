import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import PageBanner from '../../components/ui/PageBanner.jsx'
import { supabase } from '../../lib/supabase.js'
import {
  loadReturnedDistributions,
  restoreHouseholdStock,
} from '../../lib/inventoryReturns.js'

/* ── Small inline icons (same style as Reports) ── */
function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  archive: <><rect x="2.5" y="4" width="19" height="4.5" rx="1" /><path d="M4 8.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8.5" /><path d="M10 12.5h4" /></>,
  gift: <><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1.5 0-4-1-4-3.2A2.3 2.3 0 0 1 10.3 2 3 3 0 0 1 12 3" /><path d="M12 7c1.5 0 4-1 4-3.2A2.3 2.3 0 0 0 13.7 2 3 3 0 0 0 12 3" /></>,
  truck: <><path d="M1 6h13v10H1z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  restore: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v5M14 11v5" /></>,
}

/* One color per kind of archived item */
const TYPES = {
  donation: {
    label: 'Donation', table: 'donations', accent: '#1d5fa8', icon: 'gift',
    restore: { status: 'confirmed', archived_at: null },
    hint: 'Hidden from the donor dashboard and the public feed.',
  },
  distribution: {
    label: 'Distribution', table: 'distributions', accent: '#2f855a', icon: 'truck',
    restore: { archived_at: null },
    hint: 'Hidden from Reports.',
  },
  household: {
    label: 'Household', table: 'beneficiaries', accent: '#0e7490', icon: 'users',
    restore: { status: 'active', archived_at: null },
    hint: 'Hidden from the active beneficiary registry.',
  },
  comment: {
    label: 'Comment', table: 'donation_flags', accent: '#b45309', icon: 'chat',
    restore: { status: 'open', archived_at: null },
    hint: 'Donor and beneficiary comments that were already addressed.',
  },
}

const TABS = [
  { key: 'all', label: 'All', icon: 'archive' },
  { key: 'donation', label: 'Donations', icon: 'gift' },
  { key: 'distribution', label: 'Distributions', icon: 'truck' },
  { key: 'household', label: 'Beneficiaries', icon: 'users' },
  { key: 'comment', label: 'Comments', icon: 'chat' },
]

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function qtyText(qty, unit) {
  if (qty === null || qty === undefined || qty === '') return ''
  return ` — ${qty}${unit ? ` ${unit}` : ''}`
}

export default function ArchiveTab() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('new') // 'new' | 'old'
  const [donations, setDonations] = useState([])
  const [distributions, setDistributions] = useState([])
  const [households, setHouseholds] = useState([])
  const [flags, setFlags] = useState([])
  const [distUnavailable, setDistUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState(null)
  const [confirmKey, setConfirmKey] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const errorRef = useRef(null)

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [error])

  async function loadAll(showSpinner = false) {
    if (showSpinner) setLoading(true)
    const [donationsRes, distributionsRes, householdsRes, flagsRes] = await Promise.all([
      supabase.from('donations').select('*').eq('status', 'archived').order('archived_at', { ascending: false }),
      supabase.from('distributions').select('*').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      supabase.from('beneficiaries').select('*').eq('status', 'archived').order('archived_at', { ascending: false }),
      supabase.from('donation_flags').select('*').eq('status', 'archived').order('archived_at', { ascending: false }),
    ])
    setDonations(donationsRes.data || [])
    // If the archived_at column hasn't been added to `distributions` yet, this query errors.
    setDistUnavailable(!!distributionsRes.error)
    setDistributions(distributionsRes.data || [])
    setHouseholds(householdsRes.data || [])
    setFlags(flagsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll(true)
  }, [])

  function flash(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  /* Every archived thing, in one shape, so one list can show them all */
  const items = useMemo(() => {
    const out = []
    donations.forEach((d) =>
      out.push({
        key: `donation-${d.id}`, type: 'donation', id: d.id, archivedAt: d.archived_at,
        title: `${d.item || 'Donation'}${qtyText(d.quantity, d.unit)}`,
        sub: [d.donor_name || 'Anonymous', d.barangay ? `Brgy. ${d.barangay}` : '', d.category].filter(Boolean).join(' · '),
        extra: d.description ? `“${d.description}”` : '',
      })
    )
    distributions.forEach((d) =>
      out.push({
        key: `distribution-${d.id}`, type: 'distribution', id: d.id, archivedAt: d.archived_at,
        title: `${d.item || 'Distribution'}${qtyText(d.quantity, d.unit)}`,
        sub: [d.household_head, d.barangay ? `Brgy. ${d.barangay}` : '', d.serial_number].filter(Boolean).join(' · '),
        extra: '',
      })
    )
    households.forEach((h) =>
      out.push({
        key: `household-${h.id}`, type: 'household', id: h.id, archivedAt: h.archived_at,
        title: h.household_head || 'Unnamed household',
        sub: [h.barangay ? `Brgy. ${h.barangay}` : '', h.household_size ? `${h.household_size} members` : ''].filter(Boolean).join(' · '),
        extra: '',
      })
    )
    flags.forEach((f) =>
      out.push({
        key: `comment-${f.id}`, type: 'comment', id: f.id, archivedAt: f.archived_at,
        title: `“${f.message}”`,
        sub: [
          f.kind === 'beneficiary' || f.beneficiary_id ? 'Beneficiary concern' : 'Donor comment',
          f.admin_reply ? `Your reply: “${f.admin_reply}”` : 'No reply was sent',
        ].join(' · '),
        extra: '',
      })
    )
    return out
  }, [donations, distributions, households, flags])

  const counts = {
    all: items.length,
    donation: donations.length,
    distribution: distributions.length,
    household: households.length,
    comment: flags.length,
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items
      .filter((i) => tab === 'all' || i.type === tab)
      .filter((i) => !q || `${i.title} ${i.sub} ${i.extra} ${TYPES[i.type].label}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const diff = new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0)
        return sort === 'new' ? diff : -diff
      })
  }, [items, tab, search, sort])

  async function restoreItem(item) {
    const t = TYPES[item.type]
    setBusyKey(item.key)
    setError('')

    // A household may have had its items returned to inventory when it was
    // archived. Restoring it means those items belong to the household again,
    // so take the same quantities back out of inventory. Always ask the
    // database function; it knows exactly which rows it marked on return,
    // even when the household details were edited in the meantime.
    const household = households.find((h) => h.id === item.id) || { id: item.id }
    let stockResult = item.type === 'household' ? await restoreHouseholdStock(household.id) : null

    if (stockResult?.error) {
      if (stockResult.error.code !== 'RETURN_FUNCTION_MISSING') {
        setBusyKey(null)
        setError(`Could not take the items back from inventory: ${stockResult.error.message}`)
        return
      }

      // The database function is not installed yet. That is only a problem if
      // this household actually had items returned, so check that first.
      const returned = await loadReturnedDistributions(household)
      if (returned.rows?.length) {
        setBusyKey(null)
        setError(
          'Restoring returned stock is not set up in the database yet. Run supabase/migrations/20261105_return_distribution_stock.sql in the Supabase SQL Editor, then try again.'
        )
        return
      }

      stockResult = null
    }

    const { data: updatedRows, error: err } = await supabase
      .from(t.table)
      .update(t.restore)
      .eq('id', item.id)
      .select('id')

    setBusyKey(null)

    if (err || !updatedRows || updatedRows.length === 0) {
      setError(
        err
          ? `Could not restore: ${err.message}`
          : 'Could not restore. Check that your account still has admin access.'
      )
      return
    }

    if (stockResult) {
      const restoredCount = stockResult.restored || 0
      const skipped = stockResult.skipped?.length || 0
      const shortages = stockResult.shortages?.length || 0

      if (restoredCount) {
        flash(
          `Restored. ${restoredCount} item${restoredCount === 1 ? '' : 's'} taken back from inventory.` +
            (skipped ? ` ${skipped} could not be matched in inventory.` : '') +
            (shortages ? ' Some stock went below zero because it was already used.' : '')
        )
      } else if (skipped) {
        flash('Restored, but the returned items could not be matched in inventory.')
      } else {
        flash('Restored. It is back in its active list.')
      }
    } else {
      flash('Restored. It is back in its active list.')
    }
    loadAll()
  }

  async function deleteItem(item) {
    const t = TYPES[item.type]
    setBusyKey(item.key)
    setError('')

    const permissionMessage =
      'Permanent delete is blocked by database permissions. Run supabase/migrations/20261109_archive_permanent_delete.sql in the Supabase SQL Editor, then try again.'

    // Prefer the database helper: it clears linked references (for example a
    // household's distribution rows) before deleting, and returns how many
    // rows were actually removed.
    const rpc = await supabase.rpc('delete_archived_record', {
      p_type: item.type,
      p_id: item.id,
    })

    if (!rpc.error) {
      const removed = Number(rpc.data) || 0
      setBusyKey(null)
      setConfirmKey(null)
      if (removed === 0) {
        setError('Nothing was deleted. Check that your account still has admin access.')
        return
      }
      flash('Deleted permanently.')
      loadAll()
      return
    }

    // Older databases may not have the helper yet. Fall back to a direct
    // delete so the tab keeps working, but verify a row was really removed.
    const helperMissing =
      rpc.error.code === 'PGRST202' ||
      /could not find the function|schema cache|does not exist/i.test(rpc.error.message || '')

    if (!helperMissing) {
      setBusyKey(null)
      setConfirmKey(null)
      setError(
        /permission|row-level security|policy/i.test(rpc.error.message || '')
          ? permissionMessage
          : `Could not delete: ${rpc.error.message}`
      )
      return
    }

    const { data: deletedRows, error: err } = await supabase
      .from(t.table)
      .delete()
      .eq('id', item.id)
      .select('id')

    setBusyKey(null)
    setConfirmKey(null)

    if (err || !deletedRows || deletedRows.length === 0) {
      setError(
        err
          ? /permission|row-level security|policy/i.test(err.message || '')
            ? permissionMessage
            : `Could not delete: ${err.message}`
          : permissionMessage
      )
      return
    }

    flash('Deleted permanently.')
    loadAll()
  }

  return (
    <div className="w-full max-w-none">
      {/* ── Header ── */}
      <PageBanner
        title="Archive"
        description="Everything archived across the system. Restore brings it back to its active list. Delete removes it for good and can't be undone."
        icon={<Icon path={icons.archive} className="h-6 w-6 sm:h-7 sm:w-7" />}
        className="mb-3"
      />

      {/* ── Tabs ── */}
      <div role="tablist" className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TABS.map((t) => {
          const active = tab === t.key
          const accent = t.key === 'all' ? null : TYPES[t.key].accent
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all duration-200 ${
                active
                  ? 'border-admin bg-admin text-white shadow-lg'
                  : 'border-line bg-white text-ink shadow-sm hover:-translate-y-0.5 hover:border-admin hover:bg-admin-light hover:shadow-md'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/20 text-white' : 'bg-black/5'}`}
                  style={!active && accent ? { color: accent } : undefined}
                >
                  <Icon path={icons[t.icon]} className="h-4 w-4" />
                </span>
                <span className="truncate text-sm font-bold">{t.label}</span>
              </span>
              <span
                className={`min-w-[26px] shrink-0 rounded-full px-2 py-1 text-center text-xs font-extrabold leading-none ${
                  active ? 'bg-white text-admin-dark' : 'bg-admin-light text-admin-dark'
                }`}
              >
                {loading ? '…' : counts[t.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Search + sort ── */}
      <Card className="mb-3 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
              <Icon path={icons.search} className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, item, barangay, serial…"
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-admin focus:ring-2 focus:ring-admin/20"
            />
          </div>
          <div className="inline-flex gap-1 rounded-xl bg-black/5 p-1">
            {[
              { key: 'new', label: 'Newest first' },
              { key: 'old', label: 'Oldest first' },
            ].map((o) => (
              <button
                key={o.key}
                onClick={() => setSort(o.key)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                  sort === o.key ? 'bg-white text-admin-dark shadow-sm' : 'text-muted hover:bg-white/60'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-faint">
            {loading ? 'Loading…' : `${visible.length} shown`}
          </span>
        </div>
      </Card>

      {/* ── Messages ── */}
      {notice && (
        <div className="mb-3 rounded-lg bg-beneficiary-light px-4 py-2.5 text-xs font-semibold text-beneficiary-dark">
          ✓ {notice}
        </div>
      )}
      {error && (
        <div ref={errorRef} className="mb-3 rounded-lg bg-warn-bg px-4 py-2.5 text-xs font-semibold text-warn-text">{error}</div>
      )}
      {distUnavailable && (tab === 'all' || tab === 'distribution') && (
        <div className="mb-3 rounded-lg bg-warn-bg px-4 py-2.5 text-xs text-warn-text">
          Archived distributions aren't available yet. Run this once in the Supabase SQL Editor:{' '}
          <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[11px]">
            alter table public.distributions add column if not exists archived_at timestamptz;
          </code>
        </div>
      )}

      {/* ── List ── */}
      {!loading && visible.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold text-ink">
            {search ? 'No archived item matches your search.' : 'Nothing archived here yet.'}
          </p>
          {tab !== 'all' && !search && <p className="mt-1 text-xs text-faint">{TYPES[tab].hint}</p>}
        </Card>
      )}

      <div className="space-y-2.5">
        {visible.map((item) => {
          const t = TYPES[item.type]
          const busy = busyKey === item.key
          const confirming = confirmKey === item.key
          return (
            <div
              key={item.key}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
              style={{ borderLeft: `5px solid ${t.accent}` }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${t.accent}1A`, color: t.accent }}
              >
                <Icon path={icons[t.icon]} className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{item.title}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: `${t.accent}1A`, color: t.accent }}
                  >
                    {t.label}
                  </span>
                </div>
                {item.sub && <div className="mt-0.5 text-xs text-muted">{item.sub}</div>}
                {item.extra && <div className="mt-0.5 text-xs italic text-faint">{item.extra}</div>}
                <div className="mt-0.5 text-[11px] text-faint">Archived {fmtDate(item.archivedAt)}</div>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {confirming ? (
                  <>
                    <span className="text-[11px] font-bold text-admin-dark">Delete forever?</span>
                    <button
                      onClick={() => deleteItem(item)}
                      disabled={busy}
                      className="rounded-lg bg-admin px-3 py-1.5 text-[11px] font-bold text-white hover:bg-admin-dark disabled:opacity-50"
                    >
                      {busy ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setConfirmKey(null)}
                      className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-faint hover:text-ink"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => restoreItem(item)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-donor px-3 py-1.5 text-[11px] font-bold text-white hover:bg-donor-dark disabled:opacity-50"
                    >
                      <Icon path={icons.restore} className="h-3.5 w-3.5" />
                      {busy ? 'Restoring…' : 'Restore'}
                    </button>
                    <button
                      onClick={() => setConfirmKey(item.key)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-admin/40 bg-white px-3 py-1.5 text-[11px] font-bold text-admin-dark hover:bg-admin-light disabled:opacity-50"
                    >
                      <Icon path={icons.trash} className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}