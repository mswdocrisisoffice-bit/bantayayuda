import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { supabase } from '../../lib/supabase.js'

export default function DistributionStatus() {
  const [distributions, setDistributions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('distributions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setDistributions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-navy">Distribution status</h1>
            <p className="text-xs text-faint">See how relief goods have reached families across barangays</p>
          </div>
          <Link to="/donor/dashboard" className="text-xs font-semibold text-donor-dark">← Back to dashboard</Link>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Recent distributions</h2>
          {loading && <p className="text-xs text-faint">Loading…</p>}
          {!loading && distributions.length === 0 && (
            <p className="text-xs text-faint">No distributions recorded yet.</p>
          )}
          <div className="space-y-3">
            {distributions.map((d) => (
              <div key={d.id} className="rounded-lg border border-line-soft px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {d.item} {d.quantity ? `— ${d.quantity}` : ''}
                    </div>
                    <div className="text-xs text-faint">
                      {new Date(d.created_at).toLocaleDateString()} · Brgy. {d.barangay}
                    </div>
                  </div>
                  <Badge tone={d.status === 'completed' ? 'confirmed' : 'pending'}>
                    {d.status || 'pending'}
                  </Badge>
                </div>
                {d.beneficiary_name && (
                  <div className="mt-1 text-[11px] text-faint">Received by: {d.beneficiary_name}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}