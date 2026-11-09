import { useState } from 'react'
import Card from './ui/Card.jsx'
import { supabase } from '../lib/supabase.js'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}

const icons = {
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  devices: <><rect x="2" y="4" width="14" height="10" rx="1.5" /><path d="M6 18h6" /><rect x="17" y="8" width="5" height="10" rx="1.5" /></>,
}

/* 0 = too short, 1 weak, 2 okay, 3 good, 4 strong */
function pwStrength(p) {
  if (p.length < 8) return 0
  let s = 1
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return Math.min(4, s)
}
const STRENGTH_LABEL = ['Too short (min. 8 characters)', 'Weak', 'Okay', 'Good', 'Strong']
const STRENGTH_COLOR = ['#cbd5e0', '#e53e3e', '#dd6b20', '#2f855a', '#1d5fa8']

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

/**
 * Password + sign-in security card shared by the donor and beneficiary
 * dashboards. The accent colour keeps each role's brand identity.
 */
export default function PasswordSecurityCard({
  email,
  lastSignIn,
  accent = '#1d5fa8',
  inputClassName = 'input-base',
  onSignOutAll,
  title = 'Password & security',
}) {
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'ok' | 'err', text }
  const [signingOut, setSigningOut] = useState(false)

  const strength = pwStrength(pw.next)
  const pwType = showPw ? 'text' : 'password'

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg(null)

    if (!pw.current) return setMsg({ type: 'err', text: 'Enter your current password.' })
    if (pw.next.length < 8) return setMsg({ type: 'err', text: 'The new password must be at least 8 characters.' })
    if (pw.next === pw.current) return setMsg({ type: 'err', text: 'The new password must be different from the current one.' })
    if (pw.next !== pw.confirm) return setMsg({ type: 'err', text: 'The new passwords do not match.' })
    if (!email) return setMsg({ type: 'err', text: 'Could not read your account email. Please log in again.' })

    setSaving(true)
    // Confirm the current password first, so nobody can change it from an
    // unattended, already logged-in device.
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: pw.current })
    if (verifyErr) {
      setSaving(false)
      return setMsg({ type: 'err', text: 'Your current password is incorrect.' })
    }

    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setSaving(false)
    if (error) return setMsg({ type: 'err', text: error.message || 'Could not change the password.' })

    setPw({ current: '', next: '', confirm: '' })
    setShowPw(false)
    setMsg({ type: 'ok', text: 'Password changed. Use your new password the next time you log in.' })
  }

  async function handleSignOutAll() {
    if (!confirm('Sign out of every device where you are logged in?')) return
    setSigningOut(true)
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    setSigningOut(false)
    if (error) return setMsg({ type: 'err', text: error.message || 'Could not sign out of all devices.' })
    onSignOutAll?.()
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Icon path={icons.lock} className="h-4 w-4" />
        <h2 className="text-sm font-bold text-ink">{title}</h2>
      </div>
      <p className="mb-4 text-xs text-faint">
        Use at least 8 characters. A mix of letters, numbers and symbols is stronger.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink">Current password</span>
            <input
              type={pwType}
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink">New password</span>
            <input
              type={pwType}
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink">Confirm new password</span>
            <input
              type={pwType}
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              className={inputClassName}
            />
          </label>
        </div>

        {pw.next && (
          <div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ background: n <= strength ? STRENGTH_COLOR[strength] : '#e2e8f0' }}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] font-semibold" style={{ color: STRENGTH_COLOR[strength] }}>
              {STRENGTH_LABEL[strength]}
            </p>
          </div>
        )}

        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={showPw}
            onChange={(e) => setShowPw(e.target.checked)}
            style={{ accentColor: accent }}
          />
          Show passwords
        </label>

        {msg && (
          <div
            role="status"
            className={`rounded-lg px-4 py-3 text-xs font-semibold ${
              msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="flex sm:justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
            style={{ background: accent }}
          >
            {saving ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 text-muted">
            <Icon path={icons.devices} className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xs font-bold text-ink">Last sign-in</div>
            <div className="text-xs text-faint">{fmtDateTime(lastSignIn)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOutAll}
          disabled={signingOut}
          className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink transition hover:bg-black/5 disabled:opacity-60"
        >
          {signingOut ? 'Signing out…' : 'Sign out of all devices'}
        </button>
      </div>
    </Card>
  )
}
