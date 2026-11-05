import { Link } from 'react-router-dom'
import bantayayudaSeal from '../assets/bantayayuda-seal.png'

function Icon({ path, className = 'h-4 w-4', style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      {path}
    </svg>
  )
}

const icons = {
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>,
  donor: <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />,
  admin: <><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" /><path d="M9 12l2 2 4-4" /></>,
  beneficiary: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
}

const THEMES = {
  donor: {
    panel: 'from-[#1d4a12] via-[#0b2545] to-[#081a31]',
    accent: '#9ccc4a',
    soft: 'rgba(156, 204, 74, 0.16)',
    badge: 'border-[#9ccc4a]/35 bg-[#9ccc4a]/15 text-[#dcefc0]',
    icon: 'bg-donor-light text-donor-dark',
    iconPath: icons.donor,
    role: 'Donor portal',
    headline: 'Every donation has a destination.',
    blurb: 'Follow your relief goods from the moment they are recorded to the family that receives them.',
    points: ['Track each donation in real time', 'See the barangay and households helped', 'All 22 barangays of Manolo Fortich'],
  },
  admin: {
    panel: 'from-[#5c1515] via-[#2a0b0b] to-[#081a31]',
    accent: '#f29b9b',
    soft: 'rgba(242, 155, 155, 0.16)',
    badge: 'border-[#f29b9b]/35 bg-[#f29b9b]/15 text-[#ffd9d9]',
    icon: 'bg-admin-light text-admin-dark',
    iconPath: icons.admin,
    role: 'Administrator',
    headline: 'One secure workspace for relief operations.',
    blurb: 'Confirm donations, register households, record distributions, and print official reports — all in one place.',
    points: ['Duplicate-aid checks before release', 'Household registry and inventory', 'Official RIS and report printing'],
  },
  beneficiary: {
    panel: 'from-[#0f3a6b] via-[#0b2545] to-[#081a31]',
    accent: '#7db8ef',
    soft: 'rgba(125, 184, 239, 0.16)',
    badge: 'border-[#7db8ef]/35 bg-[#7db8ef]/15 text-[#d8ebff]',
    icon: 'bg-beneficiary-light text-beneficiary-dark',
    iconPath: icons.beneficiary,
    role: 'Beneficiary portal',
    headline: "Your family's aid, in one place.",
    blurb: 'See every relief item your household has received and keep your contact details up to date.',
    points: ['View your complete aid history', 'Confirm receipts with an e-signature', 'Update your contact information'],
  },
}

export default function AuthLayout({ role = 'donor', title, subtitle, children }) {
  const t = THEMES[role] || THEMES.donor

  return (
    <div className="relative min-h-screen overflow-hidden bg-cream">
      {/* Soft page background so the card never floats on a flat color */}
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 15% 10%, ${t.soft}, transparent 45%), radial-gradient(circle at 90% 90%, rgba(11,37,69,0.08), transparent 40%)` }} />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── Brand panel ── */}
        <aside className={`relative overflow-hidden bg-gradient-to-br ${t.panel} px-5 pb-16 pt-6 text-white sm:px-8 sm:pb-20 sm:pt-8 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:pb-12 lg:pt-12`}>
          <div className="auth-blob pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full" style={{ background: t.soft }} />
          <div className="auth-blob auth-blob-delay pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute right-10 top-1/3 h-1.5 w-1.5 rounded-full bg-white/50 shadow-[0_0_18px_5px_rgba(255,255,255,0.35)]" />
          <div className="pointer-events-none absolute right-24 top-1/4 h-1 w-1 rounded-full bg-white/40" />

          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <Link to="/" className="flex min-w-0 items-center gap-3">
                <img src={bantayayudaSeal} alt="BantayAyuda seal" className="h-11 w-11 shrink-0 sm:h-14 sm:w-14" />
                <div className="min-w-0">
                  <div className="text-base font-bold leading-tight tracking-tight sm:text-lg">BantayAyuda</div>
                  <div className="text-[11px] text-white/60">Manolo Fortich, Bukidnon</div>
                </div>
              </Link>
              <Link to="/" className="hidden items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white sm:inline-flex">
                Back to home
                <Icon path={icons.arrow} className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-8 lg:mt-14">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${t.badge}`}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.accent }} />
                {t.role}
              </span>
              <h1 className="mt-4 max-w-md text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
                {t.headline}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{t.blurb}</p>

              <ul className="mt-6 hidden space-y-3 lg:block">
                {t.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-xs font-semibold text-white/80">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: t.soft }}>
                      <Icon path={icons.check} className="h-3.5 w-3.5" style={{ color: t.accent }} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="relative mt-8 hidden items-center gap-2 text-[11px] text-white/50 lg:flex">
            <Icon path={icons.lock} className="h-3.5 w-3.5" />
            Secure access · Municipal Social Welfare and Development Office
          </div>
        </aside>

        {/* ── Form panel ── */}
        <main className="relative flex items-start justify-center px-4 pb-10 sm:px-6 lg:items-center lg:px-10 lg:py-12">
          <div className="-mt-10 w-full max-w-md lg:mt-0">
            <div
              className="relative overflow-hidden rounded-2xl border border-white/70 bg-white p-5 shadow-[0_18px_50px_rgba(11,37,69,0.16)] sm:p-7"
              style={{ borderTop: `4px solid ${t.accent}` }}
            >
              <div className="mb-5 flex items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.icon}`}>
                  <Icon path={t.iconPath} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold leading-tight text-ink">{title}</h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-faint">{subtitle}</p>
                </div>
              </div>

              {children}
            </div>

            <p className="mt-4 text-center text-[11px] text-faint">
              BantayAyuda · Relief goods and distribution tracking for Manolo Fortich
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
