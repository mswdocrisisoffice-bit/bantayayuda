// src/components/PinGate.jsx
// Local PIN lock for this device. Put <PinGate /> once in AdminLayout.
// Protects the app screen only — it does not replace the real login.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { getLocalUser } from '../lib/offlineQueue.js'

const IDLE_LOCK_MS = 5 * 60 * 1000
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))

async function hashPin(pin, saltB64) {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256))
}

const storeKey = (uid) => `ba_pin_${uid}`
const readPin = (uid) => { try { return JSON.parse(localStorage.getItem(storeKey(uid)) || 'null') } catch { return null } }

export default function PinGate() {
  const [uid, setUid] = useState(null)
  const [hasPin, setHasPin] = useState(false)
  const [locked, setLocked] = useState(false)
  const [panel, setPanel] = useState(null) // null | 'set'
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [msg, setMsg] = useState('')
  const [fails, setFails] = useState(0)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    getLocalUser().then((u) => {
      if (!u) return
      setUid(u.id)
      const has = !!readPin(u.id)
      setHasPin(has)
      // a fresh app start needs the PIN again
      if (has && sessionStorage.getItem('ba_unlocked') !== u.id) setLocked(true)
    })
  }, [])

  // lock again after the app has been in the background a while
  useEffect(() => {
    if (!hasPin) return
    let hiddenAt = 0
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > IDLE_LOCK_MS) lockNow()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [hasPin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const lockNow = useCallback(() => {
    sessionStorage.removeItem('ba_unlocked')
    setPin(''); setMsg(''); setLocked(true)
  }, [])

  async function unlock(e) {
    e?.preventDefault()
    if (wait > 0) return
    const saved = readPin(uid)
    if (!saved) { setLocked(false); return }
    if ((await hashPin(pin, saved.salt)) === saved.hash) {
      sessionStorage.setItem('ba_unlocked', uid)
      setLocked(false); setPin(''); setMsg(''); setFails(0)
    } else {
      const n = fails + 1
      setFails(n); setPin('')
      setMsg('Wrong PIN.')
      if (n >= 5) { setWait(30); setFails(0) }
    }
  }

  async function savePin(e) {
    e.preventDefault()
    if (!/^\d{4,6}$/.test(pin)) return setMsg('PIN must be 4–6 digits.')
    if (pin !== pin2) return setMsg('The two PINs do not match.')
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)))
    localStorage.setItem(storeKey(uid), JSON.stringify({ salt, hash: await hashPin(pin, salt) }))
    sessionStorage.setItem('ba_unlocked', uid)
    setHasPin(true); setPanel(null); setPin(''); setPin2(''); setMsg('')
  }

  function removePin() {
    localStorage.removeItem(storeKey(uid))
    sessionStorage.removeItem('ba_unlocked')
    setHasPin(false); setPanel(null)
  }

  async function forgot() {
    // needs internet: signs out, the user logs in again with email + password
    localStorage.removeItem(storeKey(uid))
    sessionStorage.removeItem('ba_unlocked')
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!uid) return null

  const input = 'w-full rounded-lg border-2 border-line px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-admin'

  return (
    <>
      {/* small floating buttons */}
      <div className="no-print fixed bottom-4 right-4 z-40 flex gap-2">
        {hasPin && (
          <button onClick={lockNow} className="rounded-full border-2 border-line bg-white px-3 py-2 text-xs font-bold text-ink shadow-md hover:border-admin">
            🔒 Lock
          </button>
        )}
        <button
          onClick={() => { setPanel(panel ? null : 'set'); setPin(''); setPin2(''); setMsg('') }}
          className="rounded-full border-2 border-line bg-white px-3 py-2 text-xs font-bold text-ink shadow-md hover:border-admin"
        >
          {hasPin ? 'Change PIN' : 'Set PIN'}
        </button>
      </div>

      {panel === 'set' && !locked && (
        <div className="no-print fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={savePin} className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-sm font-bold text-ink">{hasPin ? 'Change PIN' : 'Set a PIN for this device'}</h2>
            <p className="mb-3 mt-1 text-[11px] text-faint">4–6 digits. Used to open the app on this device, even without internet.</p>
            <input inputMode="numeric" type="password" maxLength={6} placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={input} />
            <input inputMode="numeric" type="password" maxLength={6} placeholder="Repeat PIN" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} className={`${input} mt-2`} />
            {msg && <p className="mt-2 text-xs font-semibold text-admin">{msg}</p>}
            <div className="mt-4 flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-admin py-2.5 text-xs font-bold text-white">Save PIN</button>
              <button type="button" onClick={() => setPanel(null)} className="flex-1 rounded-lg border-2 border-line py-2.5 text-xs font-bold text-ink">Cancel</button>
            </div>
            {hasPin && (
              <button type="button" onClick={removePin} className="mt-3 w-full text-[11px] font-semibold text-muted underline">
                Remove PIN
              </button>
            )}
          </form>
        </div>
      )}

      {locked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-cream p-4">
          <form onSubmit={unlock} className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="text-3xl">🔒</div>
            <h2 className="mt-2 text-sm font-bold text-ink">BantayAyuda is locked</h2>
            <p className="mb-4 text-[11px] text-faint">Enter your PIN to continue.</p>
            <input autoFocus inputMode="numeric" type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={input} />
            {msg && <p className="mt-2 text-xs font-semibold text-admin">{wait > 0 ? `Too many tries. Wait ${wait}s.` : msg}</p>}
            <button type="submit" disabled={wait > 0 || pin.length < 4} className="mt-4 w-full rounded-lg bg-admin py-2.5 text-xs font-bold text-white disabled:opacity-40">
              Unlock
            </button>
            <button type="button" onClick={forgot} className="mt-3 text-[11px] font-semibold text-muted underline">
              Forgot PIN — sign in again (needs internet)
            </button>
          </form>
        </div>
      )}
    </>
  )
}