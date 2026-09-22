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

// Small lat/lng offset so a donor pin sits diagonally above-right of the
// recipient pin in the same barangay, instead of overlapping it.
const DONOR_OFFSET_LAT = 0.006
const DONOR_OFFSET_LNG = 0.009

// Icons are wrapped in a larger invisible box so the tappable area is
// bigger than the visible dot — much easier to hit on a phone screen.
function makeCircleIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 40px; height: 40px; display:flex; align-items:center; justify-content:center;
    ">
      <div style="
        width: 22px; height: 22px; border-radius: 50%;
        background:${color}; border:3px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      "></div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function makeDiamondIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 40px; height: 40px; display:flex; align-items:center; justify-content:center;
    ">
      <div style="
        width: 17px; height: 17px; background:${color};
        border:3px solid white; transform: rotate(45deg);
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      "></div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

const DONOR_COLOR = '#2563A8'

export default function BarangayMap({ height = '320px' }) {
  const [statsByBarangay, setStatsByBarangay] = useState({})
  const [donorStatsByBarangay, setDonorStatsByBarangay] = useState({})
  const [loading, setLoading] = useState(true)
  const [showDonors, setShowDonors] = useState(true)
  const [showRecipients, setShowRecipients] = useState(true)

  useEffect(() => {
    async function load() {
      const [donationsRes, beneficiariesRes, distributionsRes] = await Promise.all([
        supabase.from('donations').select('barangay, status, donor_name, item, quantity, unit, created_at'),
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

      const donorStats = {}
      function ensureDonor(key) {
        if (!donorStats[key]) {
          donorStats[key] = { donationCount: 0, confirmedCount: 0, donorNames: new Set(), entries: [] }
        }
        return donorStats[key]
      }

      ;(donationsRes.data || []).forEach((d) => {
        const key = (d.barangay || 'Unspecified').trim().toLowerCase()

        const s = ensure(key)
        s.donationCount += 1
        if (d.status === 'confirmed') s.confirmedCount += 1

        // Donations are logged by the donor's own barangay — this is the
        // "where aid came from" side of the map.
        const ds = ensureDonor(key)
        ds.donationCount += 1
        if (d.status === 'confirmed') ds.confirmedCount += 1
        if (d.donor_name) ds.donorNames.add(d.donor_name)
        ds.entries.push({
          donorName: d.donor_name || 'Anonymous',
          item: d.item || '—',
          quantity: d.quantity,
          unit: d.unit,
          createdAt: d.created_at,
        })
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
      setDonorStatsByBarangay(donorStats)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs font-semibold text-muted">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showDonors} onChange={(e) => setShowDonors(e.target.checked)} />
          <span className="inline-block h-2.5 w-2.5" style={{ background: DONOR_COLOR, transform: 'rotate(45deg)' }} />
          Donor locations
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showRecipients} onChange={(e) => setShowRecipients(e.target.checked)} />
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#4A7A2E' }} />
          Recipient / aid progress
        </label>
      </div>

      <div style={{ height, width: '100%' }} className="overflow-hidden rounded-lg border border-line">
        <MapContainer
          center={[8.3697, 124.8644]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          tap={true}
          tapTolerance={30}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {showRecipients && BARANGAY_POSITIONS.map((b) => {
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

            return (
              <Marker key={`recipient-${b.name}`} position={[b.lat, b.lng]} icon={makeCircleIcon(color)}>
                <Popup>
                  <div style={{ fontSize: '12px', minWidth: '190px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Brgy. {b.name} — Recipients</div>
                    {loading && <div>Loading…</div>}
                    {!loading && (
                      <>
                        <div>Registered households: <b>{households}</b></div>
                        <div>Households given aid: <b>{householdsServed}</b> {households > 0 ? `/ ${households}` : ''}</div>
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

          {showDonors && BARANGAY_POSITIONS.map((b) => {
            const ds = donorStatsByBarangay[b.name.toLowerCase()]
            if (!ds || ds.donationCount === 0) return null

            return (
              <Marker
                key={`donor-${b.name}`}
                position={[b.lat + DONOR_OFFSET_LAT, b.lng + DONOR_OFFSET_LNG]}
                icon={makeDiamondIcon(DONOR_COLOR)}
              >
                <Popup>
                  <div style={{ fontSize: '12px', minWidth: '210px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Brgy. {b.name} — Donors</div>
                    {loading && <div>Loading…</div>}
                    {!loading && (
                      <>
                        <div>Donations from this barangay: <b>{ds.donationCount}</b> ({ds.confirmedCount} confirmed)</div>
                        <div style={{ marginBottom: '6px' }}>Unique donors: <b>{ds.donorNames.size}</b></div>
                        <div style={{ maxHeight: '160px', overflowY: 'auto', borderTop: '1px solid #e5e5e0', paddingTop: '4px' }}>
                          {[...ds.entries]
                            .sort((a, c) => new Date(c.createdAt || 0) - new Date(a.createdAt || 0))
                            .map((entry, i) => (
                              <div key={i} style={{ marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px dashed #e5e5e0' }}>
                                <div style={{ fontWeight: 'bold' }}>{entry.donorName}</div>
                                <div>
                                  {entry.item}{entry.quantity ? ` — ${entry.quantity}${entry.unit ? ` ${entry.unit}` : ''}` : ''}
                                </div>
                                <div style={{ color: '#8A8A82' }}>
                                  {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Date not recorded'}
                                </div>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}