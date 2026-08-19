import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import BarangayMap from '../../components/ui/BarangayMap.jsx'
import { supabase } from '../../lib/supabase.js'

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
    <button onClick={() => setOpen(true)} className="mt-2 text-[11px] font-semibold text-faint hover:text-admin">
      Something wrong with this entry? Leave a note
    </button>
  )

  return (
    <div className="mt-2">
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. quantity should be 25kg, not 20kg" rows={2}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin" />
      <div className="mt-1 flex gap-2">
        <button onClick={submit} disabled={saving} className="rounded-lg bg-admin px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">
          {saving ? 'Sending…' : 'Send note to admin'}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-faint">Cancel</button>
      </div>
    </div>
  )
}

export default function DonorDashboard() {
  const [profile, setProfile] = useState(null)
  const [donations, setDonations] = useState([])
  const [flagsByDonation, setFlagsByDonation] = useState({})
  const [loading, setLoading] = useState(true)
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
      const { data } = await supabase.from('donations').select('*').eq('donor_id', userData.user.id).order('created_at', { ascending: false })
      setDonations(data || [])
      setLoading(false)
      await loadFlags(userData.user.id, (data || []).map((d) => d.id))
    }
    load()
  }, [])

  const totalDonations = donations.length
  const confirmedCount = donations.filter((d) => d.status === 'confirmed').length
  const barangaysHelped = new Set(donations.map((d) => d.barangay).filter(Boolean)).size

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream pb-10">
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={profile?.full_name} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{profile?.full_name || 'My donations'}</h1>
              <p className="truncate text-xs text-white/70">{profile?.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Link to="/donor/status" className="text-xs font-semibold text-white hover:underline">View distribution status →</Link>
            <button onClick={handleLogout} className="text-xs font-semibold text-white/70 hover:text-white">Log out</button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl px-4">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="text-xs text-faint">Total donations</div>
            <div className="mt-1 text-2xl font-bold text-ink">{loading ? '…' : totalDonations}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs text-faint">Confirmed</div>
            <div className="mt-1 text-2xl font-bold text-donor-dark">{loading ? '…' : confirmedCount}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs text-faint">Barangays helped</div>
            <div className="mt-1 text-2xl font-bold text-ink">{loading ? '…' : `${barangaysHelped} / 22`}</div>
          </Card>
        </div>

        <Card className="mb-4 p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Donation history</h2>
          {loading && <p className="text-xs text-faint">Loading…</p>}
          {!loading && donations.length === 0 && (
            <div className="rounded-lg border border-dashed border-line-soft py-10 text-center">
              <p className="text-xs text-faint">No donations logged yet.</p>
              <p className="mt-1 text-xs text-faint">Once an admin records your donation, it will appear here.</p>
            </div>
          )}
          <div className="space-y-3">
            {donations.map((d) => (
              <div key={d.id} className="rounded-lg border border-line-soft px-4 py-3 transition hover:border-donor">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink">{d.item} {d.quantity ? `— ${d.quantity}` : ''}</div>
                    <div className="text-xs text-faint">{new Date(d.created_at).toLocaleDateString()} · Brgy. {d.barangay}</div>
                  </div>
                  <Badge tone={d.status === 'confirmed' ? 'confirmed' : 'pending'}>{d.status}</Badge>
                </div>
                {(flagsByDonation[d.id] || []).map((f) => (
                  <div key={f.id} className="mt-2 space-y-1">
                    <div className="rounded-lg bg-warn-bg px-3 py-2 text-[11px] text-warn-text">Your note: "{f.message}"</div>
                    {f.admin_reply && (
                      <div className="rounded-lg bg-beneficiary-light px-3 py-2 text-[11px] text-beneficiary-dark">Admin reply: "{f.admin_reply}"</div>
                    )}
                  </div>
                ))}
                <FlagForm donationId={d.id} donorId={profile?.id} onSubmitted={() => loadFlags(profile?.id, donations.map((x) => x.id))} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 text-sm font-bold text-ink">Where your donations are going — Manolo Fortich, Bukidnon</div>
          <BarangayMap height="320px" />
          <p className="mt-2 text-[11px] text-faint">
            Tap a pin to see donation and household details for that barangay.
          </p>
        </Card>
      </div>
    </div>
  )
}
