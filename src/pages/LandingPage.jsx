import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import { supabase } from '../lib/supabase.js'

const roleCards = [
  { role: 'donor', title: 'Donor', subtitle: 'Individuals and orgs', desc: 'Log donations and track how relief reaches families.', to: '/donor/login', cta: 'Continue as donor' },
  { role: 'beneficiary', title: 'Beneficiary', subtitle: 'Registered households', desc: 'Sign for aid received and view your household history.', to: '/beneficiary/login', cta: 'Continue as beneficiary' },
]

export default function LandingPage() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'confirmed')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(10)
      setFeed(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <Card className="mx-auto max-w-4xl overflow-hidden">
        <div className="flex items-center justify-between bg-navy px-8 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-donor">✓</div>
            <div>
              <div className="text-xl font-bold">BantayAyuda</div>
              <div className="text-xs text-donor-light">Relief goods and distribution tracking · Manolo Fortich</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-donor-light">22 barangays served</div>
            <Link to="/admin/login" className="mt-1 inline-block text-[11px] font-semibold text-white/70 underline hover:text-white">
              Staff / Admin login
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-8 sm:grid-cols-2">
          {roleCards.map((c) => (
            <Card key={c.role} className={`border-2 border-${c.role}-border p-5`}>
              <div className={`mb-3 h-1.5 w-full rounded-full bg-${c.role}`} />
              <div className="mb-1 text-lg font-bold text-ink">{c.title}</div>
              <div className="mb-3 text-xs text-faint">{c.subtitle}</div>
              <p className="mb-4 text-sm text-muted">{c.desc}</p>
              <Link to={c.to}><Button variant={c.role}>{c.cta}</Button></Link>
            </Card>
          ))}
        </div>

        <div className="border-t border-line px-8 py-6">
          <h2 className="mb-3 text-sm font-bold text-ink">Recent donations</h2>
          {loading && <p className="text-xs text-faint">Loading…</p>}
          {!loading && feed.length === 0 && (
            <p className="text-xs text-faint">No public donations recorded yet. Entries appear here once an admin records and confirms them.</p>
          )}
          <div className="space-y-2">
            {feed.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-line-soft bg-white px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-ink">{entry.item} — donated by {entry.donor_name || 'Anonymous'}</div>
                  <div className="text-xs text-faint">{new Date(entry.created_at).toLocaleString()} · Brgy. {entry.barangay}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}