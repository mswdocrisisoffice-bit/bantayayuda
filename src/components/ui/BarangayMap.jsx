import { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabase.js'
import ManoloFortichBoundary from './ManoloFortichBoundary.jsx'
import { MANOLO_FORTICH_BOUNDS_ARRAY } from '../../lib/manoloFortich.js'

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

const DONOR_COLOR = '#2563A8'

const STATUS_COLORS = {
  none: '#888780',
  hasDonations: '#639922',
  partial: '#E8A33D',
  full: '#4A7A2E',
}

const iconCache = new Map()

// Icons are wrapped in a larger invisible box so the tappable area is
// bigger than the visible dot — much easier to hit on a phone screen.
function makeCircleIcon(color, { muted = false } = {}) {
  const key = `circle:${color}:${muted}`
  if (iconCache.has(key)) return iconCache.get(key)

  const size = muted ? 12 : 20
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width: 44px; height: 44px; display:flex; align-items:center; justify-content:center;
    ">
      <div style="
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background:${color}; border:3px solid white;
        box-shadow: 0 1px 5px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.08);
      "></div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -15],
  })
  iconCache.set(key, icon)
  return icon
}

// The donor diamond is painted in the top-right of the same 44px box as the
// recipient dot. Both markers therefore share one coordinate, so a donation is
// never shown floating over a neighbouring barangay when you zoom in.
function makeDonorIcon() {
  if (iconCache.has('donor')) return iconCache.get('donor')

  const icon = L.divIcon({
    className: 'map-donor-pin',
    html: `<div style="width:44px;height:44px;position:relative;">
      <div style="
        position:absolute; left:25px; top:3px; width:15px; height:15px;
        background:${DONOR_COLOR}; border:3px solid white; transform: rotate(45deg);
        box-shadow: 0 1px 5px rgba(15,23,42,0.35); pointer-events:auto;
      "></div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [12, -12],
  })
  iconCache.set('donor', icon)
  return icon
}

// Keeps track of the current zoom level so labels can be revealed as the user
// zooms in. At the fitted view (zoom 10) the 22 barangays sit too close together
// for every name to be readable, so only barangays with activity are labelled.
function ZoomTracker({ onZoom }) {
  const map = useMapEvents({
    zoomend() {
      onZoom(map.getZoom())
    },
  })

  useEffect(() => {
    onZoom(map.getZoom())
  }, [map, onZoom])

  return null
}

function StatusDot({ color, shape = 'circle' }) {
  return (
    <span
      className={shape === 'diamond' ? 'inline-block h-2.5 w-2.5 rotate-45' : 'inline-block h-2.5 w-2.5 rounded-full'}
      style={{ background: color }}
    />
  )
}

export default function BarangayMap({ height = '320px' }) {
  const [statsByBarangay, setStatsByBarangay] = useState({})
  const [donorStatsByBarangay, setDonorStatsByBarangay] = useState({})
  const [loading, setLoading] = useState(true)
  const [showDonors, setShowDonors] = useState(true)
  const [showRecipients, setShowRecipients] = useState(true)
  const [showNames, setShowNames] = useState(true)
  const [zoom, setZoom] = useState(0)

  const handleZoom = useCallback((nextZoom) => setZoom(nextZoom), [])

  useEffect(() => {
    async function load() {
      const [donationsRes, beneficiariesRes, distributionsRes] = await Promise.all([
        supabase.from('donations').select('barangay, status, donor_name, item, quantity, unit, created_at').neq('status', 'archived'),
        supabase.from('beneficiaries').select('barangay, household_size'),
        supabase.from('distributions').select('barangay, household_head, serial_number').is('archived_at', null),
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
    // `isolate` keeps Leaflet's internal z-indexes (panes 400, controls 1000) inside this box,
    // so the map can never paint on top of the PIN lock screen or other overlays.
    <div className="relative z-0 isolate">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-muted">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showDonors} onChange={(e) => setShowDonors(e.target.checked)} />
          <StatusDot color={DONOR_COLOR} shape="diamond" />
          Donor locations
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showRecipients} onChange={(e) => setShowRecipients(e.target.checked)} />
          <StatusDot color={STATUS_COLORS.hasDonations} />
          Recipient / aid progress
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
          Barangay names
        </label>
        {showNames && zoom < 11 && (
          <span className="text-[10px] font-normal text-faint">Zoom in for all names</span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-faint">
        <span className="flex items-center gap-1"><StatusDot color={STATUS_COLORS.none} /> No activity</span>
        <span className="flex items-center gap-1"><StatusDot color={STATUS_COLORS.hasDonations} /> Has donations</span>
        <span className="flex items-center gap-1"><StatusDot color={STATUS_COLORS.partial} /> Partially served</span>
        <span className="flex items-center gap-1"><StatusDot color={STATUS_COLORS.full} /> Fully served</span>
      </div>

      <div style={{ height, width: '100%' }} className="relative overflow-hidden rounded-lg border border-line">
        <MapContainer
          bounds={MANOLO_FORTICH_BOUNDS_ARRAY}
          boundsOptions={{ padding: [12, 12] }}
          maxBounds={MANOLO_FORTICH_BOUNDS_ARRAY}
          maxBoundsViscosity={1.0}
          minZoom={10}
          maxZoom={16}
          style={{ height: '100%', width: '100%', background: '#e6edf5' }}
          scrollWheelZoom={false}
          tap={true}
          tapTolerance={30}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ManoloFortichBoundary />
          <ZoomTracker onZoom={handleZoom} />

          {showRecipients && BARANGAY_POSITIONS.map((b, index) => {
            const s = statsByBarangay[b.name.toLowerCase()]
            const householdsServed = s?.householdsServedSet?.size || 0
            const households = s?.households || 0
            const hasDonations = (s?.donationCount || 0) > 0
            const fullyServed = households > 0 && householdsServed >= households
            const partiallyServed = householdsServed > 0 && !fullyServed

            let color = STATUS_COLORS.none
            if (fullyServed) color = STATUS_COLORS.full
            else if (partiallyServed) color = STATUS_COLORS.partial
            else if (hasDonations) color = STATUS_COLORS.hasDonations

            // Alternate above/below so neighbouring barangay names do not
            // stack on top of each other. At the fitted zoom only barangays
            // with activity are labelled; zooming in reveals the rest. Names
            // can be hidden entirely from the control above the map.
            const labelAbove = index % 2 === 0
            const hasActivity = (s?.donationCount || 0) > 0 || households > 0 || (s?.distributedCount || 0) > 0
            const showLabel = showNames && (hasActivity || zoom >= 11)

            return (
              <Marker
                key={`recipient-${b.name}`}
                position={[b.lat, b.lng]}
                icon={makeCircleIcon(color, { muted: color === STATUS_COLORS.none })}
                title={`Brgy. ${b.name}`}
              >
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

                {showLabel && (
                  <Tooltip
                    permanent
                    direction={labelAbove ? 'top' : 'bottom'}
                    offset={[0, labelAbove ? -10 : 10]}
                    opacity={1}
                    className="map-barangay-label"
                  >
                    {b.name}
                  </Tooltip>
                )}
              </Marker>
            )
          })}

          {showDonors && BARANGAY_POSITIONS.map((b) => {
            const ds = donorStatsByBarangay[b.name.toLowerCase()]
            if (!ds || ds.donationCount === 0) return null

            return (
              <Marker
                key={`donor-${b.name}`}
                position={[b.lat, b.lng]}
                icon={makeDonorIcon()}
                title={`Donors — Brgy. ${b.name}`}
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

                <Tooltip direction="right" offset={[14, -10]} className="map-barangay-label map-barangay-label-donor">
                  Donors · {b.name}
                </Tooltip>
              </Marker>
            )
          })}
        </MapContainer>

        <div className="pointer-events-none absolute right-2 top-2 z-[500] rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-ink shadow-sm ring-1 ring-black/5">
          Manolo Fortich only
        </div>
      </div>
    </div>
  )
}
