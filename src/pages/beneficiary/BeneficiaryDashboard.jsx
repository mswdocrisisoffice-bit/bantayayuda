import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Faq from '../../components/ui/Faq.jsx'
import PasswordSecurityCard from '../../components/PasswordSecurityCard.jsx'
import { supabase } from '../../lib/supabase.js'
import { getLocalUser } from '../../lib/offlineQueue.js'
import { fetchBeneficiaryAid } from '../../lib/beneficiaryAid.js'

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
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2.1z" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.2-3 4" /><path d="M12 17h.01" /></>,
  shield: <><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></>,
  gift: <><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1.5 0-4-1-4-3.2A2.3 2.3 0 0 1 10.3 2 3 3 0 0 1 12 3" /><path d="M12 7c1.5 0 4-1 4-3.2A2.3 2.3 0 0 0 13.7 2 3 3 0 0 0 12 3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  inbox: <><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6h18v-6h-5l-1 2h-6l-1-2z" /></>,
}

const PH_MOBILE = /^(09|\+639)\d{9}$/

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const AID_ACCENTS = ['#1d5fa8', '#2f855a', '#0e7490', '#b7791f']

const HELP_STEPS = [
  { icon: 'history', title: 'Check your aid history', text: 'Every item you received should appear in Aid history with the date it was confirmed.' },
  { icon: 'phone', title: 'Report a missing item', text: 'If an item is not listed, tell your barangay office or the MSWDO so they can check the record.' },
  { icon: 'user', title: 'Keep your details current', text: 'An updated mobile number and address helps staff reach you when aid is available.' },
  { icon: 'lock', title: 'Protect your account', text: 'Change the password given to you and never share it with anyone.' },
]

const HELP_FAQ = [
  {
    q: 'A distribution is missing from my history. What should I do?',
    a: 'Report it to your barangay office or the MSWDO. Tell them the item, the approximate date, and the name of the household head on the record. They can check whether the distribution was recorded under a different name or contact number.',
  },
  {
    q: 'Why do I need to e-sign when I receive aid?',
    a: 'The e-signature confirms that you actually received the items. It protects both your household and the staff — every distribution is matched to a signature and a date.',
  },
  {
    q: 'Can I change my household head or barangay here?',
    a: 'No. Those details are tied to your official aid record and can only be changed by authorised staff. Visit your barangay office or the MSWDO with the correct information.',
  },
  {
    q: 'What if I forget my password?',
    a: 'Ask your barangay office or the MSWDO to help reset your account. Once you can log in again, open Profile → Password & security and choose a new password that only you know.',
  },
  {
    q: 'Is my information safe?',
    a: 'Yes. Your account is protected by a login password, and your household details are only visible to you and authorised MSWDO staff.',
  },
]

const STATUS_GUIDE = [
  { title: 'Confirmed', text: 'The distribution was recorded and signed for. This is the status shown on your aid history.' },
  { title: 'Pending', text: 'An entry is still being checked or completed by staff. It may not appear on your dashboard yet.' },
]

const tabTitles = {
  overview: 'Beneficiary dashboard',
  profile: 'My profile',
  security: 'Security & sign-in',
  help: 'Help & guide',
}

