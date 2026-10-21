// src/lib/offlineQueue.js
// Saves distributions / donations on this device when there is no signal,
// then uploads them automatically once the connection is back.
import { supabase } from './supabase.js'

const DB_NAME = 'bantayayuda-offline'
const STORE = 'queue'
const CHANGED = 'offline-queue-changed'

/* ── tiny IndexedDB wrapper (no extra package needed) ── */
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'qid' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); resolve(req?.result) }
    t.onerror = () => { db.close(); reject(t.error) }
    t.onabort = () => { db.close(); reject(t.error) }
  })
}

const notify = () => window.dispatchEvent(new Event(CHANGED))

export const onQueueChanged = (fn) => {
  window.addEventListener(CHANGED, fn)
  return () => window.removeEventListener(CHANGED, fn)
}

export async function listQueue() {
  const all = (await run('readonly', (s) => s.getAll())) || []
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

async function put(item) { await run('readwrite', (s) => s.put(item)); notify() }
async function remove(qid) { await run('readwrite', (s) => s.delete(qid)); notify() }

export async function clearQueue() { await run('readwrite', (s) => s.clear()); notify() }

/* ── helpers ── */
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export function isNetworkError(err) {
  if (!err) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = String(err.message || err.error || err).toLowerCase()
  return err.status === 0 || /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout/.test(msg)
}

/** Works offline: reads the saved login session from this device (no server call). */
export async function getLocalUser() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.user ?? null
}

/* ── low-level senders (idempotent: safe to retry) ── */
async function insertWithId(table, id, row) {
  let { error } = await supabase.from(table).insert({ id, ...row })
  if (error && ['22P02', '428C9', '42703'].includes(error.code)) {
    // this table's id column isn't a client-supplied uuid — insert without it
    ;({ error } = await supabase.from(table).insert(row))
  }
  if (error?.code === '23505') return { ok: true } // already uploaded earlier
  return error ? { error, networkError: isNetworkError(error) } : { ok: true }
}

async function sendDistribution(item) {
  const { signatureBlob, fileName, row, rowId } = item
  if (signatureBlob && !item.signatureDone) {
    const { error } = await supabase.storage
      .from('signatures')
      .upload(fileName, signatureBlob, { contentType: 'image/png' })
    if (error && !/already exists|duplicate/i.test(error.message || '')) {
      return { error, networkError: isNetworkError(error) }
    }
    item.signatureDone = true
  }
  return insertWithId('distributions', rowId, row)
}

async function sendDonation(item) {
  const row = { ...item.row }
  if (!row.donor_id && item.donorEmail) {
    const { data } = await supabase.from('profiles').select('id').eq('email', item.donorEmail).maybeSingle()
    row.donor_id = data?.id ?? null
  }
  return insertWithId('donations', item.rowId, row)
}

async function sendAccount(body) {
  const { data, error } = await supabase.functions.invoke('create-beneficiary-account', { body })
  if (error) return { error, networkError: isNetworkError(error) }
  if (data?.error) return { error: new Error(data.error), networkError: false }
  return { ok: true }
}

/* ── public: save now if online, otherwise queue ── */
async function queueItem(item) {
  await put({ qid: newId(), createdAt: Date.now(), attempts: 0, ...item })
  return { queued: true }
}

/** args: { row, signatureBlob, fileName, account }  → { ok } | { queued } | { error } */
export async function submitDistribution({ row, signatureBlob, fileName, account }) {
  const item = { type: 'distribution', row, rowId: newId(), signatureBlob, fileName, account: account || null }
  if (navigator.onLine) {
    const r = await sendDistribution(item)
    if (r.ok) return { ok: true }
    if (!r.networkError) return { error: r.error }
  }
  return queueItem(item)
}

/** args: { row, donorEmail } */
export async function submitDonation({ row, donorEmail }) {
  const item = { type: 'donation', row, rowId: newId(), donorEmail: donorEmail || '' }
  if (navigator.onLine) {
    const r = await sendDonation(item)
    if (r.ok) return { ok: true }
    if (!r.networkError) return { error: r.error }
  }
  return queueItem(item)
}

/* ── upload everything waiting ── */
let flushing = false

export async function flushQueue() {
  if (flushing || !navigator.onLine) return { synced: 0 }
  flushing = true
  let synced = 0
  try {
    // need a valid session; if the token can't refresh yet, try again later
    const user = await getLocalUser()
    if (!user) return { synced: 0 }

    for (const item of await listQueue()) {
      let result
      if (!item.distDone) {
        result = item.type === 'distribution' ? await sendDistribution(item) : await sendDonation(item)
        if (!result.ok) {
          if (result.networkError) break // signal dropped again — stop, retry later
          await put({ ...item, attempts: item.attempts + 1, lastError: result.error?.message || 'Could not save' })
          continue
        }
        item.distDone = true
      }
      if (item.type === 'distribution' && item.account && !item.accountDone) {
        const a = await sendAccount(item.account)
        if (!a.ok) {
          if (a.networkError) { await put(item); break }
          await put({ ...item, attempts: item.attempts + 1, lastError: `Account: ${a.error?.message}` })
          continue
        }
      }
      await remove(item.qid)
      synced += 1
    }
  } finally {
    flushing = false
  }
  return { synced }
}

/* ── lists kept on this device so dropdowns / suggestions still work offline ── */
const CACHE_PREFIX = 'ba_cache_'

/** run() returns a supabase query. Online: fetch + remember the result. Offline/failed: use the last saved copy. */
export async function cachedFetch(key, run) {
  try {
    const res = await run()
    if (!res.error && res.data) {
      try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(res.data)) } catch { /* storage full */ }
      return res
    }
    const saved = localStorage.getItem(CACHE_PREFIX + key)
    return saved ? { data: JSON.parse(saved), error: null, fromCache: true } : res
  } catch (err) {
    try {
      const saved = localStorage.getItem(CACHE_PREFIX + key)
      if (saved) return { data: JSON.parse(saved), error: null, fromCache: true }
    } catch { /* ignore */ }
    return { data: null, error: err }
  }
}

/** Call on sign-out so the next person on a shared device doesn't see saved lists. */
export function clearCachedLists() {
  Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX)).forEach((k) => localStorage.removeItem(k))
}