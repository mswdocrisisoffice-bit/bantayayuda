import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BARANGAY_POSITIONS } from './BarangayMap.jsx'
import ManoloFortichBoundary from './ManoloFortichBoundary.jsx'
import { MANOLO_FORTICH_BOUNDS_ARRAY } from '../../lib/manoloFortich.js'

const DONATION_COLOR = '#639922'

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 44px; height: 44px; display:flex; align-items:center; justify-content:center;
    ">
      <div style="
        width: 24px; height: 24px; border-radius: 50%;
        background:${color}; border:3px solid white;
        box-shadow: 0 1px 5px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.08);
      "></div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -16],
  })
}

function findPosition(barangayName) {
  if (!barangayName) return null
  const norm = barangayName.trim().toLowerCase()
  return BARANGAY_POSITIONS.find((b) => b.name.toLowerCase() === norm) || null
}

export default function MyDonationsMap({ donations, height = '320px' }) {
  const grouped = useMemo(() => {
    const map = {}
    donations.forEach((d) => {
      const pos = findPosition(d.barangay)
      if (!pos) return
      if (!map[pos.name]) map[pos.name] = { pos, items: [] }
      map[pos.name].items.push(d)
    })
    return Object.values(map)
  }, [donations])

  if (grouped.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-lg border border-dashed border-line-soft bg-cream text-center">
        <p className="max-w-xs px-4 text-sm text-faint">
          Once an admin records your donation with a barangay, it will show up here so you can see exactly where it went.
        </p>
      </div>
    )
  }

  return (
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
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ManoloFortichBoundary />

        {grouped.map(({ pos, items }) => (
          <Marker key={pos.name} position={[pos.lat, pos.lng]} icon={makeIcon(DONATION_COLOR)} title={`Brgy. ${pos.name}`}>
            <Popup>
              <div style={{ fontSize: '12px', minWidth: '190px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Brgy. {pos.name}</div>
                <div style={{ marginBottom: '4px', color: '#63625C' }}>
                  {items.length} of your donation{items.length > 1 ? 's' : ''} went here
                </div>
                {items.map((d) => (
                  <div key={d.id} style={{ borderTop: '1px solid #EDECE8', paddingTop: '4px', marginTop: '4px' }}>
                    <div><b>{d.item}</b> {d.quantity ? `— ${d.quantity} ${d.unit || ''}` : ''}</div>
                    <div style={{ color: '#63625C' }}>{new Date(d.created_at).toLocaleDateString()} · {d.status}</div>
                  </div>
                ))}
              </div>
            </Popup>

            <Tooltip permanent direction="top" offset={[0, -12]} opacity={1} className="map-barangay-label">
              {pos.name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute right-2 top-2 z-[500] rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-ink shadow-sm ring-1 ring-black/5">
        Manolo Fortich only
      </div>
    </div>
  )
}
