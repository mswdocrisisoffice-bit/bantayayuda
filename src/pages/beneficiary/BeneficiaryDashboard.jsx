import { Link, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import { supabase } from '../../lib/supabase.js'

export default function BeneficiaryDashboard() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/beneficiary/login')
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-beneficiary-dark">My household</h1>
          <div className="flex items-center gap-4">
            <Link to="/beneficiary/history" className="text-xs font-semibold text-beneficiary-dark">
              View aid history →
            </Link>
            <button onClick={handleLogout} className="text-xs font-semibold text-faint hover:text-admin">
              Log out
            </button>
          </div>
        </div>

        <Card className="border-2 border-beneficiary-border p-6">
          <div className="mb-2 text-sm font-bold text-ink">All confirmed</div>
          <p className="mb-4 text-xs text-faint">Every distribution on your record is e-signed.</p>
          <div className="border-t border-line-soft pt-3 text-xs text-faint">
            Member since <span className="font-bold text-ink">Feb 10, 2026</span>
          </div>
        </Card>

        <Card className="mt-4 border border-warn-border bg-warn-bg p-5">
          <div className="mb-1 text-xs font-bold text-warn-text">Missing something?</div>
          <p className="text-xs text-warn-text">
            If a distribution isn't listed here, report it to your barangay office.
          </p>
        </Card>
      </div>
    </div>
  )
}
