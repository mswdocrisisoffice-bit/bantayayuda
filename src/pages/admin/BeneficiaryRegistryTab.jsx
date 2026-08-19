import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { AdminTabs } from './AdminDashboard.jsx'
import { supabase } from '../../lib/supabase.js'

export default function BeneficiaryRegistryTab() {
  const [search, setSearch] = useState('')
  const [households, setHouseholds] = useState([])
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('beneficiaries')
        .select('*')
        .order('household_head')
      setHouseholds(data || [])
    }
    load()
  }, [])

  const filtered = households.filter((h) =>
    h.household_head?.toLowerCase().includes(search.toLowerCase())
  )

  function toggleExpand(id) {
    setExpandedId((current) => (current === id ? null : id))
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-xl font-bold text-admin-dark">Beneficiary registry</h1>
        <p className="mb-6 text-xs text-faint">Search households and check for duplicate aid</p>
        <AdminTabs />

        <input
          placeholder="Search by household head name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
        />

        <Card className="p-4">
          {filtered.length === 0 && (
            <p className="p-4 text-xs text-faint">No households match your search.</p>
          )}
          <div className="divide-y divide-line-soft">
            {filtered.map((h) => {
              const isOpen = expandedId === h.id
              return (
                <div key={h.id}>
                  <button
                    onClick={() => toggleExpand(h.id)}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-line-soft"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">{h.household_head}</div>
                      <div className="text-xs text-faint">
                        Brgy. {h.barangay} · {h.household_size} members
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={h.last_aid_within_30_days ? 'pending' : 'confirmed'}>
                        {h.last_aid_within_30_days ? 'Recent aid — review' : 'Eligible'}
                      </Badge>
                      <span className="text-xs text-faint">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mb-3 space-y-3 rounded-lg bg-line-soft p-4 text-xs">
                      <div>
                        <div className="font-bold text-ink">Permanent address</div>
                        <div className="text-muted">{h.permanent_address || '—'}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div><span className="font-semibold text-ink">Contact:</span> <span className="text-muted">{h.contact_number || '—'}</span></div>
                        <div><span className="font-semibold text-ink">Barangay:</span> <span className="text-muted">{h.barangay || '—'}</span></div>
                        <div><span className="font-semibold text-ink">Household size:</span> <span className="text-muted">{h.household_size || '—'}</span></div>
                      </div>

                      {h.is_4ps_beneficiary && (
                        <span className="inline-block rounded-full bg-donor-light px-2 py-0.5 font-semibold text-donor-dark">4Ps Beneficiary</span>
                      )}

                      <div>
                        <div className="mb-1 font-bold text-ink">Family members</div>
                        {(!h.family_members || h.family_members.length === 0) && (
                          <p className="text-muted">No family members listed.</p>
                        )}
                        {h.family_members?.length > 0 && (
                          <div className="overflow-x-auto rounded border border-line-soft bg-white">
                            <table className="w-full min-w-[400px] border-collapse text-[11px]">
                              <thead>
                                <tr className="border-b border-line-soft bg-line-soft text-left">
                                  <th className="px-2 py-1">Name</th>
                                  <th className="px-2 py-1">Relation</th>
                                  <th className="px-2 py-1">Age</th>
                                  <th className="px-2 py-1">Sex</th>
                                </tr>
                              </thead>
                              <tbody>
                                {h.family_members.map((m, i) => (
                                  <tr key={i} className="border-b border-line-soft last:border-0">
                                    <td className="px-2 py-1">{m.name || '—'}</td>
                                    <td className="px-2 py-1">{m.relation || '—'}</td>
                                    <td className="px-2 py-1">{m.age || '—'}</td>
                                    <td className="px-2 py-1">{m.sex || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        <p className="mt-3 text-[11px] text-faint">
          "Recent aid — review" flags households that received aid within the last 30 days, based
          on a backend query against the distributions table — check before recording a new entry
          to avoid duplicate aid.
        </p>
      </div>
    </div>
  )
}