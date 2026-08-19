import { useRef, useState } from 'react'

export default function ESignatureCanvas({ onSave, width = 320, height = 140 }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  function getPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    }
  }

  function start(e) {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e) {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#173404'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    setHasDrawn(true)
  }

  function end() {
    drawing.current = false
  }

  function clear() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    setHasDrawn(false)
  }

  function confirm() {
    if (!hasDrawn) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave?.(dataUrl)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full touch-none rounded-lg border border-line bg-white"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-muted"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!hasDrawn}
          className="flex-1 rounded-lg bg-donor px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          Confirm signature
        </button>
      </div>
    </div>
  )
}
