import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { supabase } from '../../lib/supabase.js'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'donations', label: 'Donations' },
  { key: 'beneficiaries', label: 'Beneficiaries' },
  { key: 'comments', label: 'Comments' },
]

export default function ArchiveTab() {
  const [filter, setFilter] = useState('all')
  const [donations, setDonations] = useState([])
  const [households, setHouseholds] = useState([])
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [donationsRes, householdsRes, flagsRes] = await Promise.all([
      supabase
        .from('donations')
        .select('*')
        .eq('status', 'archived')
        .order('archived_at', { ascending: false }),
      supabase
        .from('beneficiaries')
        .select('*')
        .eq('status', 'archived')
        .order('archived_at', { ascending: false }),
      supabase
        .from('donation_flags')
        .select('*')
        .eq('status', 'archived')
        .order('archived_at', { ascending: false }),
    ])
    setDonations(donationsRes.data || [])
    setHouseholds(householdsRes.data || [])
    setFlags(flagsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function restoreDonation(id) {
    setBusyKey(`d-${id}`)
    const { error } = await supabase
      .from('donations')
      .update({ status: 'confirmed', archived_at: null })
      .eq('id', id)
    setBusyKey(null)
    if (!error) loadAll()
  }

  async function restoreHousehold(id) {
    setBusyKey(`h-${id}`)
    const { error } = await supabase
      .from('beneficiaries')
      .update({ status: 'active', archived_at: null })
      .eq('id', id)
    setBusyKey(null)
    if (!error) loadAll()
  }

  async function restoreFlag(id) {
    setBusyKey(`f-${id}`)
    const { error } = await supabase
      .from('donation_flags')
      .update({ status: 'open', archived_at: null })
      .eq('id', id)
    setBusyKey(null)
    if (!error) loadAll()
  }

  const showDonations = filter === 'all' || filter === 'donations'
  const showHouseholds = filter === 'all' || filter === 'beneficiaries'
  const showFlags = filter === 'all' || filter === 'comments'
  const totalCount = donations.length + households.length + flags.length

  return (
    <div className="w-full max-w-none">
     <div className="mb-6 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
  <h1 className="mb-1 text-xl font-bold text-admin-dark">Archive</h1>
  <p className="text-xs text-faint">
    Everything archived from across the system, in one place. Restore an entry to bring it
    back to its active list, donor dashboard, or public feed.
  </p>
</div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-line-soft p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                filter === f.key ? 'bg-white text-ink shadow-sm' : 'text-faint'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-faint">
          {loading ? 'Loading…' : `${totalCount} archived item${totalCount === 1 ? '' : 's'}`}
        </span>
      </div>

      {!loading && totalCount === 0 && (
        <Card className="p-8 text-center">
          <p className="text-xs text-faint">Nothing archived yet.</p>
        </Card>
      )}

      {showDonations && donations.length > 0 && (
        <Card className="mb-4 p-6">
          <h2 className="mb-1 text-sm font-bold text-ink">Archived donations</h2>
          <p className="mb-4 text-xs text-faint">
            Hidden from the donor dashboard and the public feed.
          </p>
          <div className="space-y-3">
            {donations.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-line-soft px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {d.item} {d.quantity ? `— ${d.quantity}` : ''}
                  </div>
                  <div className="text-xs text-faint">
                    {d.donor_name || 'Anonymous'} · Brgy. {d.barangay}
                    {d.archived_at
                      ? ` · Archived ${new Date(d.archived_at).toLocaleDateString()}`
                      : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">donation</Badge>
                  <button
                    onClick={() => restoreDonation(d.id)}
                    disabled={busyKey === `d-${d.id}`}
                    className="rounded-lg bg-donor px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-donor-dark disabled:opacity-50"
                  >
                    {busyKey === `d-${d.id}` ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showHouseholds && households.length > 0 && (
        <Card className="mb-4 p-6">
          <h2 className="mb-1 text-sm font-bold text-ink">Archived beneficiary households</h2>
          <p className="mb-4 text-xs text-faint">Hidden from the active beneficiary registry.</p>
          <div className="space-y-3">
            {households.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-line-soft px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">{h.household_head}</div>
                  <div className="text-xs text-faint">
                    Brgy. {h.barangay} · {h.household_size} members
                    {h.archived_at
                      ? ` · Archived ${new Date(h.archived_at).toLocaleDateString()}`
                      : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">household</Badge>
                  <button
                    onClick={() => restoreHousehold(h.id)}
                    disabled={busyKey === `h-${h.id}`}
                    className="rounded-lg bg-donor px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-donor-dark disabled:opacity-50"
                  >
                    {busyKey === `h-${h.id}` ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showFlags && flags.length > 0 && (
        <Card className="mb-4 p-6">
          <h2 className="mb-1 text-sm font-bold text-ink">Archived donor comments</h2>
          <p className="mb-4 text-xs text-faint">Comments already addressed and archived.</p>
          <div className="space-y-3">
            {flags.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-line-soft px-4 py-3"
              >
                <div>
                  <div className="text-sm text-ink">"{f.message}"</div>
                  {f.admin_reply && (
                    <div className="mt-1 text-xs text-faint">Reply: "{f.admin_reply}"</div>
                  )}
                  <div className="mt-1 text-xs text-faint">
                    {f.archived_at
                      ? `Archived ${new Date(f.archived_at).toLocaleDateString()}`
                      : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="neutral">comment</Badge>
                  <button
                    onClick={() => restoreFlag(f.id)}
                    disabled={busyKey === `f-${f.id}`}
                    className="rounded-lg bg-donor px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-donor-dark disabled:opacity-50"
                  >
                    {busyKey === `f-${f.id}` ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}