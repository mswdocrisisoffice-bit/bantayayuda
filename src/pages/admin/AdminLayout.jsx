import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AdminTabs, icons as adminIcons } from './AdminDashboard.jsx'
import manoloBg from '../../assets/manolo-fortich-bg.jpg'
import OfflineStatus from '../../components/OfflineStatus.jsx'
import PinGate from '../../components/PinGate.jsx'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}

/* The five destinations staff reach most often on a phone.
   Everything else stays one tap away behind Menu. */
const MOBILE_NAV = [
  { label: 'Overview', to: '/admin/dashboard', icon: 'overview' },
  { label: 'Distribute', to: '/admin/distribution', icon: 'distribution' },
  { label: 'Registry', to: '/admin/beneficiaries', icon: 'beneficiaries' },
  { label: 'Reports', to: '/admin/reports', icon: 'reports' },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="relative min-h-screen">
      <div
        className="no-print fixed inset-0 -z-10 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${manoloBg})`,
          backgroundSize: 'cover',
          imageRendering: 'high-quality',
        }}
      />
      <div
        className="no-print fixed inset-0 -z-10"
        style={{ backgroundColor: 'rgba(198, 198, 189, 0.77)' }}
      />

      <OfflineStatus />
      <PinGate />

      <div className="flex min-h-screen">
        <AdminTabs
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* No top bar on phones — the bottom navigation is the only menu there. */}
          <div className="mx-auto w-full max-w-5xl flex-1 px-3 pb-28 pt-4 sm:px-4 sm:py-8">
            <Outlet />
          </div>
        </div>
      </div>

      {/* ── Phone bottom navigation ── */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div
          className="mx-auto flex max-w-lg items-stretch"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {MOBILE_NAV.map((item) => {
            const active = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold transition-colors ${
                  active ? 'text-admin-dark' : 'text-faint'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    active ? 'bg-admin-light' : ''
                  }`}
                >
                  <Icon path={adminIcons[item.icon]} className="h-5 w-5" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-bold text-faint"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl">
              <Icon
                path={<><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>}
                className="h-5 w-5"
              />
            </span>
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  )
}