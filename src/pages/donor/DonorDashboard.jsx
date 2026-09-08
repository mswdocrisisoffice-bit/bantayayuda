// src/pages/donor/DonorDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import BarangayMap from '../../components/ui/BarangayMap.jsx'
import MyDonationsMap from '../../components/ui/MyDonationsMap.jsx'
import { supabase } from '../../lib/supabase.js'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  map: <><path d="M9 4v16" /><path d="M15 4v16" /><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /></>,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  gift: <><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1.5 0-4-1-4-3.2A2.3 2.3 0 0 1 10.3 2 3 3 0 0 1 12 3" /><path d="M12 7c1.5 0 4-1 4-3.2A2.3 2.3 0 0 0 13.7 2 3 3 0 0 0 12 3" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></>,
  pin: <><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'map', label: 'Map', icon: 'map' },
  { id: 'history', label: 'History', icon: 'history' },
]

export function DonorTabs({ active, onChange }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            active === t.id ? 'bg-donor text-white' : 'text-muted hover:bg-line-soft'
          }`}
        >
          <Icon path={icons[t.icon]} className="h-4 w-4" />
          {t.label}
        </button>
      ))}
    </div>
  )
}

function FlagForm({ donationId, donorId, onSubmitted }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!message.trim()) return
    setSaving(true)
    const { error } = await supabase.from('donation_flags').insert({ donation_id: donationId, donor_id: donorId, message: message.trim() })
    setSaving(false)
    if (!error) { setMessage(''); setOpen(false); onSubmitted?.() }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="mt-2 text-xs font-semibold text-faint hover:text-admin">
      Something wrong with this entry? Leave a note
    </button>
  )

  return (
    <div className="mt-2">
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. quantity should be 25kg, not 20kg" rows={2}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin" />
      <div className="mt-1 flex gap-2">
        <button onClick={submit} disabled={saving} className="rounded-lg bg-admin px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {saving ? 'Sending…' : 'Send note to admin'}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-faint">Cancel</button>
      </div>
    </div>
  )
}

export default function DonorDashboard() {
  const [profile, setProfile] = useState(null)
  const [donations, setDonations] = useState([])
  const [flagsByDonation, setFlagsByDonation] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const navigate = useNavigate()

  async function handleLogout() { await supabase.auth.signOut(); navigate('/donor/login') }

  async function loadFlags(userId, donationIds) {
    if (donationIds.length === 0) return
    const { data } = await supabase.from('donation_flags').select('*').eq('donor_id', userId).in('donation_id', donationIds)
    const grouped = {}
    ;(data || []).forEach((f) => { grouped[f.donation_id] = grouped[f.donation_id] || []; grouped[f.donation_id].push(f) })
    setFlagsByDonation(grouped)
  }

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) { setLoading(false); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single()
      setProfile(profileData)
      const { data } = await supabase.from('donations').select('*').eq('donor_id', userData.user.id).neq('status', 'archived').order('created_at', { ascending: false })
      setDonations(data || [])
      setLoading(false)
      await loadFlags(userData.user.id, (data || []).map((d) => d.id))
    }
    load()
  }, [])

  const totalDonations = donations.length
  const confirmedCount = donations.filter((d) => d.status === 'confirmed').length
  const barangaysHelped = new Set(donations.map((d) => d.barangay).filter(Boolean)).size

  const statCards = [
    { label: 'Total donations', value: totalDonations, icon: 'gift', tone: 'bg-donor-light text-donor-dark' },
    { label: 'Confirmed', value: confirmedCount, icon: 'check', tone: 'bg-donor-light text-donor-dark' },
    { label: 'Barangays helped', value: `${barangaysHelped} / 22`, icon: 'pin', tone: 'bg-beneficiary-light text-beneficiary-dark' },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream pb-10">
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={profile?.full_name} avatarUrl={profile?.avatar_url} avatarPreset={profile?.avatar_preset} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{profile?.full_name || 'My donations'}</h1>
              {profile?.username && <p className="truncate text-sm text-white/70">@{profile.username}</p>}
              <p className="truncate text-xs text-white/50">{profile?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="shrink-0 text-sm font-semibold text-white/70 hover:text-white">Log out</button>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-5xl px-4">
        <DonorTabs active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {statCards.map((s) => (
              <Card key={s.label} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-faint">{s.label}</div>
                    <div className="mt-1 text-2xl font-bold text-ink">{loading ? '…' : s.value}</div>
                  </div>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.tone}`}>
                    <Icon path={icons[s.icon]} className="h-4.5 w-4.5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'map' && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <Icon path={icons.map} className="h-4 w-4 text-donor-dark" />
                <h2 className="text-base font-bold text-ink">Where your donations arrived</h2>
              </div>
              <p className="mb-3 text-sm text-faint">
                Pins show only the barangays that received something you personally donated.
              </p>
              {loading ? (
                <div style={{ height: '320px' }} className="flex items-center justify-center rounded-lg border border-line-soft">
                  <p className="text-sm text-faint">Loading map…</p>
                </div>
              ) : (
                <MyDonationsMap donations={donations} height="320px" />
              )}
            </Card>
            <Card className="p-5">
              <div className="mb-3 text-base font-bold text-ink">Community-wide — Manolo Fortich, Bukidnon</div>
              <BarangayMap height="320px" />
            </Card>
          </div>
        )}

        {tab === 'history' && (
          <Card className="p-6">
            <h2 className="mb-4 text-base font-bold text-ink">Donation history</h2>
            {loading && <p className="text-sm text-faint">Loading…</p>}
            {!loading && donations.length === 0 && (
              <div className="rounded-lg border border-dashed border-line-soft py-10 text-center">
                <p className="text-sm text-faint">No donations logged yet.</p>
              </div>
            )}
            <div className="space-y-3">
              {donations.map((d) => (
                <div key={d.id} className="rounded-lg border border-line-soft px-4 py-3 transition hover:border-donor">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {d.item} {d.quantity ? `— ${d.quantity} ${d.unit || ''}` : ''}
                      </div>
                      <div className="text-sm text-faint">
                        {new Date(d.created_at).toLocaleDateString()} · Brgy. {d.barangay}
                        {d.category ? ` · ${d.category}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {d.donor_type && (
                        <Badge tone={d.donor_type === 'government' ? 'government' : 'nonGovernment'}>
                          {d.donor_type === 'government' ? 'Government' : 'Non-government'}
                        </Badge>
                      )}
                      <Badge tone={d.status === 'confirmed' ? 'confirmed' : 'pending'}>{d.status}</Badge>
                    </div>
                  </div>
                  {d.recorded_by && (
                    <div className="mt-1 text-sm text-faint">
                      Filled up by <span className="font-semibold text-muted">{d.recorded_by}</span>
                    </div>
                  )}
                  {d.description && <div className="mt-1 text-sm italic text-faint">"{d.description}"</div>}
                  {(flagsByDonation[d.id] || []).map((f) => (
                    <div key={f.id} className="mt-2 space-y-1">
                      <div className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-text">Your note: "{f.message}"</div>
                      {f.admin_reply && (
                        <div className="rounded-lg bg-beneficiary-light px-3 py-2 text-sm text-beneficiary-dark">Admin reply: "{f.admin_reply}"</div>
                      )}
                    </div>
                  ))}
                  <FlagForm donationId={d.id} donorId={profile?.id} onSubmitted={() => loadFlags(profile?.id, donations.map((x) => x.id))} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}