export default function BeneficiaryDashboard() {
  const { search } = useLocation()
  const initialTab = new URLSearchParams(search).get('tab')
  const [household, setHousehold] = useState(null)
  const [userId, setUserId] = useState(null)
  const [email, setEmail] = useState('')
  const [lastSignIn, setLastSignIn] = useState(null)
  const [aid, setAid] = useState([])
  const [aidLoading, setAidLoading] = useState(true)
  const [flags, setFlags] = useState([]) // notes the household sent to the MSWDO
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(
    ['profile', 'security', 'help'].includes(initialTab) ? initialTab : 'overview'
  ) // 'overview' | 'profile' | 'security' | 'help'
  const [form, setForm] = useState({ username: '', phone: '', address: '', alt_name: '', alt_phone: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null) // { type: 'ok' | 'err', text }
  const fileRef = useRef(null)
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/beneficiary/login')
  }

  function fillForm(h) {
    setForm({
      username: h?.username || '',
      phone: h?.phone || h?.contact_number || '',
      address: h?.address || h?.permanent_address || '',
      alt_name: h?.alt_contact_name || '',
      alt_phone: h?.alt_contact_phone || '',
    })
  }

  useEffect(() => {
    async function load() {
      const localUser = await getLocalUser() // works offline too
      if (!localUser) {
        setLoading(false)
        setAidLoading(false)
        return
      }
      setUserId(localUser.id)
      setEmail(localUser.email || '')
      setLastSignIn(localUser.last_sign_in_at || null)

      const { data: householdData } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', localUser.id)
        .maybeSingle()
      setHousehold(householdData)
      fillForm(householdData)
      setLoading(false)

      await loadFlags(localUser.id)

      try {
        const rows = await fetchBeneficiaryAid(localUser.id, householdData)
        setAid(rows)
      } catch {
        setAid([])
      } finally {
        setAidLoading(false)
      }
    }
    load()
  }, [])

  function notify(type, text) {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3500)
  }

  async function loadFlags(id = userId) {
    if (!id) return
    const { data } = await supabase
      .from('donation_flags')
      .select('*')
      .eq('beneficiary_id', id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
    setFlags(data || [])
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
    const baseFields = {
      username: username || null,
      alt_contact_name: altName || null,
      alt_contact_phone: altPhone || null,
    }

    // The admin registry reads `contact_number` / `permanent_address`, while
    // older beneficiary screens used `phone` / `address`. Write both so the
    // staff and the household always see the same details.
    let payload = {
      ...baseFields,
      phone: phone || null,
      contact_number: phone || null,
      address: address || null,
      permanent_address: address || null,
    }

    let { data, error } = await supabase
      .from('beneficiaries')
      .update(payload)
      .eq('id', userId)
      .select()
      .maybeSingle()

    // If this deployment only has the canonical columns, retry without the
    // legacy aliases instead of failing the whole save.
    if (error?.code === '42703') {
      payload = {
        ...baseFields,
        contact_number: phone || null,
        permanent_address: address || null,
      }
      ;({ data, error } = await supabase
        .from('beneficiaries')
        .update(payload)
        .eq('id', userId)
        .select()
        .maybeSingle())
    }

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

  const displayName = household?.username || household?.household_head || 'My household'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const memberSince = household?.created_at
  const latestAid = aid[0]
  const totalAid = aid.length

  function AvatarView({ xl = false }) {
    return household?.avatar_url ? (
      <img
        src={household.avatar_url}
        alt=""
        className={`${xl ? 'h-24 w-24' : 'h-16 w-16'} shrink-0 rounded-full border-2 border-white/80 object-cover`}
      />
    ) : (
      <Avatar name={household?.household_head || 'Beneficiary'} size="lg" />
    )
  }

  const statCards = [
    { label: 'Aid received', value: aidLoading ? '…' : totalAid, icon: 'gift', accent: '#1d5fa8' },
    { label: 'Last received', value: aidLoading ? '…' : latestAid?.created_at ? fmtDate(latestAid.created_at) : '—', icon: 'clock', accent: '#2f855a', small: true },
    { label: 'Household members', value: household?.household_size ?? '—', icon: 'users', accent: '#0e7490' },
    { label: 'Barangay', value: household?.barangay || '—', icon: 'pin', accent: '#b7791f', small: true },
  ]

  const navItem = (active) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
      active ? 'bg-[#1d5fa8] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream">
      {/* Sidebar — desktop only. Phones use the bottom navigation below. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold">BantayAyuda</div>
          <div className="text-xs text-white/60">Manolo Fortich</div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <button className={navItem(tab === 'overview')} onClick={() => setTab('overview')}>
            <Icon path={icons.home} className="h-4 w-4" /> Overview
          </button>
          <Link to="/beneficiary/history" className={navItem(false)}>
            <Icon path={icons.history} className="h-4 w-4" /> Aid history
          </Link>
          <button className={navItem(tab === 'profile')} onClick={() => setTab('profile')}>
            <Icon path={icons.user} className="h-4 w-4" /> My profile
          </button>
          <button className={navItem(tab === 'security')} onClick={() => setTab('security')}>
            <Icon path={icons.lock} className="h-4 w-4" /> Security
          </button>
          <button className={navItem(tab === 'help')} onClick={() => setTab('help')}>
            <Icon path={icons.help} className="h-4 w-4" /> Help &amp; guide
          </button>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <span className="inline-block rounded-full bg-[#1d5fa8] px-3 py-1 text-xs font-bold">Beneficiary</span>
          <button onClick={handleLogout} className="mt-3 flex w-full items-center gap-3 px-1 py-2 text-sm font-semibold text-white/70 hover:text-white">
            <Icon path={icons.logout} className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed left-4 right-4 top-4 z-[60] rounded-lg px-4 py-3 text-sm font-semibold shadow-lg sm:left-auto sm:max-w-sm ${
            toast.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Main */}
      <main className="pb-28 lg:pl-64 lg:pb-10">
        <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-4 sm:pt-6">
          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e4a7a] to-[#0b2545] p-4 text-white shadow-lg sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#1d5fa8]/20" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <AvatarView />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/75">
                    {greeting} · {tabTitles[tab]}
                  </p>
                  <h1 className="truncate text-lg font-extrabold sm:text-2xl">{loading ? 'Loading…' : displayName}</h1>
                  <p className="truncate text-xs text-white/70 sm:text-sm">
                    {household?.barangay ? `Brgy. ${household.barangay} · ` : ''}{email}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/90">
                  <Icon path={icons.shield} className="h-3 w-3" />
                  Verified household
                </span>
                {memberSince && (
                  <span className="text-[10px] text-white/55">Member since {fmtDate(memberSince)}</span>
                )}
              </div>
            </div>
          </div>

          {/* ───────── Overview ───────── */}
          {tab === 'overview' && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 lg:grid-cols-4">
                {statCards.map((s) => (
                  <Card key={s.label} className="p-3 pt-4 sm:p-5" style={{ borderTop: `4px solid ${s.accent}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold leading-tight text-faint sm:text-xs">{s.label}</div>
                        <div className={`mt-1 truncate font-bold text-ink ${s.small ? 'text-sm sm:text-base' : 'text-lg sm:text-2xl'}`}>
                          {loading ? '…' : s.value}
                        </div>
                      </div>
                      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 sm:flex" style={{ color: s.accent }}>
                        <Icon path={icons[s.icon]} className="h-5 w-5" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {/* Recent aid */}
                <Card className="overflow-hidden p-0 lg:col-span-2">
                  <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5 sm:py-4">
                    <div>
                      <h2 className="text-sm font-bold text-ink">Recent aid</h2>
                      <p className="text-xs text-faint">The latest items confirmed on your record</p>
                    </div>
                    <Link to="/beneficiary/history" className="shrink-0 text-xs font-bold text-beneficiary hover:underline">
                      View all →
                    </Link>
                  </div>

                  {aidLoading ? (
                    <div className="space-y-2 p-3 sm:p-4">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-16 animate-pulse rounded-xl bg-line-soft" />
                      ))}
                    </div>
                  ) : aid.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-8 text-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-faint">
                        <Icon path={icons.inbox} className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-bold text-ink">No aid recorded yet</p>
                      <p className="max-w-sm text-xs text-faint">
                        Aid you receive will appear here once it is confirmed. If you think something is missing,
                        open Help &amp; guide below.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 sm:p-4">
                      {aid.slice(0, 3).map((r, i) => (
                        <div
                          key={r.id || i}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft px-3 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5"
                              style={{ color: AID_ACCENTS[i % AID_ACCENTS.length] }}
                            >
                              <Icon path={icons.gift} className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-ink">{r.item || 'Aid item'}</div>
                              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-faint">
                                <span>{r.quantity} {r.unit || ''}</span>
                                <span>·</span>
                                <span>{fmtDate(r.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <Badge tone="confirmed">Confirmed</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Quick actions + household snapshot */}
                <div className="space-y-4">
                  <Card className="p-4">
                    <h2 className="text-sm font-bold text-ink">Quick actions</h2>
                    <div className="mt-3 space-y-1">
                      <Link
                        to="/beneficiary/history"
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-ink transition hover:bg-black/5"
                      >
                        <span className="flex items-center gap-2">
                          <Icon path={icons.history} className="h-4 w-4 text-beneficiary" /> View aid history
                        </span>
                        <Icon path={icons.chevronRight} className="h-3.5 w-3.5 text-faint" />
                      </Link>
                      <button
                        onClick={() => setTab('profile')}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-ink transition hover:bg-black/5"
                      >
                        <span className="flex items-center gap-2">
                          <Icon path={icons.user} className="h-4 w-4 text-beneficiary" /> Update my profile
                        </span>
                        <Icon path={icons.chevronRight} className="h-3.5 w-3.5 text-faint" />
                      </button>
                      <button
                        onClick={() => setTab('security')}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-ink transition hover:bg-black/5"
                      >
                        <span className="flex items-center gap-2">
                          <Icon path={icons.lock} className="h-4 w-4 text-beneficiary" /> Password &amp; security
                        </span>
                        <Icon path={icons.chevronRight} className="h-3.5 w-3.5 text-faint" />
                      </button>
                      <button
                        onClick={() => setTab('help')}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-ink transition hover:bg-black/5"
                      >
                        <span className="flex items-center gap-2">
                          <Icon path={icons.help} className="h-4 w-4 text-beneficiary" /> Help &amp; guide
                        </span>
                        <Icon path={icons.chevronRight} className="h-3.5 w-3.5 text-faint" />
                      </button>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h2 className="text-sm font-bold text-ink">Household snapshot</h2>
                    <div className="mt-3 space-y-2.5 text-xs">
                      <div className="flex items-start gap-2">
                        <Icon path={icons.user} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">Household head</div>
                          <div className="truncate font-semibold text-ink">{household?.household_head || '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon path={icons.pin} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">Barangay</div>
                          <div className="font-semibold text-ink">{household?.barangay || '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon path={icons.users} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">Members</div>
                          <div className="font-semibold text-ink">{household?.household_size ?? '—'}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setTab('profile')}
                      className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink transition hover:bg-black/5"
                    >
                      View full profile
                    </button>
                  </Card>
                </div>
              </div>

              {/* Verification + help */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Card className="border-2 border-beneficiary-border p-4 sm:p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-beneficiary-light text-beneficiary-dark">
                      <Icon path={icons.check} className="h-4 w-4" />
                    </span>
                    <div className="text-sm font-bold text-ink">Your record is verified</div>
                  </div>
                  <p className="text-xs leading-relaxed text-faint">
                    {totalAid > 0
                      ? `${totalAid} distribution${totalAid === 1 ? '' : 's'} on file, each confirmed with an e-signature.`
                      : 'Aid you receive will appear here together with the e-signature that confirms it.'}
                  </p>
                  {memberSince && (
                    <div className="mt-3 border-t border-line-soft pt-3 text-xs text-faint">
                      Member since <span className="font-bold text-ink">{fmtDate(memberSince)}</span>
                    </div>
                  )}
                </Card>

                <Card className="border border-warn-border bg-warn-bg p-4 sm:p-5">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-warn-text">
                    <Icon path={icons.warn} className="h-4 w-4" />
                    Missing something?
                  </div>
                  <p className="text-xs leading-relaxed text-warn-text">
                    If a distribution is not listed, report it to your barangay office or the MSWDO so they can
                    check the record.
                  </p>
                  <button
                    onClick={() => setTab('help')}
                    className="mt-3 rounded-lg bg-warn-text px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                  >
                    Get help
                  </button>
                </Card>
              </div>
            </>
          )}

          {/* ───────── Profile ───────── */}
          {tab === 'profile' && (
            <div className="mt-4 space-y-4 sm:mt-5">
              {/* Photo */}
              <Card className="p-4 sm:p-6">
                <h2 className="mb-1 text-sm font-bold text-ink">Profile photo</h2>
                <p className="mb-4 text-xs text-faint">A photo helps staff recognise your household record.</p>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  <AvatarView xl />
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
                  <h2 className="mb-1 text-sm font-bold text-ink">Your details</h2>
                  <p className="mb-4 text-xs text-faint">These help your barangay office contact you when aid is available.</p>
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

              {/* Locked fields */}
              <Card className="p-4 sm:p-6">
                <h2 className="mb-1 text-sm font-bold text-ink">Registered information</h2>
                <p className="mb-4 text-xs text-faint">
                  These are tied to your aid record. To change them, visit your barangay office or the MSWDO.
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

              {/* Security shortcut so the profile page can jump straight to password settings */}
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-beneficiary-light text-beneficiary-dark">
                    <Icon path={icons.lock} className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-ink">Password &amp; sign-in</div>
                    <div className="text-xs text-faint">Change your password or sign out of other devices.</div>
                  </div>
                </div>
                <button
                  onClick={() => setTab('security')}
                  className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink transition hover:border-[#1d5fa8] hover:bg-beneficiary-light"
                >
                  Open security
                </button>
              </Card>
            </div>
          )}

          {/* ───────── Security ───────── */}
          {tab === 'security' && (
            <div className="mt-4 space-y-4 sm:mt-5">
              <Card className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-beneficiary-light text-beneficiary-dark">
                    <Icon path={icons.shield} className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-ink">Login email</div>
                    <div className="truncate text-xs text-faint">{email || '—'}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-faint">
                  This email is used to sign in. If it needs to change, ask your barangay office or the MSWDO for
                  help — for your protection it cannot be edited here.
                </p>
              </Card>

              <PasswordSecurityCard
                email={email}
                lastSignIn={lastSignIn}
                accent="#1d5fa8"
                onSignOutAll={() => navigate('/beneficiary/login')}
              />

              <Card className="p-4 sm:p-5">
                <h2 className="text-sm font-bold text-ink">Staying safe</h2>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted">
                  <li>• Never share your password with anyone, even someone claiming to be from the office.</li>
                  <li>• Use a password you do not use on other websites.</li>
                  <li>• Always log out when using a shared phone or computer.</li>
                </ul>
                <button
                  onClick={handleLogout}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink transition hover:border-[#1d5fa8] hover:bg-beneficiary-light"
                >
                  <Icon path={icons.logout} className="h-4 w-4" />
                  Log out of this device
                </button>
              </Card>
            </div>
          )}

          {/* ───────── Help ───────── */}
          {tab === 'help' && (
            <div className="mt-4 space-y-4 sm:mt-5">
              <Card className="overflow-hidden p-0">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1e4a7a] to-[#0b2545] px-4 py-6 text-white sm:px-6">
                  <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" />
                  <div className="relative">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9cc3e8]">Help &amp; guide</p>
                    <h2 className="mt-1 text-xl font-extrabold">Using your beneficiary dashboard</h2>
                    <p className="mt-1 max-w-xl text-xs text-white/70">
                      Everything you need to check your aid, keep your details updated and protect your account.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
                  {HELP_STEPS.map((step) => (
                    <div key={step.title} className="rounded-xl border border-line-soft p-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-beneficiary-light text-beneficiary-dark">
                        <Icon path={icons[step.icon]} className="h-4 w-4" />
                      </span>
                      <div className="mt-3 text-xs font-bold text-ink">{step.title}</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-faint">{step.text}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4 sm:p-6">
                  <h2 className="text-sm font-bold text-ink">What the statuses mean</h2>
                  <p className="mb-4 text-xs text-faint">The labels you may see on aid records</p>
                  <div className="space-y-3">
                    {STATUS_GUIDE.map((row) => (
                      <div key={row.title} className="rounded-xl border border-line-soft p-3">
                        <Badge tone={row.title === 'Confirmed' ? 'confirmed' : 'pending'}>{row.title}</Badge>
                        <p className="mt-2 text-xs leading-relaxed text-muted">{row.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 sm:p-6">
                  <h2 className="text-sm font-bold text-ink">Where to get help</h2>
                  <p className="mb-4 text-xs text-faint">You do not need to solve account or aid problems alone.</p>
                  <div className="space-y-3 text-xs text-muted">
                    <div className="flex items-start gap-3 rounded-xl border border-line-soft p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-beneficiary-light text-beneficiary-dark">
                        <Icon path={icons.home} className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-bold text-ink">Your barangay office</div>
                        <p className="mt-0.5 leading-relaxed">Ask about a missing distribution, your household record, or a password reset.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-line-soft p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-beneficiary-light text-beneficiary-dark">
                        <Icon path={icons.shield} className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-bold text-ink">MSWDO Manolo Fortich</div>
                        <p className="mt-0.5 leading-relaxed">Visit the office for corrections to your official aid record or account concerns.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-4 sm:p-6">
                <h2 className="mb-1 text-sm font-bold text-ink">Message the MSWDO</h2>
                <p className="mb-4 text-xs text-faint">
                  Send a note about a missing distribution, a wrong record, or an account concern.
                  Staff will see it in the admin dashboard and can reply here.
                </p>

                {flags.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {flags.map((f) => (
                      <div key={f.id} className="rounded-xl border border-line-soft p-3">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-faint">
                          <span>You wrote</span>
                          <span>{fmtDateTime(f.created_at)}</span>
                        </div>
                        <p className="text-xs text-ink">"{f.message}"</p>
                        {f.admin_reply ? (
                          <div className="mt-2 rounded-lg bg-beneficiary-light px-3 py-2 text-xs text-beneficiary-dark">
                            MSWDO reply: "{f.admin_reply}"
                          </div>
                        ) : (
                          <div className="mt-2 text-[10px] font-semibold text-faint">Waiting for a reply.</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <BeneficiaryCommentForm userId={userId} onSubmitted={() => loadFlags(userId)} />
              </Card>

              <Card className="p-4 sm:p-6">
                <h2 className="mb-1 text-sm font-bold text-ink">Frequently asked questions</h2>
                <p className="mb-2 text-xs text-faint">Tap a question to see the answer.</p>
                <Faq items={HELP_FAQ} accent="#1d5fa8" />
              </Card>

              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div>
                  <div className="text-sm font-bold text-ink">Ready to review your aid?</div>
                  <div className="text-xs text-faint">Your full distribution history is one tap away.</div>
                </div>
                <Link
                  to="/beneficiary/history"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d5fa8] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#174a85]"
                >
                  Open aid history
                  <Icon path={icons.chevronRight} className="h-3.5 w-3.5" />
                </Link>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* ── Phone bottom navigation ── */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button
            onClick={() => setTab('overview')}
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold transition-colors ${
              tab === 'overview' ? 'text-beneficiary' : 'text-faint'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tab === 'overview' ? 'bg-beneficiary-light' : ''}`}>
              <Icon path={icons.home} className="h-5 w-5" />
            </span>
            <span className="truncate">Overview</span>
          </button>

          <Link
            to="/beneficiary/history"
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold text-faint transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl">
              <Icon path={icons.history} className="h-5 w-5" />
            </span>
            <span className="truncate">History</span>
          </Link>

          <button
            onClick={() => setTab('profile')}
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold transition-colors ${
              tab === 'profile' ? 'text-beneficiary' : 'text-faint'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tab === 'profile' ? 'bg-beneficiary-light' : ''}`}>
              <Icon path={icons.user} className="h-5 w-5" />
            </span>
            <span className="truncate">Profile</span>
          </button>

          <button
            onClick={() => setTab('security')}
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold transition-colors ${
              tab === 'security' ? 'text-beneficiary' : 'text-faint'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tab === 'security' ? 'bg-beneficiary-light' : ''}`}>
              <Icon path={icons.lock} className="h-5 w-5" />
            </span>
            <span className="truncate">Security</span>
          </button>

          <button
            onClick={() => setTab('help')}
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold transition-colors ${
              tab === 'help' ? 'text-beneficiary' : 'text-faint'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tab === 'help' ? 'bg-beneficiary-light' : ''}`}>
              <Icon path={icons.help} className="h-5 w-5" />
            </span>
            <span className="truncate">Help</span>
          </button>
        </div>
      </nav>
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

/* Send a concern to the MSWDO. It shows up in the admin Reports tab. */
function BeneficiaryCommentForm({ userId, onSubmitted }) {
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(e) {
    e?.preventDefault()
    const text = message.trim()
    if (!text || !userId) return
    setSaving(true)
    setError('')
    setSent(false)
    const { error } = await supabase.from('donation_flags').insert({
      beneficiary_id: userId,
      kind: 'beneficiary',
      message: text,
    })
    setSaving(false)
    if (error) {
      setError(error.message || 'Could not send your message. Try again.')
      return
    }
    setMessage('')
    setSent(true)
    onSubmitted?.()
    window.setTimeout(() => setSent(false), 4000)
  }

  return (
    <form onSubmit={submit}>
      <label className="mb-1.5 block text-xs font-bold text-ink">Your message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={500}
        placeholder="e.g. My household did not receive the rice listed in my record."
        className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-beneficiary focus:ring-2 focus:ring-beneficiary/20"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] text-faint">{message.length}/500</span>
        <button
          type="submit"
          disabled={saving || !message.trim()}
          className="rounded-lg bg-beneficiary px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
        >
          {saving ? 'Sending…' : 'Send message'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      {sent && <p className="mt-2 text-xs font-semibold text-beneficiary-dark">Message sent. The MSWDO will reply here.</p>}
    </form>
  )
}
