import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminTabs } from './AdminDashboard.jsx'
import manoloBg from '../../assets/manolo-fortich-bg.jpg'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 -z-10 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${manoloBg})`,
          backgroundSize: 'cover',
          imageRendering: 'high-quality',
        }}
      />
      <div
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: 'rgba(198, 198, 189, 0.77)' }}
      />

      <div className="flex min-h-screen">
        <AdminTabs
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="text-ink">
              <Icon
                path={<><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
                className="h-5 w-5"
              />
            </button>
            <span className="text-sm font-bold text-admin-dark">BantayAyuda Admin</span>
          </div>

          <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}