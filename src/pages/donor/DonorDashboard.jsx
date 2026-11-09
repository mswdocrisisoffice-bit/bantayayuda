import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Badge from '../../components/ui/Badge.jsx'
import BarangayMap from '../../components/ui/BarangayMap.jsx'
import Faq from '../../components/ui/Faq.jsx'
import PasswordSecurityCard from '../../components/PasswordSecurityCard.jsx'
import { AVATAR_PRESETS, PresetAvatarIcon } from '../../components/ui/AvatarPresets.jsx'
import { supabase } from '../../lib/supabase.js'
import bantayayudaSeal from '../../assets/bantayayuda-seal.png'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  gift: <><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1.5 0-4-1-4-3.2A2.3 2.3 0 0 1 10.3 2 3 3 0 0 1 12 3" /><path d="M12 7c1.5 0 4-1 4-3.2A2.3 2.3 0 0 0 13.7 2 3 3 0 0 0 12 3" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></>,
  pin: <><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  heart: <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  award: <><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5" /></>,
  trophy: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 3" /><path d="M17 6h3a3 3 0 0 1-3 3" /></>,
  sparkles: <><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /><path d="M5 15l.7 1.6L7.3 17l-1.6.7L5 19.3l-.7-1.6L2.7 17l1.6-.4z" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></>,
  shield: <><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
}

const GREEN = '#4d7c0f'
const GREEN_DARK = '#3f6212'
const GREEN_SOFT = '#ECF3DF'

/* Category colors (custom categories get a stable color from their name) */
const CATEGORY_COLORS = {
  'Food & Nutrition':              { bg: '#FFF4E5', accent: '#D97706' },
  'Hygiene & Personal Care':       { bg: '#E8F3FD', accent: '#2563A8' },
  'Medical & Health Supplies':     { bg: '#FDECEC', accent: '#C0392B' },
  'Clothing & Linens':             { bg: '#F3ECFB', accent: '#7C3AED' },
  'Shelter & Survival Gear':       { bg: '#E9F6EC', accent: '#2F855A' },
  'Education & Child Development': { bg: '#E6F7F6', accent: '#0F8B8D' },
}
const EXTRA_COLORS = [
  { bg: '#EEF2FF', accent: '#4F46E5' },
  { bg: '#FDF2F8', accent: '#DB2777' },
  { bg: '#ECFEFF', accent: '#0E7490' },
  { bg: '#FEFCE8', accent: '#A16207' },
]
const FALLBACK = { bg: '#EEF1F4', accent: '#4A5568' }

function categoryColor(category) {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]
  if (!category) return FALLBACK
  let h = 0
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return EXTRA_COLORS[h % EXTRA_COLORS.length]
}

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
function fmtQty(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const DIST_STYLES = {
  full: { label: 'Distributed', bg: '#E9F6EC', color: '#2F855A' },
  partial: { label: 'Partially distributed', bg: '#FFF4E5', color: '#B45309' },
  none: { label: 'Not yet distributed', bg: '#EEF1F4', color: '#4A5568' },
}

function DistPill({ info }) {
  if (!info) return null
  const st = DIST_STYLES[info.status]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: st.bg, color: st.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
      {st.label}
    </span>
  )
}

/* 📱 GCash / 💵 Cash chip for cash donations */
function PayChip({ d }) {
  if (!d.payment_method) return null
  const online = d.payment_method !== 'cash'
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={online ? { background: '#E6F1FF', color: '#0B5FC4' } : { background: '#EEF1F4', color: '#334155' }}
    >
      {online ? `📱 ${d.payment_method}` : '💵 Cash'}
    </span>
  )
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'map', label: 'Map', icon: 'map' },
  { key: 'history', label: 'History', icon: 'clock' },
  { key: 'guide', label: 'Guide', icon: 'book' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]

const NAV_GROUPS = [
  { title: 'Your giving', items: [TABS[0], TABS[1], TABS[2]] },
  { title: 'Help & account', items: [TABS[3], TABS[4]] },
]

const BADGE_DEFS = [
  { id: 'first', title: 'First Gift', desc: 'Record your first donation', icon: 'gift', target: 1, value: (s) => s.total },
  { id: 'helper', title: 'Helping Hand', desc: 'Record 3 donations', icon: 'heart', target: 3, value: (s) => s.total },
  { id: 'regular', title: 'Regular Donor', desc: 'Record 5 donations', icon: 'award', target: 5, value: (s) => s.total },
  { id: 'hero', title: 'Relief Hero', desc: 'Record 10 donations', icon: 'trophy', target: 10, value: (s) => s.total },
  { id: 'explorer', title: 'Barangay Explorer', desc: 'Help 3 barangays', icon: 'pin', target: 3, value: (s) => s.barangayCount },
  { id: 'champion', title: 'Community Champion', desc: 'Help 5 barangays', icon: 'map', target: 5, value: (s) => s.barangayCount },
  { id: 'full', title: 'Full Circle', desc: 'Fully deliver a donation', icon: 'check', target: 1, value: (s) => s.distributed },
  { id: 'many', title: 'Many Hands', desc: 'Reach 10 households', icon: 'users', target: 10, value: (s) => s.households },
  { id: 'allrounder', title: 'All-Rounder', desc: 'Give in 3 categories', icon: 'sparkles', target: 3, value: (s) => s.categoryCount },
]

const GUIDE_STEPS = [
  { icon: 'user', title: '1. Your account', text: 'Your donor account keeps every donation, receipt and delivery update in one place.' },
  { icon: 'gift', title: '2. Donation recorded', text: 'MSWDO staff log the donation you gave — the item, quantity, category and barangay.' },
  { icon: 'shield', title: '3. Verified & prepared', text: 'Staff check the items and prepare them for registered households in the barangay.' },
  { icon: 'check', title: '4. Delivered & signed', text: 'Families receive the aid and e-sign. The delivery then appears in your history.' },
]

