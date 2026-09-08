import { Outlet } from 'react-router-dom'
import { AdminTabs } from './AdminDashboard.jsx'
import manoloBg from '../../assets/manolo-fortich-bg.jpg'

export default function AdminLayout() {
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

      <div className="mx-auto max-w-5xl px-4 py-8">
        <AdminTabs />
        <Outlet />
      </div>
    </div>
  )
}