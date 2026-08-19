import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { AdminTabs } from './AdminDashboard.jsx'
import { supabase } from '../../lib/supabase.js'

function ReplyForm({ flagId, onSubmitted }) {
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!reply.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('donation_flags')
      .update({ admin_reply: reply.trim(), replied_at: new Date().toISOString() })
      .eq('id', flagId)
    setSaving(false)
    if (!error) { setReply(''); setOpen(false); onSubmitted?.() }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="mt-1 text-[11px] font-semibold text-admin hover:underline">
      Reply
    </button>
  )

  return (
    <div className="mt-2">
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" rows={2}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin" />
      <div className="mt-1 flex gap-2">
        <button onClick={submit} disabled={saving} className="rounded-lg bg-admin px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">
          {saving ? 'Sending…' : 'Send reply'}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-faint">Cancel</button>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
      <div className="text-xs text-ink">{value}</div>
    </div>
  )
}

function DistributionRow({ record }) {
  const [open, setOpen] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState(null)
  const [loadingSig, setLoadingSig] = useState(false)

  const headName = [record.head_last_name, record.head_first_name, record.head_middle_name]
    .filter(Boolean)
    .join(', ') || record.household_head || 'Unnamed'

  async function toggleOpen() {
    setOpen((v) => !v)
    if (!open && !signatureUrl && (record.thumbmark_data || record.signature_path)) {
      setLoadingSig(true)
      const path = record.thumbmark_data || record.signature_path
      const { data } = await supabase.storage.from('signatures').createSignedUrl(path, 3600)
      setSignatureUrl(data?.signedUrl || null)
      setLoadingSig(false)
    }
  }

  const familyMembers = Array.isArray(record.family_members) ? record.family_members : []

  return (
    <div className="border-b border-line-soft last:border-b-0">
      <button
        onClick={toggleOpen}
        className="flex w-full items-center justify-between px-1 py-3 text-left hover:bg-line-soft/40"
      >
        <div>
          <div className="text-sm font-semibold text-ink">{headName}</div>
          <div className="text-xs text-faint">
            {record.serial_number ? `#${record.serial_number} · ` : ''}
            Brgy. {record.barangay || '—'} · {record.item || '—'} {record.quantity ? `(${record.quantity})` : ''}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-faint">{new Date(record.created_at).toLocaleDateString()}</span>
          <Badge tone="confirmed">{record.status || 'confirmed'}</Badge>
          <span className="text-xs text-faint">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="mb-3 rounded-lg bg-line-soft/40 p-4">
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailRow label="Serial number" value={record.serial_number} />
            <DetailRow label="Region" value={record.region} />
            <DetailRow label="Province" value={record.province} />
            <DetailRow label="District" value={record.district} />
            <DetailRow label="City/Municipality" value={record.city_municipality} />
            <DetailRow label="Evacuation center" value={record.evacuation_center} />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailRow label="Birthdate" value={record.head_birthdate} />
            <DetailRow label="Age" value={record.head_age} />
            <DetailRow label="Sex" value={record.head_sex} />
            <DetailRow label="Civil status" value={record.civil_status} />
            <DetailRow label="Occupation" value={record.occupation} />
            <DetailRow label="Monthly income" value={record.monthly_family_income} />
            <DetailRow label="Contact" value={record.contact_primary} />
            <DetailRow label="Alt. contact" value={record.contact_alternate} />
            <DetailRow label="Address" value={record.permanent_address} />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailRow label="Older persons" value={record.vulnerable_older_persons} />
            <DetailRow label="Pregnant women" value={record.vulnerable_pregnant_women} />
            <DetailRow label="Lactating women" value={record.vulnerable_lactating_women} />
            <DetailRow label="PWDs" value={record.vulnerable_pwds} />
            <DetailRow label="House ownership" value={record.house_ownership} />
            <DetailRow label="Shelter damage" value={record.shelter_damage} />
            <DetailRow label="4Ps beneficiary" value={record.is_4ps_beneficiary ? 'Yes' : 'No'} />
            <DetailRow label="IP ethnicity" value={record.ip_ethnicity} />
          </div>

          {familyMembers.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-faint">Family members</div>
              <div className="overflow-x-auto rounded border border-line-soft">
                <table className="w-full min-w-[500px] text-xs">
                  <thead>
                    <tr className="bg-white text-left text-faint">
                      <th className="px-2 py-1 font-semibold">Name</th>
                      <th className="px-2 py-1 font-semibold">Relation</th>
                      <th className="px-2 py-1 font-semibold">Age</th>
                      <th className="px-2 py-1 font-semibold">Sex</th>
                      <th className="px-2 py-1 font-semibold">Occupation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyMembers.map((m, i) => (
                      <tr key={i} className="border-t border-line-soft bg-white">
                        <td className="px-2 py-1">{m.name || '—'}</td>
                        <td className="px-2 py-1">{m.relation || '—'}</td>
                        <td className="px-2 py-1">{m.age || '—'}</td>
                        <td className="px-2 py-1">{m.sex || '—'}</td>
                        <td className="px-2 py-1">{m.occupation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
            <DetailRow label="Date registered" value={record.date_registered} />
            <DetailRow label="Brgy. captain" value={record.brgy_captain_name} />
            <DetailRow label="LSWDO" value={record.lswdo_name} />
          </div>

          {(record.thumbmark_data || record.signature_path) && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-faint">Signature / Thumbmark</div>
              {loadingSig && <p className="text-xs text-faint">Loading…</p>}
              {signatureUrl && (
                <img src={signatureUrl} alt="Signature" className="h-20 rounded border border-line-soft bg-white" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReportsTab() {
  const [donations, setDonations] = useState([])
  const [distributions, setDistributions] = useState([])
  const [donors, setDonors] = useState([])
  const [flags, setFlags] = useState([])
  const [distSearch, setDistSearch] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadFlags() {
    const { data } = await supabase.from('donation_flags').select('*').order('created_at', { ascending: false })
    setFlags(data || [])
  }

  async function loadAll() {
    setLoading(true)

    const { data: donationsData } = await supabase.from('donations').select('*').order('created_at', { ascending: false })
    const { data: distributionsData } = await supabase.from('distributions').select('*').order('created_at', { ascending: false })
    const { data: donorsData } = await supabase.from('profiles').select('*').eq('role', 'donor')

    setDonations(donationsData || [])
    setDistributions(distributionsData || [])
    setDonors(donorsData || [])
    setLoading(false)
    await loadFlags()
  }

  useEffect(() => { loadAll() }, [])

  const barangaySummary = donations.reduce((acc, d) => {
    const key = d.barangay || 'Unspecified'
    if (!acc[key]) acc[key] = { total: 0, confirmed: 0 }
    acc[key].total += 1
    if (d.status === 'confirmed') acc[key].confirmed += 1
    return acc
  }, {})

  function exportBarangaySummaryCSV() {
    const rows = [['Barangay', 'Total donations', 'Confirmed']]
    Object.entries(barangaySummary).forEach(([brgy, s]) => rows.push([brgy, s.total, s.confirmed]))
    downloadCSV(rows, 'barangay_summary.csv')
  }

  function downloadCSV(rows, filename) {
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function flagsFor(donorId) {
    return flags.filter((f) => f.donor_id === donorId)
  }

  const householdsServed = new Set(distributions.map((d) => d.beneficiary_id).filter(Boolean)).size

  const filteredDistributions = distributions.filter((d) => {
    if (!distSearch.trim()) return true
    const q = distSearch.trim().toLowerCase()
    const name = [d.head_last_name, d.head_first_name, d.household_head].filter(Boolean).join(' ').toLowerCase()
    return (
      name.includes(q) ||
      (d.serial_number || '').toLowerCase().includes(q) ||
      (d.barangay || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-xl font-bold text-admin-dark">Reports</h1>
        <p className="mb-6 text-xs text-faint">Records for DSWD / LGU reporting</p>
        <AdminTabs />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5"><div className="text-xs text-faint">Total donations</div><div className="mt-1 text-2xl font-bold text-ink">{donations.length}</div></Card>
          <Card className="p-5"><div className="text-xs text-faint">Total distributions</div><div className="mt-1 text-2xl font-bold text-ink">{distributions.length}</div></Card>
          <Card className="p-5"><div className="text-xs text-faint">Households served</div><div className="mt-1 text-2xl font-bold text-ink">{householdsServed}</div></Card>
        </div>

        {/* Distribution records */}
        <Card className="mb-4 p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Distribution records</h2>
            <input
              placeholder="Search by name, serial number, or barangay"
              value={distSearch}
              onChange={(e) => setDistSearch(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
            />
          </div>
          {loading && <p className="text-xs text-faint">Loading…</p>}
          {!loading && filteredDistributions.length === 0 && (
            <p className="text-xs text-faint">No distribution records found.</p>
          )}
          <div>
            {filteredDistributions.map((record) => (
              <DistributionRow key={record.id} record={record} />
            ))}
          </div>
        </Card>

        <Card className="mb-4 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Donations by barangay</h2>
            <button onClick={exportBarangaySummaryCSV} className="text-xs font-semibold text-admin-dark hover:underline">Export CSV ↓</button>
          </div>
          <div className="space-y-2">
            {Object.entries(barangaySummary).map(([brgy, s]) => (
              <div key={brgy} className="flex items-center justify-between border-b border-line-soft py-2 text-sm">
                <span className="text-ink">Brgy. {brgy}</span>
                <span className="text-xs text-faint">{s.total} total · {s.confirmed} confirmed</span>
              </div>
            ))}
            {Object.keys(barangaySummary).length === 0 && <p className="text-xs text-faint">No donations recorded yet.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Registered donors & comments</h2>
          {loading && <p className="text-xs text-faint">Loading…</p>}
          {!loading && donors.length === 0 && <p className="text-xs text-faint">No registered donors yet.</p>}
          <div className="space-y-4">
            {donors.map((donor) => {
              const donorDonations = donations.filter((d) => d.donor_id === donor.id)
              const donorFlags = flagsFor(donor.id)
              return (
                <div key={donor.id} className="rounded-lg border border-line-soft px-4 py-3">
                  <div className="text-sm font-semibold text-ink">{donor.full_name || donor.email}</div>
                  <div className="text-xs text-faint">{donor.email}</div>
                  <div className="mt-2 text-xs text-muted">
                    Donated: {donorDonations.length === 0 ? 'None yet' : donorDonations.map((d) => `${d.item} (${d.quantity || '—'})`).join(', ')}
                  </div>
                  {donorFlags.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-line-soft pt-2">
                      {donorFlags.map((f) => (
                        <div key={f.id} className="rounded-lg bg-warn-bg px-3 py-2">
                          <div className="text-[11px] text-warn-text">"{f.message}"</div>
                          <div className="text-[10px] text-faint">{new Date(f.created_at).toLocaleString()}</div>
                          {f.admin_reply && (
                            <div className="mt-1 rounded-lg bg-beneficiary-light px-2 py-1 text-[11px] text-beneficiary-dark">
                              Admin reply: "{f.admin_reply}"
                            </div>
                          )}
                          {!f.admin_reply && <ReplyForm flagId={f.id} onSubmitted={loadFlags} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}