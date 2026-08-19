import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabase.js'

// Approximate positions relative to Manolo Fortich poblacion (8.3697, 124.8644).
// These are estimates for map placement — replace with surveyed GPS points
// per barangay if you have them later.
const BARANGAY_POSITIONS = [
  { name: 'Alae', lat: 8.3450, lng: 124.8500 },
  { name: 'Damilag', lat: 8.3616, lng: 124.8088 },
  { name: 'Dahilayan', lat: 8.2600, lng: 124.7900 },
  { name: 'Dicklum', lat: 8.3800, lng: 124.8500 },
  { name: 'Guilang-guilang', lat: 8.3900, lng: 124.8900 },
  { name: 'Kalugmanan', lat: 8.4100, lng: 124.8700 },
  { name: 'Lindaban', lat: 8.4200, lng: 124.9000 },
  { name: 'Lingion', lat: 8.4300, lng: 124.8600 },
  { name: 'Lunocan', lat: 8.3300, lng: 124.8700 },
  { name: 'Maluko', lat: 8.4400, lng: 124.9200 },
  { name: 'Mambatangan', lat: 8.3200, lng: 124.8300 },
  { name: 'Mampayag', lat: 8.3100, lng: 124.8600 },
  { name: 'Minsuro', lat: 8.3000, lng: 124.8400 },
  { name: 'San Miguel', lat: 8.3850, lng: 124.8300 },
  { name: 'Sankanan', lat: 8.3300, lng: 124.8000 },
  { name: 'Santiago', lat: 8.2900, lng: 124.8100 },
  { name: 'Sinaad', lat: 8.4000, lng: 124.8100 },
  { name: 'Tankulan', lat: 8.3697, lng: 124.8644 },
  { name: 'Ticala', lat: 8.3200, lng: 124.8900 },
  { name: 'Agusan Canyon', lat: 8.3050, lng: 124.8250 },
  { name: 'Sampiano', lat: 8.3550, lng: 124.8950 },
  { name: 'San Vicente', lat: 8.4150, lng: 124.9350 },
]

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 22px; height: 22px; border-radius: 50%;
      background:${color}; border:3px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export default function BarangayMap({ height = '320px' }) {
  const [statsByBarangay, setStatsByBarangay] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: donations } = await supabase.from('donations').select('barangay, status')
      const { data: beneficiaries } = await supabase.from('beneficiaries').select('barangay, household_size')

      const stats = {}
      ;(donations || []).forEach((d) => {
        const key = d.barangay || 'Unspecified'
        if (!stats[key]) stats[key] = { donationCount: 0, confirmedCount: 0, households: 0, members: 0 }
        stats[key].donationCount += 1
        if (d.status === 'confirmed') stats[key].confirmedCount += 1
      })
      ;(beneficiaries || []).forEach((b) => {
        const key = b.barangay || 'Unspecified'
        if (!stats[key]) stats[key] = { donationCount: 0, confirmedCount: 0, households: 0, members: 0 }
        stats[key].households += 1
        stats[key].members += Number(b.household_size) || 0
      })

      setStatsByBarangay(stats)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ height, width: '100%' }} className="overflow-hidden rounded-lg border border-line">
      <MapContainer
        center={[8.3697, 124.8644]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {BARANGAY_POSITIONS.map((b) => {
          const s = statsByBarangay[b.name]
          const hasDonations = s && s.donationCount > 0
          const icon = makeIcon(hasDonations ? '#639922' : '#888780')

          return (
            <Marker key={b.name} position={[b.lat, b.lng]} icon={icon}>
              <Popup>
                <div style={{ fontSize: '12px', minWidth: '160px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Brgy. {b.name}</div>
                  {loading && <div>Loading…</div>}
                  {!loading && (
                    <>
                      <div>Donations received: <b>{s?.donationCount || 0}</b> ({s?.confirmedCount || 0} confirmed)</div>
                      <div>Registered households: <b>{s?.households || 0}</b></div>
                      <div>Estimated members: <b>{s?.members || 0}</b></div>
                      {!hasDonations && (
                        <div style={{ marginTop: '4px', color: '#A32D2D' }}>No donations recorded yet</div>
                      )}
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}