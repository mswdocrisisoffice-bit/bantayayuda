import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import PageBanner from '../../components/ui/PageBanner.jsx'
import {
  loadStaffIdentity,
  saveStaffIdentity,
  staffNameFromParts,
} from '../../lib/staffIdentity.js'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}

const icons = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  truck: <><rect x="1" y="7" width="13" height="10" rx="1" /><path d="M14 10h4l3 3v4h-3" /><circle cx="6" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
}

const inputClass =
  'w-full rounded-xl border-2 border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-admin focus:ring-4 focus:ring-admin/10'

function fmtVerified(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function StaffProfileTab() {
  const [identity, setIdentity] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    loadStaffIdentity().then((next) => {
      if (!alive) return
      setIdentity(next)
      setFirstName(next?.firstName || '')
      setLastName(next?.lastName || '')
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both your first name and last name.')
      return
    }

    setSaving(true)
    const result = await saveStaffIdentity({ firstName, lastName })
    setSaving(false)

    if (result.error) {
      setError(result.error.message || 'Could not save your staff name. Check your connection and try again.')
      return
    }

    const next = await loadStaffIdentity()
    setIdentity(next)
    setFirstName(next?.firstName || firstName.trim())
    setLastName(next?.lastName || lastName.trim())
    setSaved(true)
  }

  const preview = staffNameFromParts(firstName, lastName)

  if (loading) {
    return (
      <Card className="p-6 text-center text-sm text-faint">Loading your staff profile…</Card>
    )
  }

  return (
    <div>
      <PageBanner
        title="Staff profile"
        description="Verify your name once — it is reused automatically as the “Recorded by” staff name."
        icon={<Icon path={icons.user} className="h-6 w-6 sm:h-7 sm:w-7" />}
      >
        <Link
          to="/admin/donations"
          className="rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25"
        >
          Go to donations
        </Link>
      </PageBanner>

      {!identity ? (
        <Card className="p-6 text-sm text-muted">
          You need to be signed in as an administrator to set a staff name.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* ── Name form ── */}
          <Card className="p-5 lg:col-span-2 sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-admin-light text-admin-dark">
                <Icon path={icons.shield} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-ink">Your verified staff name</h2>
                <p className="mt-0.5 text-xs text-faint">
                  Enter your first and last name once. Every donation and distribution you record
                  will show this name automatically.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink" htmlFor="staff-first-name">
                    First name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="staff-first-name"
                    required
                    autoComplete="given-name"
                    placeholder="e.g. Maria"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setSaved(false) }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink" htmlFor="staff-last-name">
                    Last name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="staff-last-name"
                    required
                    autoComplete="family-name"
                    placeholder="e.g. Santos"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setSaved(false) }}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-line-soft bg-line-soft/40 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-faint">Name that will appear in records</div>
                <div className="mt-0.5 truncate text-sm font-bold text-ink">
                  {preview || '—'}
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-admin/20 bg-admin-light px-3 py-2 text-xs font-semibold text-admin-dark">
                  {error}
                </p>
              )}

              {saved && (
                <p className="flex items-center gap-2 rounded-lg border border-beneficiary/20 bg-beneficiary-light px-3 py-2 text-xs font-semibold text-beneficiary-dark">
                  <Icon path={icons.check} className="h-4 w-4" />
                  Staff name saved. It will auto-fill in the donation and distribution forms.
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="submit" variant="admin" disabled={saving} className="sm:max-w-xs">
                  {saving ? 'Saving…' : (identity.fullName ? 'Save changes' : 'Verify my name')}
                </Button>
                <p className="text-[11px] text-faint">
                  You only need to do this once. Past records keep the name they were saved with.
                </p>
              </div>
            </form>
          </Card>

          {/* ── Side cards ── */}
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-faint">Verified account</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-beneficiary-light px-2.5 py-1 text-[10px] font-bold text-beneficiary-dark">
                  <Icon path={icons.check} className="h-3 w-3" /> Verified
                </span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <div className="text-faint">Staff name</div>
                  <div className="truncate font-bold text-ink">{identity.fullName || 'Not set yet'}</div>
                </div>
                <div>
                  <div className="text-faint">Account email</div>
                  <div className="truncate font-semibold text-ink">{identity.email || '—'}</div>
                </div>
                <div>
                  <div className="text-faint">Role</div>
                  <div className="font-semibold text-ink">Administrator / MSWDO staff</div>
                </div>
                {identity.verifiedAt && (
                  <div>
                    <div className="text-faint">Name verified</div>
                    <div className="font-semibold text-ink">{fmtVerified(identity.verifiedAt)}</div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-faint">Where the name is used</h3>
              <ul className="mt-3 space-y-2.5 text-xs text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-admin-light text-admin-dark">
                    <Icon path={icons.gift} className="h-3.5 w-3.5" />
                  </span>
                  <span><b className="text-ink">Donations</b> — fills the “Recorded by” field automatically.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-admin-light text-admin-dark">
                    <Icon path={icons.truck} className="h-3.5 w-3.5" />
                  </span>
                  <span><b className="text-ink">Record distribution</b> — shows “Recording as verified staff” on the form.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-admin-light text-admin-dark">
                    <Icon path={icons.lock} className="h-3.5 w-3.5" />
                  </span>
                  <span>Saved records keep their original staff name even if you edit your profile later.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
