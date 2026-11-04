import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { supabase } from '../../lib/supabase.js'
import { getLocalUser } from '../../lib/offlineQueue.js'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></>,
  pin: <><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  warn: <><path d="M10.3 3.9 1.8 18a1.5 1.5 0 0 0 1.3 2.3h17.8a1.5 1.5 0 0 0 1.3-2.3L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2.1z" />,
  devices: <><rect x="2" y="4" width="14" height="10" rx="1.5" /><path d="M6 18h6" /><rect x="17" y="8" width="5" height="10" rx="1.5" /></>,
}

const PH_MOBILE = /^(09|\+639)\d{9}$/

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

export default function BeneficiaryDashboard() {
  const [household, setHousehold] = useState(null)
  const [userId, setUserId] = useState(null)
  const [email, setEmail] = useState('')
  const [lastSignIn, setLastSignIn] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview') // 'overview' | 'settings'
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState({ username: '', phone: '', address: '', alt_name: '', alt_phone: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null) // { type: 'ok' | 'err', text }
  const fileRef = useRef(null)
  const navigate = useNavigate()

  // password / security
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState(null) // { type, text }
  const [signingOutAll, setSigningOutAll] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/beneficiary/login')
  }

  function fillForm(h) {
    setForm({
      username: h?.username || '',
      phone: h?.phone || '',
      address: h?.address || '',
      alt_name: h?.alt_contact_name || '',
      alt_phone: h?.alt_contact_phone || '',
    })
  }

  useEffect(() => {
    async function load() {
      const localUser = await getLocalUser() // works offline too
      const userData = { user: localUser }
      if (!userData?.user) {
        setLoading(false)
        return
      }
      setUserId(userData.user.id)
      setEmail(userData.user.email || '')
      setLastSignIn(userData.user.last_sign_in_at || null)

      const { data: householdData } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle()
      setHousehold(householdData)
      fillForm(householdData)
      setLoading(false)
    }
    load()
  }, [])

  function notify(type, text) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave(e) {
    e.preventDefault()
    const username = form.username.trim()
    const phone = form.phone.trim().replace(/\s|-/g, '')
    const address = form.address.trim()
    const altName = form.alt_name.trim()
    const altPhone = form.alt_phone.trim().replace(/\s|-/g, '')

    if (username && username.length < 3) return notify('err', 'Username must be at least 3 characters.')
    if (phone && !PH_MOBILE.test(phone)) return notify('err', 'Enter a valid mobile number (09XXXXXXXXX).')
    if (altPhone && !PH_MOBILE.test(altPhone)) return notify('err', 'Enter a valid emergency contact number (09XXXXXXXXX).')
    if (altPhone && !altName) return notify('err', 'Enter the name of your emergency contact.')

    setSaving(true)
    const { data, error } = await supabase
      .from('beneficiaries')
      .update({
        username: username || null,
        phone: phone || null,
        address: address || null,
        alt_contact_name: altName || null,
        alt_contact_phone: altPhone || null,
      })
      .eq('id', userId)
      .select()
      .maybeSingle()
    setSaving(false)

    if (error) return notify('err', 'Could not save changes. Try again.')
    setHousehold(data)
    fillForm(data)
    notify('ok', 'Profile updated.')
  }

  async function handleAvatar(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return notify('err', 'Please choose an image file.')
    if (file.size > 2 * 1024 * 1024) return notify('err', 'Image must be 2 MB or smaller.')

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) {
      setUploading(false)
      return notify('err', 'Upload failed. Try again.')
    }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    const { data, error } = await supabase
      .from('beneficiaries')
      .update({ avatar_url: pub.publicUrl })
      .eq('id', userId)
      .select()
      .maybeSingle()
    setUploading(false)

    if (error) return notify('err', 'Could not save photo.')
    setHousehold(data)
    notify('ok', 'Photo updated.')
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwMsg(null)

    if (!pw.current) return setPwMsg({ type: 'err', text: 'Enter your current password.' })
    if (pw.next.length < 8) return setPwMsg({ type: 'err', text: 'The new password must be at least 8 characters.' })
    if (pw.next === pw.current) return setPwMsg({ type: 'err', text: 'The new password must be different from the current one.' })
    if (pw.next !== pw.confirm) return setPwMsg({ type: 'err', text: 'The new passwords do not match.' })
    if (!email) return setPwMsg({ type: 'err', text: 'Could not read your account email. Please log in again.' })

    setPwSaving(true)
    // Confirm the current password first, so nobody can change it from an unattended, logged-in device
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: pw.current })
    if (verifyErr) {
      setPwSaving(false)
      return setPwMsg({ type: 'err', text: 'Your current password is incorrect.' })
    }

    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setPwSaving(false)
    if (error) return setPwMsg({ type: 'err', text: error.message || 'Could not change the password.' })

    setPw({ current: '', next: '', confirm: '' })
    setShowPw(false)
    setPwMsg({ type: 'ok', text: 'Password changed. Use your new password the next time you log in.' })
  }

  async function handleSignOutAll() {
    if (!confirm('Sign out of every device where you are logged in?')) return
    setSigningOutAll(true)
    await supabase.auth.signOut({ scope: 'global' })
    navigate('/beneficiary/login')
  }

  const displayName = household?.username || household?.household_head || 'My household'
  const strength = pwStrength(pw.next)

  function AvatarView({ size = 'lg' }) {
    return household?.avatar_url ? (
      <img
        src={household.avatar_url}
        alt=""
        className={`${size === 'xl' ? 'h-24 w-24' : 'h-14 w-14'} shrink-0 rounded-full border-2 border-white/80 object-cover`}
      />
    ) : (
      <Avatar name={household?.household_head || 'Beneficiary'} size={size === 'xl' ? 'lg' : size} />
    )
  }

  const statCards = [
    { label: 'Status', value: 'All confirmed', icon: 'check', accent: '#1d5fa8' },
    { label: 'Household members', value: household?.household_size ?? '—', icon: 'users', accent: '#2f855a' },
    { label: 'Barangay', value: household?.barangay ? `Brgy. ${household.barangay}` : '—', icon: 'pin', accent: '#0e7490' },
  ]

  const navItem = (active) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
      active ? 'bg-[#1d5fa8] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`

  const pwType = showPw ? 'text' : 'password'

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-navy px-4 py-3 text-white lg:hidden">
        <span className="font-bold">BantayAyuda</span>
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Icon path={icons.menu} className="h-6 w-6" />
        </button>
      </div>
      {menuOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy text-white transition-transform lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold">BantayAyuda</div>
          <div className="text-xs text-white/60">Manolo Fortich</div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <button className={navItem(tab === 'overview')} onClick={() => { setTab('overview'); setMenuOpen(false) }}>
            <Icon path={icons.home} className="h-4 w-4" /> Overview
          </button>
          <Link to="/beneficiary/history" className={navItem(false)}>
            <Icon path={icons.history} className="h-4 w-4" /> Aid history
          </Link>
          <button className={navItem(tab === 'settings')} onClick={() => { setTab('settings'); setMenuOpen(false) }}>
            <Icon path={icons.user} className="h-4 w-4" /> Profile settings
          </button>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <span className="inline-block rounded-full bg-[#1d5fa8] px-3 py-1 text-xs font-bold">Beneficiary</span>
          <button onClick={handleLogout} className="mt-3 flex w-full items-center gap-3 px-1 py-2 text-sm font-semibold text-white/70 hover:text-white">
            <Icon path={icons.logout} className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Toast: stays visible wherever you are on the page */}
      {toast && (
        <div
          role="status"
          className={`fixed left-4 right-4 top-16 z-[60] sm:left-auto sm:top-4 sm:max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Main */}
      <main className="pb-10 lg:pl-64">
        <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-4 sm:pt-6">
          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e4a7a] to-[#0b2545] p-4 sm:p-6 text-white shadow-lg">
            <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div className="relative flex min-w-0 items-center gap-4">
              <AvatarView />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/75">
                  {tab === 'overview' ? 'Beneficiary dashboard' : 'Profile settings'}
                </p>
                <h1 className="truncate text-xl font-extrabold sm:text-2xl">{loading ? 'Loading…' : displayName}</h1>
                <p className="truncate text-sm text-white/75">
                  {household?.barangay ? `Brgy. ${household.barangay} · ` : ''}{email}
                </p>
              </div>
            </div>
          </div>

          {tab === 'overview' ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
                {statCards.map((s) => (
                  <Card key={s.label} className="p-4 sm:p-5" style={{ borderTop: `4px solid ${s.accent}` }}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="text-sm text-faint">{s.label}</div>
                        <div className="mt-1 truncate text-lg font-bold text-ink">{loading ? '…' : s.value}</div>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5" style={{ color: s.accent }}>
                        <Icon path={icons[s.icon]} className="h-5 w-5" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="mt-4 border-2 border-beneficiary-border p-4 sm:p-6">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-beneficiary-light text-beneficiary-dark">
                    <Icon path={icons.check} className="h-4 w-4" />
                  </span>
                  <div className="text-sm font-bold text-ink">All confirmed</div>
                </div>
                <p className="mb-4 text-xs text-faint">Every distribution on your record is e-signed.</p>
                {household?.created_at && (
                  <div className="border-t border-line-soft pt-3 text-xs text-faint">
                    Member since{' '}
                    <span className="font-bold text-ink">
                      {new Date(household.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </Card>

              <Card className="mt-4 border border-warn-border bg-warn-bg p-5">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-warn-text">
                  <Icon path={icons.warn} className="h-4 w-4" />
                  Missing something?
                </div>
                <p className="text-xs text-warn-text">
                  If a distribution isn't listed here, report it to your barangay office.
                </p>
              </Card>

              <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-beneficiary-light text-beneficiary-dark">
                    <Icon path={icons.lock} className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-ink">Keep your account safe</div>
                    <div className="text-xs text-faint">
                      Your first password was given by the barangay staff. Change it to one only you know.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setTab('settings')}
                  className="rounded-lg bg-[#1d5fa8] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#174a85]"
                >
                  Change password
                </button>
              </Card>
            </>
          ) : (
            <div className="mt-4 space-y-4 sm:mt-5">
              {/* Photo */}
              <Card className="p-4 sm:p-6">
                <h2 className="mb-4 text-sm font-bold text-ink">Profile photo</h2>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  <div className="text-navy">
                    {household?.avatar_url ? (
                      <img src={household.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" />
                    ) : (
                      <Avatar name={household?.household_head || 'Beneficiary'} size="lg" />
                    )}
                  </div>
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#1d5fa8] px-4 py-2 text-sm font-bold text-white hover:bg-[#174a85] disabled:opacity-60"
                    >
                      <Icon path={icons.camera} className="h-4 w-4" />
                      {uploading ? 'Uploading…' : 'Change photo'}
                    </button>
                    <p className="mt-2 text-xs text-faint">JPG or PNG, up to 2 MB.</p>
                  </div>
                </div>
              </Card>

              {/* Details + emergency contact (one Save button) */}
              <form onSubmit={handleSave} className="space-y-4">
                <Card className="p-4 sm:p-6">
                  <h2 className="mb-4 text-sm font-bold text-ink">Your details</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Username" hint="Shown on your dashboard.">
                      <input
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        maxLength={30}
                        placeholder="e.g. jeanrose"
                        className="input-base"
                      />
                    </Field>
                    <Field label="Mobile number" hint="Used by your barangay office to contact you.">
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        inputMode="tel"
                        placeholder="09XXXXXXXXX"
                        className="input-base"
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Home address" hint="Purok / sitio / street, so aid can reach you.">
                        <textarea
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          rows={3}
                          maxLength={200}
                          placeholder="Purok 3, Sitio Centro"
                          className="input-base"
                        />
                      </Field>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon path={icons.phone} className="h-4 w-4 text-[#1d5fa8]" />
                    <h2 className="text-sm font-bold text-ink">Emergency contact</h2>
                  </div>
                  <p className="mb-4 text-xs text-faint">
                    Someone the barangay office can reach if they cannot contact you, for example during a disaster.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact name">
                      <input
                        value={form.alt_name}
                        onChange={(e) => setForm({ ...form, alt_name: e.target.value })}
                        maxLength={60}
                        placeholder="e.g. Maria Santos (sister)"
                        className="input-base"
                      />
                    </Field>
                    <Field label="Contact mobile number">
                      <input
                        value={form.alt_phone}
                        onChange={(e) => setForm({ ...form, alt_phone: e.target.value })}
                        inputMode="tel"
                        placeholder="09XXXXXXXXX"
                        className="input-base"
                      />
                    </Field>
                  </div>
                </Card>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={() => fillForm(household)}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold text-faint hover:text-ink"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#1d5fa8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#174a85] disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>

              {/* Password & security (its own form, its own button) */}
              <Card className="p-4 sm:p-6">
                <div className="mb-1 flex items-center gap-2">
                  <Icon path={icons.lock} className="h-4 w-4 text-[#1d5fa8]" />
                  <h2 className="text-sm font-bold text-ink">Password &amp; security</h2>
                </div>
                <p className="mb-4 text-xs text-faint">
                  Use at least 8 characters. A mix of letters, numbers and symbols is stronger.
                </p>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Current password">
                      <input
                        type={pwType}
                        autoComplete="current-password"
                        value={pw.current}
                        onChange={(e) => setPw({ ...pw, current: e.target.value })}
                        className="input-base"
                      />
                    </Field>
                    <Field label="New password">
                      <input
                        type={pwType}
                        autoComplete="new-password"
                        value={pw.next}
                        onChange={(e) => setPw({ ...pw, next: e.target.value })}
                        className="input-base"
                      />
                    </Field>
                    <Field label="Confirm new password">
                      <input
                        type={pwType}
                        autoComplete="new-password"
                        value={pw.confirm}
                        onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                        className="input-base"
                      />
                    </Field>
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
                    <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
                    Show passwords
                  </label>

                  {pwMsg && (
                    <div
                      role="status"
                      className={`rounded-lg px-4 py-3 text-xs font-semibold ${
                        pwMsg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {pwMsg.text}
                    </div>
                  )}

                  <div className="flex sm:justify-end">
                    <button
                      type="submit"
                      disabled={pwSaving}
                      className="w-full rounded-lg sm:w-auto bg-[#1d5fa8] px-5 py-2 text-sm font-bold text-white hover:bg-[#174a85] disabled:opacity-60"
                    >
                      {pwSaving ? 'Changing…' : 'Change password'}
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
                    disabled={signingOutAll}
                    className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink transition hover:border-[#1d5fa8] hover:bg-beneficiary-light disabled:opacity-60"
                  >
                    {signingOutAll ? 'Signing out…' : 'Sign out of all devices'}
                  </button>
                </div>
              </Card>

              {/* Locked fields */}
              <Card className="p-4 sm:p-6">
                <h2 className="mb-1 text-sm font-bold text-ink">Registered information</h2>
                <p className="mb-4 text-xs text-faint">
                  These are tied to your aid record. To change them, visit your barangay office.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Household head">
                    <input value={household?.household_head || ''} disabled className="input-base opacity-70" />
                  </Field>
                  <Field label="Email (used to log in)">
                    <input value={email} disabled className="input-base opacity-70" />
                  </Field>
                  <Field label="Barangay">
                    <input value={household?.barangay ? `Brgy. ${household.barangay}` : ''} disabled className="input-base opacity-70" />
                  </Field>
                  <Field label="Household members">
                    <input value={household?.household_size ?? ''} disabled className="input-base opacity-70" />
                  </Field>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  )
}