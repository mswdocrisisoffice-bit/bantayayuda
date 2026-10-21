// src/components/OfflineStatus.jsx
// Floating status pill: Offline / pending count / Syncing.
import { useCallback, useEffect, useState } from 'react'
import { flushQueue, listQueue, onQueueChanged } from '../lib/offlineQueue.js'

export default function OfflineStatus() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [items, setItems] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(0)

  const refresh = useCallback(async () => {
    try { setItems(await listQueue()) } catch { /* IndexedDB unavailable */ }
  }, [])

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      const { synced } = await flushQueue()
      if (synced) { setJustSynced(synced); setTimeout(() => setJustSynced(0), 4000) }
    } finally {
      setSyncing(false)
      refresh()
    }
  }, [refresh])

  useEffect(() => {
    refresh()
    const up = () => { setOnline(true); sync() }
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    const off = onQueueChanged(refresh)
    if (navigator.onLine) sync()
    const timer = setInterval(() => { if (navigator.onLine) sync() }, 30000)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      off()
      clearInterval(timer)
    }
  }, [refresh, sync])

  const failed = items.filter((i) => i.lastError).length
  if (online && items.length === 0 && !justSynced) return null

  let tone = 'bg-warn-bg text-warn-text border-warn-text/40'
  let text
  if (!online) text = `Offline — entries are saved on this device${items.length ? ` · ${items.length} waiting` : ''}`
  else if (syncing) { tone = 'bg-admin-light text-admin-dark border-admin/40'; text = `Uploading ${items.length} saved entr${items.length === 1 ? 'y' : 'ies'}…` }
  else if (items.length) {
    tone = failed ? 'bg-red-50 text-red-800 border-red-300' : 'bg-warn-bg text-warn-text border-warn-text/40'
    text = failed ? `${failed} entr${failed === 1 ? 'y' : 'ies'} could not upload` : `${items.length} waiting to upload`
  } else { tone = 'bg-beneficiary-light text-beneficiary-dark border-beneficiary/40'; text = `✓ ${justSynced} saved entr${justSynced === 1 ? 'y' : 'ies'} uploaded` }

  return (
    <div className={`no-print fixed bottom-4 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-full border-2 px-4 py-2 text-xs font-bold shadow-lg ${tone}`}>
      <span>{text}</span>
      {online && !syncing && items.length > 0 && (
        <button onClick={sync} className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold hover:bg-white">
          Upload now
        </button>
      )}
      {items.some((i) => i.lastError) && online && (
        <span className="hidden text-[10px] font-semibold sm:inline">{items.find((i) => i.lastError)?.lastError}</span>
      )}
    </div>
  )
}