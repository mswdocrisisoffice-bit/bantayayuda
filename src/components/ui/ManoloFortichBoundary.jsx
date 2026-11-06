import { Polygon } from 'react-leaflet'
import { MANOLO_FORTICH_BOUNDARY, MANOLO_FORTICH_MASK } from '../../lib/manoloFortich.js'

// Draws the Manolo Fortich municipal boundary on top of the base map and dims
// everything outside it. Using an inverted polygon (world ring + boundary hole)
// means the map can never be mistaken for a location outside the municipality.
export default function ManoloFortichBoundary({ dimOutside = true }) {
  return (
    <>
      {dimOutside && (
        <Polygon
          positions={MANOLO_FORTICH_MASK}
          pathOptions={{
            stroke: false,
            fillColor: '#0f172a',
            fillOpacity: 0.22,
            fillRule: 'evenodd',
            interactive: false,
          }}
        />
      )}
      <Polygon
        positions={MANOLO_FORTICH_BOUNDARY}
        pathOptions={{
          color: '#1d5fa8',
          weight: 2.5,
          opacity: 0.9,
          fill: false,
          dashArray: '7 5',
          interactive: false,
        }}
      />
    </>
  )
}
