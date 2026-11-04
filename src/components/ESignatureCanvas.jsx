import { useEffect, useRef, useState } from 'react'

/*
  Signature pad. The line is drawn exactly under the pointer:
  - the canvas bitmap is sized to its on-screen size (× devicePixelRatio), so there is no CSS-vs-bitmap scale mismatch
  - pointer coordinates are converted with getBoundingClientRect(), so page scroll and layout offsets don't matter
  - pointer events cover mouse, finger and pen; touch-action:none stops the page from scrolling while signing

  Props: onSave(dataUrl | null)   called with a PNG data URL on "Save", and with null when cleared or redrawn
         height (optional, px)    default 220
*/
export default function ESignatureCanvas({ onSave, height = 220 }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const hasInkRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [saved, setSaved] = useState(false)

  function paintWhite(c) {
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
  }

  // Keep the bitmap the same size as what's shown on screen
  useEffect(() => {
    const wrap = wrapRef.current
    function fit() {
      const c = canvasRef.current
      if (!c || !wrap) return
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(200, Math.floor(wrap.clientWidth))
      const newW = Math.round(w * dpr)
      const newH = Math.round(height * dpr)
      if (c.width === newW && c.height === newH) return
      const snapshot = hasInkRef.current ? c.toDataURL() : null
      c.width = newW
      c.height = newH
      paintWhite(c)
      if (snapshot) {
        const img = new Image()
        img.onload = () => c.getContext('2d').drawImage(img, 0, 0, newW, newH)
        img.src = snapshot
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [height])

  function point(e) {
    const c = canvasRef.current
    const r = c.getBoundingClientRect()
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    }
  }

  function brush(ctx) {
    const dpr = window.devicePixelRatio || 1
    ctx.strokeStyle = '#111111'
    ctx.fillStyle = '#111111'
    ctx.lineWidth = 2.8 * dpr
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function handleDown(e) {
    e.preventDefault()
    const c = canvasRef.current
    c.setPointerCapture?.(e.pointerId)
    if (saved) {
      setSaved(false)
      onSave?.(null) // drawing again invalidates the earlier saved signature
    }
    drawing.current = true
    const p = point(e)
    last.current = p
    const ctx = c.getContext('2d')
    brush(ctx)
    ctx.beginPath()
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    hasInkRef.current = true
    setHasInk(true)
  }

  function handleMove(e) {
    if (!drawing.current) return
    e.preventDefault()
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    brush(ctx)
    const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent]
    for (const ev of events) {
      const p = point(ev)
      ctx.beginPath()
      ctx.moveTo(last.current.x, last.current.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      last.current = p
    }
  }

  function handleUp(e) {
    if (!drawing.current) return
    drawing.current = false
    canvasRef.current.releasePointerCapture?.(e.pointerId)
  }

  function clear() {
    const c = canvasRef.current
    paintWhite(c)
    hasInkRef.current = false
    setHasInk(false)
    setSaved(false)
    onSave?.(null)
  }

  function save() {
    if (!hasInk) return
    onSave?.(canvasRef.current.toDataURL('image/png'))
    setSaved(true)
  }

  return (
    <div>
      <div ref={wrapRef} className="relative overflow-hidden rounded-lg border-2 border-dashed border-line bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          className="block w-full cursor-crosshair"
          style={{ height, touchAction: 'none' }}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-faint">
            Sign here (mouse or finger)
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-line" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:bg-line-soft"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasInk}
          className="rounded-lg bg-admin px-4 py-1.5 text-xs font-bold text-white hover:bg-admin-dark disabled:opacity-40"
        >
          {saved ? 'Saved ✓' : 'Save signature'}
        </button>
        {hasInk && !saved && (
          <span className="text-[11px] text-faint">Press “Save signature” when done.</span>
        )}
      </div>
    </div>
  )
}