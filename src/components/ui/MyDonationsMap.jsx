import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BARANGAY_POSITIONS } from './BarangayMap.jsx'

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 26px; height: 26px; border-radius: 50%;
      background:${color}; border:3px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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

  const center = grouped[0].pos

  return (
    <div style={{ height, width: '100%' }} className="overflow-hidden rounded-lg border border-line">
      <MapContainer center={[center.lat, center.lng]} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {grouped.map(({ pos, items }) => (
          <Marker key={pos.name} position={[pos.lat, pos.lng]} icon={makeIcon('#639922')}>
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
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}