const GUIDE_FAQ = [
  {
    q: 'Why is my donation not showing on my dashboard yet?',
    a: 'Donations are entered by MSWDO staff. If you gave an item recently, give the office a little time to record it. If it still does not appear after a few days, visit your barangay office or the MSWDO and ask them to link the donation to your account.',
  },
  {
    q: 'Can I edit or delete a donation?',
    a: 'No. Donation entries are official records and can only be corrected by staff. Contact the MSWDO if something is wrong with the item, quantity or barangay on your record.',
  },
  {
    q: 'Why are the recipient names partly hidden?',
    a: 'Your dashboard shows how your donation was used without revealing a family\'s full identity. This protects the privacy of beneficiary households while still keeping the process transparent for you.',
  },
  {
    q: 'What does "Partially distributed" mean?',
    a: 'It means part of the donation has already reached households, but there is still some quantity left to distribute. "Distributed" means the whole donation has been given out.',
  },
  {
    q: 'How are the barangay counts computed?',
    a: 'Each donation is logged under the barangay where it will be used. The map and your statistics count the different barangays that appear on your donations.',
  },
  {
    q: 'How do I change my name, photo or password?',
    a: 'Open Settings. You can update your profile photo, full name, username and password there. Your email address is tied to your login and is shown for reference.',
  },
]

