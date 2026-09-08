import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabase.js'

// Official coordinates for all 22 barangays of Manolo Fortich, Bukidnon
// Source: PhilAtlas / PSA barangay profiles
export const BARANGAY_POSITIONS = [
  { name: 'Agusan Canyon', lat: 8.3263, lng: 124.8086 },
  { name: 'Alae', lat: 8.4178, lng: 124.8089 },
  { name: 'Dahilayan', lat: 8.2215, lng: 124.8490 },
  { name: 'Dalirig', lat: 8.3763, lng: 124.9004 },
  { name: 'Damilag', lat: 8.3503, lng: 124.8121 },
  { name: 'Diclum', lat: 8.3740, lng: 124.8480 },
  { name: 'Guilang-guilang', lat: 8.4589, lng: 125.0407 },
  { name: 'Kalugmanan', lat: 8.2780, lng: 124.8601 },
  { name: 'Lindaban', lat: 8.2910, lng: 124.8455 },
  { name: 'Lingion', lat: 8.4040, lng: 124.8871 },
  { name: 'Lunocan', lat: 8.4143, lng: 124.8231 },
  { name: 'Maluko', lat: 8.3732, lng: 124.9538 },
  { name: 'Mambatangan', lat: 8.4762, lng: 124.8056 },
  { name: 'Mampayag', lat: 8.2644, lng: 124.8285 },
  { name: 'Mantibugao', lat: 8.4595, lng: 124.8219 },
  { name: 'Minsuro', lat: 8.5112, lng: 124.8295 },
  { name: 'San Miguel', lat: 8.3890, lng: 124.8332 },
  { name: 'Sankanan', lat: 8.3160, lng: 124.8579 },
  { name: 'Santiago', lat: 8.4386, lng: 124.9934 },
  { name: 'Santo Niño', lat: 8.4311, lng: 124.8615 },
  { name: 'Tankulan', lat: 8.3688, lng: 124.8641 },
  { name: 'Ticala', lat: 8.3412, lng: 124.8911 },
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
      const [donationsRes, beneficiariesRes, distributionsRes] = await Promise.all([
        supabase.from('donations').select('barangay, status'),
        supabase.from('beneficiaries').select('barangay, household_size'),
        supabase.from('distributions').select('barangay, household_head, serial_number'),
      ])

      const stats = {}
      function ensure(key) {
        if (!stats[key]) {
          stats[key] = {
            donationCount: 0,
            confirmedCount: 0,
            households: 0,
            members: 0,
            distributedCount: 0,
            householdsServedSet: new Set(),
          }
        }
        return stats[key]
      }

      ;(donationsRes.data || []).forEach((d) => {
        const key = (d.barangay || 'Unspecified').trim().toLowerCase()
        const s = ensure(key)
        s.donationCount += 1
        if (d.status === 'confirmed') s.confirmedCount += 1
      })
      ;(beneficiariesRes.data || []).forEach((b) => {
        const key = (b.barangay || 'Unspecified').trim().toLowerCase()
        const s = ensure(key)
        s.households += 1
        s.members += Number(b.household_size) || 0
      })
      ;(distributionsRes.data || []).forEach((d) => {
        const key = (d.barangay || 'Unspecified').trim().toLowerCase()
        const s = ensure(key)
        s.distributedCount += 1
        const id = d.serial_number || d.household_head
        if (id) s.householdsServedSet.add(id)
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
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {BARANGAY_POSITIONS.map((b) => {
          const s = statsByBarangay[b.name.toLowerCase()]
          const householdsServed = s?.householdsServedSet?.size || 0
          const households = s?.households || 0
          const hasDonations = s && s.donationCount > 0
          const fullyServed = households > 0 && householdsServed >= households
          const partiallyServed = householdsServed > 0 && !fullyServed

          let color = '#888780' // gray — no activity yet
          if (fullyServed) color = '#4A7A2E' // dark green — fully served
          else if (partiallyServed) color = '#E8A33D' // amber — partially served
          else if (hasDonations) color = '#639922' // light green — has donations, no distribution yet

          const icon = makeIcon(color)

          return (
            <Marker key={b.name} position={[b.lat, b.lng]} icon={icon}>
              <Popup>
                <div style={{ fontSize: '12px', minWidth: '190px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Brgy. {b.name}</div>
                  {loading && <div>Loading…</div>}
                  {!loading && (
                    <>
                      <div>Registered households: <b>{households}</b></div>
                      <div>Households given aid: <b>{householdsServed}</b> {households > 0 ? `/ ${households}` : ''}</div>
                      <div>Donations received: <b>{s?.donationCount || 0}</b> ({s?.confirmedCount || 0} confirmed)</div>
                      <div>Distribution records: <b>{s?.distributedCount || 0}</b></div>
                      {households === 0 && (
                        <div style={{ marginTop: '4px', color: '#A32D2D' }}>No households registered yet</div>
                      )}
                      {households > 0 && householdsServed === 0 && (
                        <div style={{ marginTop: '4px', color: '#A32D2D' }}>Registered but not yet given aid</div>
                      )}
                      {fullyServed && (
                        <div style={{ marginTop: '4px', color: '#4A7A2E', fontWeight: 'bold' }}>All registered households served ✓</div>
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