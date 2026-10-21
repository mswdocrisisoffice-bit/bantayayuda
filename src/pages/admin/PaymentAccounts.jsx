import { useCallback, useEffect, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import { supabase } from '../../lib/supabase.js'
import { cachedFetch } from '../../lib/offlineQueue.js'

const BUCKET = 'payment-qr'

export const PROVIDERS = ['GCash', 'Maya', 'Bank transfer', 'Other']

const PROVIDER_STYLE = {
  GCash: { bg: '#E6F1FF', accent: '#007DFE' },
  Maya: { bg: '#E7F8EF', accent: '#00A862' },
  'Bank transfer': { bg: '#EEF1F4', accent: '#334155' },
  Other: { bg: '#FFF4E5', accent: '#D97706' },
}
const styleFor = (p) => PROVIDER_STYLE[p] || PROVIDER_STYLE.Other

const publicUrl = (path) =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : ''

/* Active accounts, kept on the device so they still show without signal */
function usePaymentAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data } = await cachedFetch('payment_accounts', () =>
      supabase.from('payment_accounts').select('*').order('created_at', { ascending: true })
    )
    setAccounts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])
  return { accounts, loading, reload }
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* ignore */ }
      }}
      className="rounded-md border-2 border-line bg-white px-2 py-0.5 text-[10px] font-bold text-ink hover:border-admin"
    >
      {done ? 'Copied ✓' : 'Copy'}
    </button>
  )
}

