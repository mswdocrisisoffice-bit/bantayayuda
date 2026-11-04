import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import LandingPage from './pages/LandingPage.jsx'

import DonorLogin from './pages/donor/DonorLogin.jsx'
import DonorDashboard from './pages/donor/DonorDashboard.jsx'
import DistributionStatus from './pages/donor/DistributionStatus.jsx'

import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import DonationsTab from './pages/admin/DonationsTab.jsx'
import BeneficiaryRegistryTab from './pages/admin/BeneficiaryRegistryTab.jsx'
import RecordDistributionTab from './pages/admin/RecordDistributionTab.jsx'
import InventoryTab from './pages/admin/InventoryTab.jsx'
import ReportsTab from './pages/admin/ReportsTab.jsx'
import RisTab from './pages/admin/RisTab.jsx'
import ReportGenerator from './pages/admin/ReportGenerator.jsx'
import ArchiveTab from './pages/admin/ArchiveTab.jsx'

import BeneficiaryLogin from './pages/beneficiary/BeneficiaryLogin.jsx'
import BeneficiaryDashboard from './pages/beneficiary/BeneficiaryDashboard.jsx'
import AidHistory from './pages/beneficiary/AidHistory.jsx'

/* A phone keeps the old scroll position when only the route changes.
   Start every page at the top so a new screen never opens halfway down. */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Donor */}
        <Route path="/donor/login" element={<DonorLogin />} />
        <Route path="/donor/dashboard" element={<DonorDashboard />} />
        <Route path="/donor/status" element={<DistributionStatus />} />

        {/* Administrator login stays outside the layout (no tabs/background needed there) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Administrator — all pages inside share the background photo + tab bar */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/donations" element={<DonationsTab />} />
          <Route path="/admin/beneficiaries" element={<BeneficiaryRegistryTab />} />
          <Route path="/admin/distribution" element={<RecordDistributionTab />} />
          <Route path="/admin/inventory" element={<InventoryTab />} />
          <Route path="/admin/reports" element={<ReportsTab />} />
          <Route path="/admin/ris" element={<RisTab />} />
          <Route path="/admin/report-generator" element={<ReportGenerator />} />
          <Route path="/admin/archive" element={<ArchiveTab />} />
        </Route>

        {/* Beneficiary: login only. Accounts are created by staff in Record distribution */}
        <Route path="/beneficiary/login" element={<BeneficiaryLogin />} />
        <Route path="/beneficiary/dashboard" element={<BeneficiaryDashboard />} />
        <Route path="/beneficiary/history" element={<AidHistory />} />
      </Routes>
    </>
  )
}