const FAQ_HELP = [
  {
    q: 'Who do I contact if my donation is missing?',
    a: 'Visit the MSWDO office in Manolo Fortich or ask your barangay office to check the donation record. Bring any receipt or photo you have of the handover.',
  },
  {
    q: 'Is my personal information public?',
    a: 'No. Your account details are only visible to you and authorised MSWDO staff. Public pages show donation totals, not your private information.',
  },
  {
    q: 'Can I download a copy of my donations?',
    a: 'Yes. Go to Settings → Data & privacy and choose "Download my record". It saves a CSV file you can open in Excel or Google Sheets.',
  },
]

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const donorInput =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4d7c0f] focus:ring-2 focus:ring-[#4d7c0f]/20 disabled:bg-slate-50 disabled:text-faint'

export default function DonorDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreset, setAvatarPreset] = useState('')
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [dist, setDist] = useState({}) // donation_id -> list of distributions that came from it
  const [distReady, setDistReady] = useState(false)
  const [toast, setToast] = useState(null) // { type: 'ok' | 'err', text }
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingPreset, setSavingPreset] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: u } = await supabase.auth.getUser()
      const currentUser = u?.user
      if (!currentUser) {
        setLoading(false)
        return
      }
      setUser(currentUser)
      setEmail(currentUser.email || '')

      const meta = currentUser.user_metadata || {}
      const [{ data: profileRow }, { data: rows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase
          .from('donations')
          .select('*')
          .eq('donor_id', currentUser.id)
          .neq('status', 'archived')
          .order('created_at', { ascending: false }),
      ])

      const prof = profileRow || null
      setProfile(prof)
      setFullName(prof?.full_name || meta.full_name || '')
      setUsername(meta.username || '')
      setAvatarUrl(prof?.avatar_url || meta.avatar_url || '')
      setAvatarPreset(meta.avatar_preset || '')
      setDonations(rows || [])

      // Who received each donation (names are masked on the database side)
      const { data: dRows, error: dErr } = await supabase.rpc('donor_donation_distribution')
      if (!dErr) {
        const map = {}
        ;(dRows || []).forEach((r) => {
          ;(map[r.donation_id] = map[r.donation_id] || []).push(r)
        })
        setDist(map)
        setDistReady(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  function notify(type, text) {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3500)
  }

  function goToTab(key) {
    setTab(key)
    setMobileOpen(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/donor/login')
  }

  const displayName = fullName || (email ? email.split('@')[0] : 'Donor')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const memberSince = profile?.created_at || user?.created_at
  const showLabels = !collapsed || mobileOpen

  function distInfo(d) {
    if (!distReady) return null
    const rows = dist[d.id] || []
    const given = rows.reduce((sum, r) => sum + Number(r.qty || 0), 0)
    const total = Number(d.quantity) || 0
    const status = given <= 0 ? 'none' : given + 0.0001 >= total ? 'full' : 'partial'
    return { rows, given, total, status }
  }

  const stats = useMemo(() => {
    const confirmed = donations.filter((d) => d.status === 'confirmed').length
    const distributed = distReady ? donations.filter((d) => distInfo(d)?.status === 'full').length : 0
    const partially = distReady ? donations.filter((d) => distInfo(d)?.status === 'partial').length : 0
    const barangays = new Set(donations.map((d) => (d.barangay || '').trim().toLowerCase()).filter(Boolean))

    const byBarangay = {}
    const byCategory = {}
    donations.forEach((d) => {
      const b = (d.barangay || '').trim() || 'Unknown'
      ;(byBarangay[b] = byBarangay[b] || { name: b, count: 0, items: [] })
      byBarangay[b].count += 1
      if (d.item && !byBarangay[b].items.includes(d.item)) byBarangay[b].items.push(d.item)

      const c = d.category || 'Uncategorized'
      byCategory[c] = (byCategory[c] || 0) + 1
    })

    const allDistRows = Object.values(dist).flat()
    const householdSet = new Set(
      allDistRows
        .map((r) => String(r.recipient_name || r.household_head || r.household_id || '').trim().toLowerCase())
        .filter(Boolean)
    )

    // A simple 6-month activity series for the overview chart.
    const now = new Date()
    const monthly = []
    const monthIndex = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const entry = { key, label: d.toLocaleDateString('en-US', { month: 'short' }), count: 0 }
      monthly.push(entry)
      monthIndex[key] = entry
    }
    donations.forEach((d) => {
      const dt = new Date(d.created_at)
      if (Number.isNaN(dt.getTime())) return
      const entry = monthIndex[`${dt.getFullYear()}-${dt.getMonth()}`]
      if (entry) entry.count += 1
    })

    return {
      total: donations.length,
      confirmed,
      distributed,
      partially,
      barangayCount: barangays.size,
      last: donations[0]?.created_at,
      byBarangay: Object.values(byBarangay).sort((a, b) => b.count - a.count),
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
      categoryCount: Object.keys(byCategory).filter((c) => c !== 'Uncategorized').length,
      households: householdSet.size,
      deliveryRecords: allDistRows.length,
      completion: donations.length ? Math.round((distributed / donations.length) * 100) : 0,
      monthly,
    }
  }, [donations, dist, distReady])

  const achievements = useMemo(
    () =>
      BADGE_DEFS.map((badge) => {
        const value = Math.max(0, Number(badge.value(stats)) || 0)
        return { ...badge, value, unlocked: value >= badge.target }
      }),
    [stats]
  )
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const nextBadge = achievements
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.value / b.target - a.value / a.target)[0]

  const categoryChips = useMemo(() => stats.byCategory.map(([c]) => c), [stats])

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase()
    return donations.filter((d) => {
      if (catFilter !== 'All' && (d.category || 'Uncategorized') !== catFilter) return false
      if (!q) return true
      return (
        (d.item || '').toLowerCase().includes(q) ||
        (d.barangay || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      )
    })
  }, [donations, search, catFilter])

  const recentActivity = useMemo(() => {
    const byId = new Map(donations.map((d) => [d.id, d]))
    return Object.entries(dist)
      .flatMap(([donationId, rows]) =>
        rows.map((r) => ({ ...r, donation: byId.get(donationId) }))
      )
      .filter((r) => r.donation)
      .sort(
        (a, b) =>
          new Date(b.distributed_at || b.created_at || 0) -
          new Date(a.distributed_at || a.created_at || 0)
      )
      .slice(0, 5)
  }, [dist, donations])

  const statCards = [
    { label: 'Total donations', value: stats.total, icon: 'gift', accent: GREEN },
    distReady
      ? { label: 'Fully delivered', value: `${stats.distributed} / ${stats.total}`, icon: 'check', accent: '#2f855a' }
      : { label: 'Confirmed', value: stats.confirmed, icon: 'check', accent: '#2f855a' },
    { label: 'Barangays helped', value: `${stats.barangayCount} / 22`, icon: 'pin', accent: '#1d5fa8' },
    { label: 'Last donation', value: stats.last ? fmtDate(stats.last) : '—', icon: 'clock', accent: '#0e7490', small: true },
  ]

  async function handleSaveProfile(e) {
    e.preventDefault()
    const name = fullName.trim()
    const uname = username.trim()

    if (!name) return notify('err', 'Please enter your full name.')
    if (uname && uname.length < 3) return notify('err', 'Username must be at least 3 characters.')

    setSavingProfile(true)
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name, username: uname },
    })
    if (!authError) {
      // The profile row is what the admin registry reads. If the database
      // policy does not allow this write, the auth metadata still keeps the
      // dashboard name up to date.
      await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)
    }
    setSavingProfile(false)

    if (authError) return notify('err', authError.message || 'Could not save your profile.')
    setFullName(name)
    setUsername(uname)
    notify('ok', 'Profile updated.')
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return notify('err', 'Please choose an image file.')
    if (file.size > 2 * 1024 * 1024) return notify('err', 'Image must be 2 MB or smaller.')

    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      setUploadingAvatar(false)
      return notify('err', 'Upload failed. Try again.')
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = pub.publicUrl
    const { error: metaErr } = await supabase.auth.updateUser({ data: { avatar_url: url, avatar_preset: null } })
    const { error: rowErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)

    if (metaErr && rowErr) {
      setUploadingAvatar(false)
      return notify('err', 'Photo uploaded but could not be saved to your account. Try again.')
    }

    setAvatarUrl(url)
    setAvatarPreset('')
    setUploadingAvatar(false)
    notify('ok', 'Profile photo updated.')
  }

  async function handlePreset(id) {
    if (!user || savingPreset) return
    const prevPreset = avatarPreset
    const prevUrl = avatarUrl
    setAvatarPreset(id)
    setAvatarUrl('')
    setSavingPreset(true)

    const { error } = await supabase.auth.updateUser({ data: { avatar_preset: id, avatar_url: null } })
    if (!error) {
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    }
    setSavingPreset(false)

    if (error) {
      setAvatarPreset(prevPreset)
      setAvatarUrl(prevUrl)
      return notify('err', 'Could not update your avatar.')
    }
    notify('ok', 'Avatar updated.')
  }

  function handleDownloadCsv() {
    const header = ['Item', 'Category', 'Quantity', 'Unit', 'Barangay', 'Status', 'Payment method', 'Reference', 'Recorded on', 'Delivery status']
    const rows = donations.map((d) => {
      const info = distInfo(d)
      return [
        d.item,
        d.category,
        d.quantity,
        d.unit,
        d.barangay,
        d.status,
        d.payment_method,
        d.payment_reference,
        fmtDateTime(d.created_at),
        info ? DIST_STYLES[info.status].label : '',
      ]
    })
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadCsv(`bantayayuda-donations-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    notify('ok', 'Your donation record was downloaded.')
  }

  async function handleShareImpact() {
    const text =
      `I have made ${stats.total} donation${stats.total === 1 ? '' : 's'} through BantayAyuda, ` +
      `helping ${stats.barangayCount} barangay${stats.barangayCount === 1 ? '' : 's'} in Manolo Fortich. ` +
      `${stats.households} household${stats.households === 1 ? '' : 's'} reached so far.`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My BantayAyuda impact', text })
      } else {
        await navigator.clipboard.writeText(text)
        notify('ok', 'Impact summary copied to your clipboard.')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') notify('err', 'Could not share your impact summary.')
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-cream">
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

      <div className="flex min-h-screen">
        {/* Mobile drawer backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`no-print fixed inset-y-0 left-0 z-50 flex flex-col bg-navy text-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen
            w-64 ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <button
            onClick={() => goToTab('overview')}
            className="flex items-center gap-3 border-b border-white/10 px-4 py-4 text-left"
          >
            <img src={bantayayudaSeal} alt="BantayAyuda seal" className="h-10 w-10 shrink-0" />
            {showLabels && (
              <div className="min-w-0">
                <div className="truncate text-base font-bold leading-tight tracking-tight">BantayAyuda</div>
                <div className="truncate text-[10px] text-white/60">Donor portal · Manolo Fortich</div>
              </div>
            )}
          </button>

          <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4">
            {NAV_GROUPS.map((g) => (
              <div key={g.title}>
                {showLabels && (
                  <div className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                    {g.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {g.items.map((t) => {
                    const active = tab === t.key
                    return (
                      <button
                        key={t.key}
                        onClick={() => goToTab(t.key)}
                        title={showLabels ? undefined : t.label}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-xs font-bold transition-colors ${
                          active ? 'bg-[#4d7c0f] text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'
                        } ${showLabels ? '' : 'justify-center'}`}
                      >
                        <Icon path={icons[t.icon]} className="h-4 w-4 shrink-0" />
                        {showLabels && <span className="truncate">{t.label}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="space-y-2 border-t border-white/10 px-2.5 py-3">
            {showLabels && (
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-[#4d7c0f] px-3 py-1.5 text-[11px] font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Donor
              </span>
            )}
            <button
              onClick={handleLogout}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white ${showLabels ? '' : 'justify-center'}`}
            >
              <Icon path={icons.logout} className="h-4 w-4 shrink-0" />
              {showLabels && 'Log out'}
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden w-full items-center justify-center rounded-lg px-2.5 py-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:flex"
            >
              <Icon path={collapsed ? icons.chevronRight : icons.chevronLeft} className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-5xl flex-1 px-3 pb-28 pt-4 sm:px-4 sm:py-8">
            {/* Banner */}
            <div className="relative mb-4 overflow-hidden rounded-card bg-gradient-to-r from-[#1c3d12] via-[#2f5417] to-[#0b2545] p-4 text-white shadow-[0_4px_14px_rgba(0,0,0,0.2)] sm:mb-6 sm:p-6">
              <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-20 right-28 h-44 w-44 rounded-full bg-white/5" />
              <div className="relative flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <Avatar
                    name={displayName}
                    avatarUrl={avatarUrl || undefined}
                    avatarPreset={avatarPreset || undefined}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-white/70 sm:text-[11px]">
                      {greeting}<span className="hidden sm:inline"> · {dateLabel}</span>
                    </div>
                    <h1 className="truncate text-lg font-bold capitalize leading-tight sm:text-xl">{displayName}</h1>
                    <p className="mt-0.5 hidden truncate text-xs text-white/75 sm:block">{email}</p>
                    <p className="mt-0.5 text-[11px] text-white/75">
                      {memberSince ? `Donor since ${fmtDate(memberSince)}` : 'Thank you for helping families in Manolo Fortich'}
                    </p>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
                    <Icon path={icons.heart} className="h-3.5 w-3.5 text-[#c8e29a]" />
                    Donor
                  </span>
                  <button
                    onClick={handleShareImpact}
                    className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#2f5417] shadow-sm transition hover:bg-white/90"
                  >
                    Share impact
                  </button>
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
              {statCards.map((s) => (
                <div
                  key={s.label}
                  className="relative h-full overflow-hidden rounded-card bg-white p-3 pt-4 shadow-[0_2px_8px_rgba(0,0,0,0.1)] sm:p-4 sm:pt-5"
                >
                  <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: s.accent }} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold leading-tight text-faint sm:text-xs">{s.label}</div>
                      <div className={`mt-1 truncate font-bold text-ink ${s.small ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'}`}>
                        {loading ? '…' : s.value}
                      </div>
                    </div>
                    <div
                      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 sm:flex"
                      style={{ color: s.accent }}
                    >
                      <Icon path={icons[s.icon]} className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

        {/* ───────── Overview ───────── */}
        {tab === 'overview' && (
          <div className="mt-5 space-y-5">
            {!loading && donations.length === 0 && (
              <Card className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-faint">
                  <Icon path={icons.gift} className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">No donations on your record yet</p>
                  <p className="mt-1 max-w-md text-xs text-faint">
                    Once the MSWDO staff records a donation under your account, it will appear here — together with
                    where it went and how many families it reached.
                  </p>
                </div>
                <button
                  onClick={() => setTab('guide')}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white"
                  style={{ background: GREEN }}
                >
                  <Icon path={icons.book} className="h-4 w-4" />
                  See how it works
                </button>
              </Card>
            )}

            {donations.length > 0 && (
              <>
                {/* Impact banner */}
                <Card
                  className="relative overflow-hidden border-0 p-5 text-white shadow-lg sm:p-6"
                  style={{ background: 'linear-gradient(135deg, #1c3d12 0%, #2f5417 55%, #0b2545 100%)' }}
                >
                  <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-[#9ccc4a]/10" />
                  <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8e29a]">Your impact</p>
                      <h2 className="mt-1 text-lg font-extrabold sm:text-xl">
                        {stats.households > 0
                          ? `${stats.households} household${stats.households === 1 ? '' : 's'} reached`
                          : 'Your first delivery is on the way'}
                      </h2>
                      <p className="mt-1 max-w-md text-xs text-white/70">
                        {stats.completion}% of your donations have been fully delivered. Every gift is tracked from
                        the MSWDO storage room to the family's door.
                      </p>
                    </div>
                    <button
                      onClick={handleShareImpact}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
                    >
                      <Icon path={icons.share} className="h-4 w-4" />
                      Share
                    </button>
                  </div>

                  <div className="relative mt-5 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Households', value: stats.households },
                      { label: 'Barangays', value: stats.barangayCount },
                      { label: 'Deliveries', value: stats.deliveryRecords },
                    ].map((m) => (
                      <div key={m.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                        <div className="text-xl font-extrabold sm:text-2xl">{m.value}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-white/55">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="relative mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-white/65">
                      <span>Delivery progress</span>
                      <span>
                        {stats.distributed} of {stats.total} fully delivered
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[#9ccc4a] transition-all duration-700"
                        style={{ width: `${Math.max(stats.completion, stats.total ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Recent donations */}
                <Card className="overflow-hidden p-0">
                  <div className="flex items-center justify-between border-b border-line-soft bg-line-soft/40 px-4 py-3 sm:px-6 sm:py-4">
                    <h2 className="text-sm font-bold text-ink">Your recent donations</h2>
                    {donations.length > 5 && (
                      <button
                        onClick={() => setTab('history')}
                        className="text-xs font-bold hover:underline"
                        style={{ color: GREEN }}
                      >
                        View all {donations.length} →
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 p-3 sm:p-4">
                    {donations.slice(0, 5).map((d) => {
                      const c = categoryColor(d.category)
                      return (
                        <div
                          key={d.id}
                          className="flex flex-col gap-2.5 rounded-xl border border-line-soft px-3 py-3 transition hover:bg-line-soft/30 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                              style={{ background: c.bg, color: c.accent }}
                            >
                              <Icon path={icons.gift} className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-ink">{d.item}</div>
                              <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-faint">
                                <span className="inline-flex items-center gap-1">
                                  <Icon path={icons.pin} className="h-3 w-3" />
                                  Brgy. {d.barangay || '—'}
                                </span>
                                <span>{fmtDate(d.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pl-[52px] sm:pl-0">
                            <PayChip d={d} />
                            <DistPill info={distInfo(d)} />
                            <span
                              className="rounded-lg px-3 py-1.5 text-xs font-bold"
                              style={{ background: c.bg, color: c.accent }}
                            >
                              {d.quantity} {d.unit || ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Activity + achievements */}
                <div className="grid gap-5 lg:grid-cols-2">
                  <Card className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-ink">Donation activity</h2>
                        <p className="text-xs text-faint">Your last 6 months</p>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: GREEN_SOFT, color: GREEN_DARK }}>
                        {stats.monthly.reduce((sum, m) => sum + m.count, 0)} this period
                      </span>
                    </div>
                    <div className="mt-5 flex h-36 items-end gap-2">
                      {stats.monthly.map((m) => {
                        const max = Math.max(...stats.monthly.map((x) => x.count), 1)
                        const height = m.count ? Math.max(10, Math.round((m.count / max) * 100)) : 5
                        return (
                          <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                            <span className="text-[10px] font-bold" style={{ color: m.count ? GREEN_DARK : '#a8a8a2' }}>
                              {m.count || ''}
                            </span>
                            <div className="flex w-full flex-1 items-end">
                              <div
                                className="w-full rounded-t-md transition-all duration-700"
                                style={{
                                  height: `${height}%`,
                                  background: m.count
                                    ? 'linear-gradient(180deg, #7cb342 0%, #4d7c0f 100%)'
                                    : '#EDEBE4',
                                }}
                                title={`${m.label}: ${m.count} donation${m.count === 1 ? '' : 's'}`}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-faint">{m.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="mt-3 border-t border-line-soft pt-3 text-[11px] text-faint">
                      Every bar is a month of giving. Keep the streak going — even one small donation counts.
                    </p>
                  </Card>

                  <Card className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-ink">Achievements</h2>
                        <p className="text-xs text-faint">Little milestones on your giving journey</p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                        style={{ background: GREEN }}
                      >
                        {unlockedCount}/{achievements.length}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                      {achievements.map((a) => (
                        <div
                          key={a.id}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition ${
                            a.unlocked ? 'border-transparent' : 'border-line-soft'
                          }`}
                          style={a.unlocked ? { background: GREEN_SOFT } : { background: '#FAF9F6' }}
                          title={a.desc}
                        >
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={
                              a.unlocked
                                ? { background: GREEN, color: '#fff' }
                                : { background: '#E8E6DF', color: '#9c9a92' }
                            }
                          >
                            <Icon path={icons[a.icon]} className="h-4 w-4" />
                          </span>
                          <span className={`text-[10px] font-bold leading-tight ${a.unlocked ? 'text-ink' : 'text-faint'}`}>
                            {a.title}
                          </span>
                          {!a.unlocked && (
                            <span className="text-[9px] font-semibold text-faint">
                              {a.value}/{a.target}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-xl border border-line-soft bg-line-soft/40 px-3 py-2.5">
                      {nextBadge ? (
                        <>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-ink">Next: {nextBadge.title}</span>
                            <span className="text-faint">
                              {nextBadge.value}/{nextBadge.target}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(100, (nextBadge.value / nextBadge.target) * 100)}%`,
                                background: GREEN,
                              }}
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] text-faint">{nextBadge.desc}</p>
                        </>
                      ) : (
                        <p className="text-[11px] font-semibold text-ink">
                          All milestones unlocked. You are a true BantayAyuda hero! 🏆
                        </p>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Where it went + What you gave */}
                <div className="grid gap-5 lg:grid-cols-2">
                  <Card className="p-4 sm:p-6">
                    <h2 className="text-sm font-bold text-ink">Where your donations went</h2>
                    <p className="mb-4 text-xs text-faint">
                      {stats.barangayCount} barangay{stats.barangayCount === 1 ? '' : 's'} reached so far
                    </p>
                    <div className="space-y-3">
                      {stats.byBarangay.slice(0, 6).map((b) => (
                        <div key={b.name}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink">Brgy. {b.name}</span>
                            <span className="text-faint">
                              {b.count} donation{b.count === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-black/5">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(8, (b.count / stats.byBarangay[0].count) * 100)}%`,
                                background: GREEN,
                              }}
                            />
                          </div>
                          <div className="mt-1 truncate text-[11px] text-faint">
                            {b.items.slice(0, 3).join(', ')}
                            {b.items.length > 3 ? ` +${b.items.length - 3} more` : ''}
                          </div>
                        </div>
                      ))}
                      {stats.byBarangay.length > 6 && (
                        <p className="text-[11px] text-faint">+{stats.byBarangay.length - 6} more barangays</p>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-6">
                    <h2 className="text-sm font-bold text-ink">What you gave</h2>
                    <p className="mb-4 text-xs text-faint">Your donations by category</p>
                    <div className="space-y-3">
                      {stats.byCategory.map(([name, count]) => {
                        const c = categoryColor(name)
                        return (
                          <div key={name}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-semibold text-ink">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.accent }} />
                                {name}
                              </span>
                              <span className="text-faint">{count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full" style={{ background: c.bg }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(8, (count / stats.byCategory[0][1]) * 100)}%`,
                                  background: c.accent,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </div>

                {/* Recent deliveries feed */}
                {recentActivity.length > 0 && (
                  <Card className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-ink">Fresh from the field</h2>
                        <p className="text-xs text-faint">The latest families who received your donations</p>
                      </div>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: GREEN_SOFT, color: GREEN_DARK }}>
                        <Icon path={icons.sparkles} className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {recentActivity.map((r, i) => (
                        <div
                          key={r.id || i}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-soft px-3 py-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: GREEN_SOFT, color: GREEN_DARK }}>
                              <Icon path={icons.heart} className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-ink">
                                {r.donation.item} reached Household {r.recipient_name || ''}
                              </div>
                              <div className="text-[11px] text-faint">
                                Brgy. {r.barangay || r.donation.barangay || '—'} · {fmtDateTime(r.distributed_at)}
                              </div>
                            </div>
                          </div>
                          <span className="rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ background: GREEN_SOFT, color: GREEN_DARK }}>
                            {fmtQty(r.qty)} {r.donation.unit || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ───────── Map ───────── */}
        {tab === 'map' && (
          <div className="mt-5 space-y-5">
            <Card className="p-4 sm:p-6">
              <h2 className="text-sm font-bold text-ink">Your coverage</h2>
              <p className="mb-3 text-xs text-faint">
                {stats.barangayCount > 0
                  ? `You have helped ${stats.barangayCount} of 22 barangays. The map below shows aid progress across the whole municipality.`
                  : 'Your barangays will appear here after your first donation is recorded.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.byBarangay.length === 0 && (
                  <span className="text-xs text-faint">No barangays on your record yet.</span>
                )}
                {stats.byBarangay.map((b) => (
                  <span
                    key={b.name}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                    style={{ background: GREEN_SOFT, color: GREEN_DARK }}
                  >
                    <Icon path={icons.pin} className="h-3 w-3" />
                    Brgy. {b.name}
                    <span className="rounded-full bg-white/70 px-1.5 text-[10px]">{b.count}</span>
                  </span>
                ))}
              </div>
            </Card>
            <Card className="overflow-hidden p-0">
              <div className="border-b border-line-soft bg-line-soft/40 px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="text-sm font-bold text-ink">Coverage map</h2>
                <p className="text-xs text-faint">Manolo Fortich, Bukidnon — 22 barangays</p>
              </div>
              <div className="p-4">
                <BarangayMap height="340px" />
              </div>
            </Card>
          </div>
        )}

        {/* ───────── History ───────── */}
        {tab === 'history' && (
          <div className="mt-5">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
                <Icon path={icons.search} className="h-4 w-4" />
              </span>
              <input
                placeholder="Search by item, barangay, or category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-[#4d7c0f] focus:ring-2 focus:ring-[#4d7c0f]/20"
              />
            </div>

            {categoryChips.length > 1 && (
              <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
                {['All', ...categoryChips].map((c) => {
                  const active = catFilter === c
                  const col = c === 'All' ? { accent: GREEN, bg: GREEN_SOFT } : categoryColor(c)
                  return (
                    <button
                      key={c}
                      onClick={() => setCatFilter(c)}
                      className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
                      style={
                        active
                          ? { background: col.accent, borderColor: col.accent, color: '#fff' }
                          : { background: col.bg, borderColor: col.bg, color: col.accent }
                      }
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            )}

            <p className="mt-3 text-[11px] font-semibold text-faint">
              Showing {filteredHistory.length} of {donations.length}
            </p>

            {!loading && filteredHistory.length === 0 && (
              <Card className="mt-3 p-8 text-center text-sm text-faint">
                {donations.length === 0 ? 'No donations on your record yet.' : 'No donations match your search.'}
              </Card>
            )}

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {filteredHistory.map((d) => {
                const c = categoryColor(d.category)
                return (
                  <Card key={d.id} className="p-4 sm:p-5" style={{ borderTop: `4px solid ${c.accent}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: c.bg, color: c.accent }}
                        >
                          <Icon path={icons.gift} className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-ink">{d.item}</div>
                          <div className="text-sm font-bold" style={{ color: c.accent }}>
                            {d.quantity} {d.unit || ''}
                          </div>
                        </div>
                      </div>
                      {distReady ? (
                        <DistPill info={distInfo(d)} />
                      ) : (
                        <Badge tone={d.status === 'confirmed' ? 'confirmed' : 'pending'}>{d.status}</Badge>
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-line-soft pt-3 text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <Icon path={icons.pin} className="h-3.5 w-3.5 text-faint" />
                        Brgy. {d.barangay || '—'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon path={icons.clock} className="h-3.5 w-3.5 text-faint" />
                        {fmtDateTime(d.created_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon path={icons.user} className="h-3.5 w-3.5 text-faint" />
                        Donated as {d.donor_name || displayName}
                        {d.recorded_by ? <span className="text-faint"> · recorded by {d.recorded_by}</span> : null}
                      </div>
                      {d.payment_method && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Icon path={icons.card} className="h-3.5 w-3.5 text-faint" />
                          {d.payment_method === 'cash' ? 'Cash handed over' : `Sent online via ${d.payment_method}`}
                          {d.payment_reference && (
                            <span className="font-mono text-faint"> · Ref {d.payment_reference}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {(() => {
                      const info = distInfo(d)
                      if (!info) return null
                      if (info.status === 'none') {
                        return (
                          <p className="mt-3 rounded-lg bg-black/[0.03] px-3 py-2 text-xs text-muted">
                            Waiting to be given to a registered household.
                          </p>
                        )
                      }
                      return (
                        <div className="mt-3 rounded-xl p-3" style={{ background: GREEN_SOFT }}>
                          <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[#2f855a]">
                            <span>Given to</span>
                            <span>
                              {fmtQty(info.given)} of {fmtQty(info.total)} {d.unit || ''}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {info.rows.slice(0, 6).map((r, i) => (
                              <div key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <div className="font-semibold text-ink">
                                    Household {r.recipient_name || ''}
                                  </div>
                                  <div className="text-faint">
                                    Brgy. {r.barangay || '—'} · {fmtDateTime(r.distributed_at)}
                                  </div>
                                </div>
                                <span className="font-bold text-[#2f855a]">
                                  {fmtQty(r.qty)} {d.unit || ''}
                                </span>
                              </div>
                            ))}
                            {info.rows.length > 6 && (
                              <p className="text-[11px] text-faint">+{info.rows.length - 6} more households</p>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {d.description && (
                      <div className="mt-3 rounded-lg bg-black/[0.03] px-3 py-2 text-xs italic text-muted">
                        "{d.description}"
                      </div>
                    )}

                    {d.category && (
                      <div className="mt-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: c.bg, color: c.accent }}
                        >
                          {d.category}
                        </span>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* ───────── Guide ───────── */}
        {tab === 'guide' && (
          <div className="mt-5 space-y-5">
            <Card className="overflow-hidden p-0">
              <div
                className="relative overflow-hidden px-4 py-6 text-white sm:px-6 sm:py-8"
                style={{ background: 'linear-gradient(135deg, #1c3d12 0%, #2f5417 55%, #0b2545 100%)' }}
              >
                <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
                <div className="relative">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8e29a]">Quick guide</p>
                  <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">How your donation makes a difference</h2>
                  <p className="mt-1 max-w-xl text-xs text-white/70">
                    From the moment the MSWDO records your gift to the moment a family signs for it, here is what
                    happens — and where you can follow along.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
                {GUIDE_STEPS.map((step) => (
                  <div key={step.title} className="rounded-xl border border-line-soft p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: GREEN_SOFT, color: GREEN_DARK }}>
                      <Icon path={icons[step.icon]} className="h-4 w-4" />
                    </span>
                    <div className="mt-3 text-xs font-bold text-ink">{step.title}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-faint">{step.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-4 sm:p-6">
                <h2 className="text-sm font-bold text-ink">Understanding your status</h2>
                <p className="mb-4 text-xs text-faint">What the labels on each donation mean</p>
                <div className="space-y-3">
                  {[
                    { status: 'none', text: 'Your donation is recorded and waiting to be given to a registered household.' },
                    { status: 'partial', text: 'Part of your donation has reached families, and the rest is still being distributed.' },
                    { status: 'full', text: 'The whole donation has been given out. Every item is accounted for.' },
                  ].map((row) => (
                    <div key={row.status} className="rounded-xl border border-line-soft p-3">
                      <DistPill info={{ status: row.status }} />
                      <p className="mt-2 text-xs leading-relaxed text-muted">{row.text}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <h2 className="text-sm font-bold text-ink">Make the most of your dashboard</h2>
                <p className="mb-4 text-xs text-faint">A quick tour of the sidebar menu</p>
                <div className="space-y-3">
                  {[
                    { icon: 'grid', title: 'Overview', text: 'Your impact, recent donations, monthly activity and achievements.' },
                    { icon: 'map', title: 'Map', text: 'See the barangays you have helped and the aid progress across the municipality.' },
                    { icon: 'clock', title: 'History', text: 'Search and filter every donation, including who received it.' },
                    { icon: 'settings', title: 'Settings', text: 'Update your photo and name, change your password, and download your record.' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 text-muted">
                        <Icon path={icons[item.icon]} className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-ink">{item.title}</div>
                        <div className="text-[11px] leading-relaxed text-faint">{item.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: GREEN_SOFT, color: GREEN_DARK }}>
                  <Icon path={icons.award} className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">A little extra motivation</h2>
                  <p className="text-xs text-faint">Badges are just for fun — your real impact is the families you reach.</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                The achievements on your overview unlock as you record more donations, reach more barangays, and
                fully deliver aid to households. There is nothing to claim or pay for — they are simply a record of
                your generosity.
              </p>
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="mb-1 text-sm font-bold text-ink">Frequently asked questions</h2>
              <p className="mb-2 text-xs text-faint">Tap a question to see the answer.</p>
              <Faq items={GUIDE_FAQ} accent={GREEN} />
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="mb-1 text-sm font-bold text-ink">Still need help?</h2>
              <p className="mb-3 text-xs text-faint">The MSWDO and your barangay office can check donation records with you.</p>
              <Faq items={FAQ_HELP} accent={GREEN} />
            </Card>
          </div>
        )}

        {/* ───────── Settings ───────── */}
        {tab === 'settings' && (
          <div className="mt-5 space-y-5">
            {!user && !loading && (
              <Card className="p-6 text-center text-sm text-faint">
                We could not load your account. Please log out and log in again.
              </Card>
            )}

            {user && (
              <>
                {/* Profile photo */}
                <Card className="p-4 sm:p-6">
                  <h2 className="text-sm font-bold text-ink">Profile photo</h2>
                  <p className="mb-4 text-xs text-faint">Choose a preset or upload your own picture.</p>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                    <Avatar
                      name={displayName}
                      avatarUrl={avatarUrl || undefined}
                      avatarPreset={avatarPreset || undefined}
                      size="lg"
                    />
                    <div>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                        style={{ background: GREEN }}
                      >
                        <Icon path={icons.camera} className="h-4 w-4" />
                        {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
                      </button>
                      <p className="mt-2 text-xs text-faint">JPG or PNG, up to 2 MB.</p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-line-soft pt-4">
                    <p className="mb-2 text-xs font-bold text-ink">Or pick a preset avatar</p>
                    <div className="grid max-w-md grid-cols-8 gap-2">
                      {AVATAR_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handlePreset(p.id)}
                          disabled={savingPreset}
                          title="Use this avatar"
                          className={`flex aspect-square w-full items-center justify-center rounded-xl ring-2 transition hover:scale-105 disabled:opacity-60 ${
                            avatarPreset === p.id && !avatarUrl ? 'ring-[#4d7c0f] ring-offset-2' : 'ring-transparent'
                          }`}
                          style={{ background: p.bg }}
                        >
                          <PresetAvatarIcon id={p.id} size={22} />
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Profile details */}
                <form onSubmit={handleSaveProfile}>
                  <Card className="p-4 sm:p-6">
                    <h2 className="mb-1 text-sm font-bold text-ink">Your details</h2>
                    <p className="mb-4 text-xs text-faint">This is how your name appears to you and to the staff who record your donations.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-ink">Full name</span>
                        <input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          maxLength={80}
                          placeholder="e.g. Maria Santos"
                          className={donorInput}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-ink">Username</span>
                        <input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          maxLength={30}
                          placeholder="e.g. maria_santos"
                          className={donorInput}
                        />
                        <span className="mt-1 block text-[11px] text-faint">Shown on your dashboard. At least 3 characters.</span>
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-bold text-ink">Email (used to log in)</span>
                        <input value={email} disabled className={donorInput} />
                        <span className="mt-1 block text-[11px] text-faint">Contact MSWDO staff if you need to change your login email.</span>
                      </label>
                    </div>
                    <div className="mt-4 flex flex-col-reverse gap-2 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[11px] text-faint">
                        {memberSince ? `Donor since ${fmtDate(memberSince)}` : ''}
                      </span>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="rounded-lg px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                        style={{ background: GREEN }}
                      >
                        {savingProfile ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </Card>
                </form>

                {/* Password & security */}
                <PasswordSecurityCard
                  email={email}
                  lastSignIn={user.last_sign_in_at}
                  accent={GREEN}
                  inputClassName={donorInput}
                  onSignOutAll={() => navigate('/donor/login')}
                />

                {/* Data & privacy */}
                <Card className="p-4 sm:p-6">
                  <h2 className="mb-1 text-sm font-bold text-ink">Data &amp; privacy</h2>
                  <p className="mb-4 text-xs text-faint">Keep a copy of your record, or review how your data is handled.</p>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft p-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 text-muted">
                          <Icon path={icons.download} className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-ink">Download my record</div>
                          <div className="text-[11px] text-faint">Every donation as a CSV file you can open in Excel.</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadCsv}
                        disabled={donations.length === 0}
                        className="rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-black/5 disabled:opacity-50"
                      >
                        Download CSV
                      </button>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-line-soft p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 text-muted">
                        <Icon path={icons.shield} className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-ink">Your privacy is protected</div>
                        <div className="text-[11px] leading-relaxed text-faint">
                          Recipient names are partly hidden on your dashboard. Your account details are only visible
                          to you and authorised MSWDO staff.
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Account */}
                <Card className="p-4 sm:p-6">
                  <h2 className="mb-1 text-sm font-bold text-ink">Account</h2>
                  <p className="mb-4 text-xs text-faint">Signed in as {email}.</p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-[#4d7c0f] hover:bg-[#ECF3DF]"
                  >
                    <Icon path={icons.logout} className="h-4 w-4" />
                    Log out of this account
                  </button>
                </Card>
              </>
            )}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* ── Phone bottom navigation ── */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {TABS.slice(0, 4).map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => goToTab(t.key)}
                className={`flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold transition-colors ${
                  active ? '' : 'text-faint'
                }`}
                style={active ? { color: GREEN } : undefined}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={active ? { background: GREEN_SOFT } : undefined}
                >
                  <Icon path={icons[t.icon]} className="h-5 w-5" />
                </span>
                <span className="truncate">{t.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold text-faint transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl">
              <Icon path={icons.menu} className="h-5 w-5" />
            </span>
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