/* ── Shown inside the donation form when the donation is cash ── */
export function CashPaymentPanel() {
  const { accounts, loading } = usePaymentAccounts()
  const [zoom, setZoom] = useState(null)
  const active = accounts.filter((a) => a.is_active)

  return (
    <div className="sm:col-span-2 rounded-2xl border-2 border-admin/30 bg-admin-light/40 p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-admin text-lg text-white">₱</span>
        <div>
          <div className="text-sm font-bold text-ink">Cash donation — where to send it online</div>
          <p className="text-[11px] text-muted">
            Show this to the donor if they are sending through GCash, Maya or a bank. Tap a QR to enlarge it.
          </p>
        </div>
      </div>

      {loading && <p className="text-xs text-faint">Loading payment accounts…</p>}
      {!loading && active.length === 0 && (
        <p className="rounded-lg bg-white p-3 text-xs text-muted">
          No payment accounts yet. Add GCash / bank details in <b>Online payment accounts</b> at the bottom of this page.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {active.map((a) => {
          const st = styleFor(a.provider)
          const url = publicUrl(a.qr_path)
          return (
            <div key={a.id} className="flex gap-3 rounded-xl border border-line-soft bg-white p-3 shadow-sm">
              {url ? (
                <button type="button" onClick={() => setZoom(a)} className="shrink-0 rounded-lg border-2 border-line p-1 hover:border-admin">
                  <img src={url} alt={`${a.provider} QR`} className="h-24 w-24 object-contain" />
                </button>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-line-soft text-[10px] font-semibold text-faint">
                  No QR
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: st.bg, color: st.accent }}>
                  {a.provider}
                </span>
                <div className="mt-1 truncate text-sm font-bold text-ink">{a.account_name}</div>
                {a.account_number && (
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">{a.account_number}</span>
                    <CopyButton text={a.account_number} />
                  </div>
                )}
                {a.notes && <p className="mt-1 text-[11px] text-muted">{a.notes}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {zoom && (
        <div
          className="no-print fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoom(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Scan to send · {zoom.provider}</div>
            <img src={publicUrl(zoom.qr_path)} alt="QR" className="mx-auto mt-3 max-h-[60vh] w-full object-contain" />
            <div className="mt-3 text-sm font-bold text-ink">{zoom.account_name}</div>
            {zoom.account_number && <div className="font-mono text-xs text-muted">{zoom.account_number}</div>}
            <button type="button" onClick={() => setZoom(null)} className="mt-4 w-full rounded-lg bg-admin py-2.5 text-xs font-bold text-white">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border-2 border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-admin focus:ring-4 focus:ring-admin/10'
const labelCls = 'mb-1.5 block text-xs font-bold text-ink'

const EMPTY = { provider: 'GCash', account_name: '', account_number: '', notes: '', is_active: true }

/* ── Admin: add / edit / hide / delete the payment accounts ── */
export function PaymentAccountsManager({ onChanged, embedded = false }) {
  const { accounts, loading, reload } = usePaymentAccounts()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startNew() {
    setEditingId('new'); setForm(EMPTY); setFile(null); setPreview(''); setError('')
  }
  function startEdit(a) {
    setEditingId(a.id)
    setForm({
      provider: a.provider, account_name: a.account_name, account_number: a.account_number || '',
      notes: a.notes || '', is_active: a.is_active,
    })
    setFile(null); setPreview(publicUrl(a.qr_path)); setError('')
  }
  function cancel() { setEditingId(null); setFile(null); setPreview(''); setError('') }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return setError('Please choose an image file (PNG or JPG).')
    if (f.size > 3 * 1024 * 1024) return setError('Image is too big — keep it under 3 MB.')
    setError(''); setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function save(e) {
    e.preventDefault()
    if (!form.account_name.trim()) return setError('Account name is required.')
    if (!navigator.onLine) return setError('You are offline — payment accounts can only be saved when online.')
    setSaving(true); setError('')

    const existing = accounts.find((a) => a.id === editingId)
    let qr_path = existing?.qr_path || null
    if (file) {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
      if (upErr) { setSaving(false); return setError(`Could not upload the QR: ${upErr.message}`) }
      if (qr_path) await supabase.storage.from(BUCKET).remove([qr_path])
      qr_path = path
    }

    const row = {
      provider: form.provider,
      account_name: form.account_name.trim(),
      account_number: form.account_number.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      qr_path,
    }
    const { error: dbErr } =
      editingId === 'new'
        ? await supabase.from('payment_accounts').insert(row)
        : await supabase.from('payment_accounts').update(row).eq('id', editingId)

    setSaving(false)
    if (dbErr) return setError(dbErr.message)
    cancel(); await reload(); onChanged?.()
  }

  async function toggleActive(a) {
    await supabase.from('payment_accounts').update({ is_active: !a.is_active }).eq('id', a.id)
    reload(); onChanged?.()
  }

  async function remove(a) {
    if (!window.confirm(`Delete ${a.provider} — ${a.account_name}?`)) return
    if (a.qr_path) await supabase.storage.from(BUCKET).remove([a.qr_path])
    await supabase.from('payment_accounts').delete().eq('id', a.id)
    reload(); onChanged?.()
  }

  const Wrap = embedded ? 'div' : Card
  const wrapProps = embedded ? { className: 'overflow-hidden' } : { className: 'mt-4 overflow-hidden p-0' }
  return (
    <Wrap {...wrapProps}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition hover:bg-line-soft/40"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-admin-light text-lg">📱</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-ink">Online payment accounts</div>
          <div className="text-[11px] text-faint">GCash, Maya or bank details with QR — shown when a cash donation is recorded.</div>
        </div>
        <span className="rounded-full bg-admin-light px-2.5 py-1 text-[11px] font-bold text-admin-dark">
          {accounts.filter((a) => a.is_active).length} active
        </span>
        <span className="text-xs text-faint">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="tab-fade border-t border-line-soft p-6">
          {loading && <p className="text-xs text-faint">Loading…</p>}

          <div className="space-y-2">
            {accounts.map((a) => {
              const st = styleFor(a.provider)
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line-soft bg-white p-3">
                  {a.qr_path ? (
                    <img src={publicUrl(a.qr_path)} alt="" className="h-14 w-14 rounded-lg border border-line object-contain" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-line-soft text-[10px] text-faint">No QR</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: st.bg, color: st.accent }}>{a.provider}</span>
                    <div className="truncate text-sm font-bold text-ink">{a.account_name}</div>
                    <div className="truncate font-mono text-[11px] text-muted">{a.account_number || '—'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleActive(a)}
                    className={`rounded-lg border-2 px-3 py-1.5 text-[11px] font-bold ${
                      a.is_active ? 'border-beneficiary/40 bg-beneficiary-light text-beneficiary-dark' : 'border-line bg-white text-muted'
                    }`}
                  >
                    {a.is_active ? '● Showing' : '○ Hidden'}
                  </button>
                  <button type="button" onClick={() => startEdit(a)} className="rounded-lg border-2 border-line bg-white px-3 py-1.5 text-[11px] font-bold text-ink hover:border-admin">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(a)} className="rounded-lg border-2 border-line bg-white px-3 py-1.5 text-[11px] font-bold text-admin hover:border-admin">
                    Delete
                  </button>
                </div>
              )
            })}
            {!loading && accounts.length === 0 && editingId !== 'new' && (
              <p className="text-xs text-faint">No payment accounts yet.</p>
            )}
          </div>

          {editingId ? (
            <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border-2 border-admin/30 bg-admin-light/30 p-4 sm:grid-cols-2">
              <div className="text-sm font-bold text-ink sm:col-span-2">{editingId === 'new' ? 'Add payment account' : 'Edit payment account'}</div>
              <div>
                <label className={labelCls}>Type</label>
                <select value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} className={inputCls}>
                  {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Account name</label>
                <input required value={form.account_name} onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))} placeholder="e.g. MSWDO Manolo Fortich" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mobile / account number</label>
                <input value={form.account_number} onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))} placeholder="e.g. 0917 123 4567" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notes (optional)</label>
                <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Send screenshot of receipt to the office" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>QR code image</label>
                <div className="flex flex-wrap items-center gap-3">
                  {preview && <img src={preview} alt="QR preview" className="h-24 w-24 rounded-lg border-2 border-line bg-white object-contain" />}
                  <input type="file" accept="image/*" onChange={pickFile} className="text-xs" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted sm:col-span-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Show this account when recording a cash donation
              </label>
              {error && <p className="text-xs font-semibold text-admin sm:col-span-2">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" disabled={saving} className="rounded-lg border-2 border-admin bg-admin px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save account'}
                </button>
                <button type="button" onClick={cancel} className="rounded-lg border-2 border-line bg-white px-4 py-2 text-xs font-bold text-ink">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={startNew} className="mt-4 rounded-lg border-2 border-admin bg-admin px-4 py-2 text-xs font-bold text-white hover:bg-admin-dark">
              + Add payment account
            </button>
          )}
        </div>
      )}
    </Wrap>
  )
}