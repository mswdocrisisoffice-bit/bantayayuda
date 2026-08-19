import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { supabase } from '../../lib/supabase.js'

export default function AidHistory() {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return
      const { data } = await supabase
        .from('distributions')
        .select('*')
        .eq('household_id', userData.user.id)
        .order('created_at', { ascending: false })
      setRecords(data || [])
    }
    load()
  }, [])

  const filtered = records.filter((r) =>
    r.item?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-beneficiary-dark">My aid history</h1>
          <Link to="/beneficiary/dashboard" className="text-xs font-semibold text-beneficiary-dark">
            ← Back to dashboard
          </Link>
        </div>

        <input
          placeholder="Search by item name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-beneficiary"
        />

        <Card className="p-4">
          {filtered.length === 0 && (
            <p className="p-4 text-xs text-faint">No distributions on record yet.</p>
          )}
          <div className="divide-y divide-line-soft">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-ink">{r.item}</div>
                  <div className="text-xs text-faint">
                    {new Date(r.created_at).toLocaleDateString()} · {r.quantity}
                  </div>
                </div>
                <Badge tone="confirmed">Confirmed</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
