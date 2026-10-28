import { useEffect, useMemo, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import { supabase } from '../../lib/supabase.js'
import manoloFortichSeal from '../../assets/manolo-fortich-seal.png'
import bagongPilipinasLogo from '../../assets/bagong-pilipinas-logo.png'

const MIN_ROWS = 10 // the printed form always shows at least this many item rows

const todayISO = () => new Date().toISOString().slice(0, 10)
const fmtDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

const STATUS_STYLE = {
  draft: { label: 'Draft', bg: '#EEF1F4', color: '#4A5568' },
  issued: { label: 'Issued', bg: '#E9F6EC', color: '#2F855A' },
  cancelled: { label: 'Cancelled', bg: '#FDECEC', color: '#B03A3A' },
}

const blankLine = () => ({
  key: crypto.randomUUID(),
  inventory_id: '',
  stock_no: '',
  unit: '',
  description: '',
  quantity: '',
  issue_quantity: '',
  remarks: '',
})

const blankForm = () => ({
  id: null,
  ris_no: '',
  ris_date: todayISO(),
  entity_name: 'Municipality of Manolo Fortich',
  fund_cluster: '',
  division: '',
  office: 'Municipal Social Welfare and Development Office',
  responsibility_center_code: '',
  purpose: '',
  requested_by_name: '',
  requested_by_designation: '',
  // Editable defaults: change them if the approving or issuing officer is different
  approved_by_name: 'MARIA CECILIA C. SAJONIA, MSSW',
  approved_by_designation: 'Municipal Social Welfare and Development Officer',
  issued_by_name: '',
  issued_by_designation: '',
  received_by_name: '',
  received_by_designation: '',
  status: 'draft',
  items: [blankLine()],
})

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  plus: <path d="M12 5v14M5 12h14" />,
  print: <><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="9" rx="2" /><path d="M7 14h10v7H7z" /></>,
  back: <path d="M15 6l-6 6 6 6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
}

function StatusPill({ status }) {
  const st = STATUS_STYLE[status] || STATUS_STYLE.draft
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: st.bg, color: st.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
      {st.label}
    </span>
  )
}

/* ───────────────────────── Printable RIS (official layout) ───────────────────────── */
function RisSheet({ ris }) {
  const items = ris.ris_items || []
  const filler = Math.max(0, MIN_ROWS - items.length)
  const cell = 'border border-black px-1.5 py-1 align-top'

  const people = [
    { label: 'Requested by:', name: ris.requested_by_name, des: ris.requested_by_designation },
    { label: 'Approved by:', name: ris.approved_by_name, des: ris.approved_by_designation },
    { label: 'Issued by:', name: ris.issued_by_name, des: ris.issued_by_designation },
    { label: 'Received by:', name: ris.received_by_name, des: ris.received_by_designation },
  ]

  return (
    <div className="ris-print-page mx-auto max-w-[850px] bg-white text-[11px] leading-snug text-black shadow-lg">
      <table className="w-full border-collapse">
        <thead><tr><td><div className="ris-spacer" /></td></tr></thead>
        <tfoot><tr><td><div className="ris-spacer" /></td></tr></tfoot>
        <tbody>
          <tr>
            <td className="ris-body p-8 align-top">
              {/* Letterhead */}
              <div className="mb-3 flex items-center justify-between border-b-2 border-black pb-2">
                <img src={manoloFortichSeal} alt="Manolo Fortich official seal" className="w-14" />
                <div className="flex-1 px-4 text-center">
                  <div className="text-[10px]">Republic of the Philippines</div>
                  <div className="text-[10px]">Province of Bukidnon</div>
                  <div className="text-[12px] font-bold">MUNICIPALITY OF MANOLO FORTICH</div>
                  <div className="text-[12px] font-bold">MUNICIPAL SOCIAL WELFARE AND DEVELOPMENT OFFICE</div>
                </div>
                <img src={bagongPilipinasLogo} alt="Bagong Pilipinas" className="w-14" />
              </div>

              <div className="mb-2 text-center text-[15px] font-bold tracking-wide">REQUISITION AND ISSUE SLIP</div>

              {/* Header fields */}
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={cell} colSpan={3}><b>Entity Name:</b> {ris.entity_name}</td>
                    <td className={cell} colSpan={3}><b>Fund Cluster:</b> {ris.fund_cluster}</td>
                  </tr>
                  <tr>
                    <td className={cell} colSpan={3}><b>Division:</b> {ris.division}</td>
                    <td className={cell} colSpan={3}><b>Responsibility Center Code:</b> {ris.responsibility_center_code}</td>
                  </tr>
                  <tr>
                    <td className={cell} colSpan={3}><b>Office:</b> {ris.office}</td>
                    <td className={cell} colSpan={3}>
                      <b>RIS No.:</b> {ris.ris_no} &nbsp;&nbsp; <b>Date:</b> {fmtDate(ris.ris_date)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Items */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-center font-bold">
                    <td className={cell} colSpan={4}>Requisition</td>
                    <td className={cell} colSpan={2}>Stock Available?</td>
                    <td className={cell} colSpan={2}>Issue</td>
                  </tr>
                  <tr className="text-center font-bold">
                    <td className={`${cell} w-[11%]`}>Stock No.</td>
                    <td className={`${cell} w-[8%]`}>Unit</td>
                    <td className={cell}>Description</td>
                    <td className={`${cell} w-[9%]`}>Quantity</td>
                    <td className={`${cell} w-[6%]`}>Yes</td>
                    <td className={`${cell} w-[6%]`}>No</td>
                    <td className={`${cell} w-[9%]`}>Quantity</td>
                    <td className={`${cell} w-[16%]`}>Remarks</td>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className={`${cell} text-center`}>{it.stock_no}</td>
                      <td className={`${cell} text-center`}>{it.unit}</td>
                      <td className={cell}>{it.description}</td>
                      <td className={`${cell} text-center`}>{it.quantity}</td>
                      <td className={`${cell} text-center`}>{it.stock_available ? '✓' : ''}</td>
                      <td className={`${cell} text-center`}>{it.stock_available === false ? '✓' : ''}</td>
                      <td className={`${cell} text-center`}>{it.issue_quantity}</td>
                      <td className={cell}>{it.remarks}</td>
                    </tr>
                  ))}
                  {Array.from({ length: filler }).map((_, i) => (
                    <tr key={`f${i}`}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className={cell}>&nbsp;</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className={cell} colSpan={8}>
                      <b>Purpose:</b> {ris.purpose}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatories */}
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <td className={`${cell} w-[14%]`}>&nbsp;</td>
                    {people.map((p) => (
                      <td key={p.label} className={`${cell} text-center font-bold`}>{p.label}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${cell} h-14 font-bold`}>Signature:</td>
                    {people.map((p) => <td key={p.label} className={cell}>&nbsp;</td>)}
                  </tr>
                  <tr>
                    <td className={`${cell} font-bold`}>Printed Name:</td>
                    {people.map((p) => (
                      <td key={p.label} className={`${cell} text-center font-bold uppercase`}>{p.name}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className={`${cell} font-bold`}>Designation:</td>
                    {people.map((p) => <td key={p.label} className={`${cell} text-center`}>{p.des}</td>)}
                  </tr>
                  <tr>
                    <td className={`${cell} font-bold`}>Date:</td>
                    {people.map((p) => <td key={p.label} className={cell}>&nbsp;</td>)}
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* ───────────────────────── Page ───────────────────────── */
export default function RisTab() {
  const [view, setView] = useState('list') // 'list' | 'form' | 'print'
  const [list, setList] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(blankForm())
  const [current, setCurrent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  function notify(type, text) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  async function load() {
    setLoading(true)
    const [r, inv] = await Promise.all([
      supabase.from('ris').select('*, ris_items(*)').order('created_at', { ascending: false }),
      supabase.from('inventory').select('id, category, item, unit, quantity_on_hand').order('category').order('item'),
    ])
    if (r.error) notify('err', 'RIS tables not found yet. Run the RIS SQL in Supabase first.')
    setList(
      (r.data || []).map((x) => ({
        ...x,
        ris_items: [...(x.ris_items || [])].sort((a, b) => a.line_no - b.line_no),
      }))
    )
    setInventory(inv.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Print only the RIS sheet: the rest of the admin screen is hidden while printing
  useEffect(() => {
    if (view !== 'print') return undefined
    document.body.classList.add('ris-printing')
    return () => document.body.classList.remove('ris-printing')
  }, [view])

  const invById = useMemo(
    () => Object.fromEntries(inventory.map((i) => [String(i.id), i])),
    [inventory]
  )

  const counts = useMemo(() => {
    const c = { all: list.length, draft: 0, issued: 0, cancelled: 0 }
    list.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [list])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false
      if (!q) return true
      return (
        (r.ris_no || '').toLowerCase().includes(q) ||
        (r.purpose || '').toLowerCase().includes(q) ||
        (r.ris_items || []).some((i) => (i.description || '').toLowerCase().includes(q))
      )
    })
  }, [list, search, filter])

  /* ── form helpers ── */
  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })) }
  function setLine(key, patch) {
    setForm((f) => ({ ...f, items: f.items.map((l) => (l.key === key ? { ...l, ...patch } : l)) }))
  }
  function addLine() { setForm((f) => ({ ...f, items: [...f.items, blankLine()] })) }
  function removeLine(key) {
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((l) => l.key !== key) : f.items }))
  }
  function pickInventory(key, id) {
    const inv = invById[id]
    if (!inv) return setLine(key, { inventory_id: '' })
    setLine(key, {
      inventory_id: String(inv.id),
      description: inv.item || '',
      unit: inv.unit || '',
      stock_no: `S-${String(inv.id).replace(/-/g, '').slice(0, 6).toUpperCase()}`,
    })
  }
  function lineAvailable(l) {
    const inv = invById[l.inventory_id]
    if (!inv) return null // item typed by hand, so stock cannot be checked
    return Number(inv.quantity_on_hand) >= (Number(l.quantity) || 0)
  }

  function newRis() {
    setForm(blankForm())
    setView('form')
  }
  function editRis(r) {
    setForm({
      id: r.id,
      ris_no: r.ris_no,
      ris_date: r.ris_date,
      entity_name: r.entity_name || '',
      fund_cluster: r.fund_cluster || '',
      division: r.division || '',
      office: r.office || '',
      responsibility_center_code: r.responsibility_center_code || '',
      purpose: r.purpose || '',
      requested_by_name: r.requested_by_name || '',
      requested_by_designation: r.requested_by_designation || '',
      approved_by_name: r.approved_by_name || '',
      approved_by_designation: r.approved_by_designation || '',
      issued_by_name: r.issued_by_name || '',
      issued_by_designation: r.issued_by_designation || '',
      received_by_name: r.received_by_name || '',
      received_by_designation: r.received_by_designation || '',
      status: r.status,
      items: (r.ris_items || []).map((i) => ({
        key: i.id,
        inventory_id: i.inventory_id || '',
        stock_no: i.stock_no || '',
        unit: i.unit || '',
        description: i.description || '',
        quantity: i.quantity ?? '',
        issue_quantity: i.issue_quantity ?? '',
        remarks: i.remarks || '',
      })),
    })
    setView('form')
  }
  function openPrint(r) {
    setCurrent(r)
    setView('print')
  }

  async function nextRisNo(dateISO) {
    const year = (dateISO || todayISO()).slice(0, 4)
    const prefix = `RIS-${year}-`
    const { data } = await supabase
      .from('ris')
      .select('ris_no')
      .like('ris_no', `${prefix}%`)
      .order('ris_no', { ascending: false })
      .limit(1)
    const last = data?.[0]?.ris_no ? parseInt(data[0].ris_no.slice(prefix.length), 10) : 0
    return `${prefix}${String((Number.isFinite(last) ? last : 0) + 1).padStart(4, '0')}`
  }

  async function save(asStatus) {
    const lines = form.items.filter((l) => l.description.trim() && Number(l.quantity) > 0)
    if (lines.length === 0) return notify('err', 'Add at least one item with a quantity.')
    if (!form.purpose.trim()) return notify('err', 'Enter the purpose of the requisition.')

    setSaving(true)
    const status = asStatus || form.status
    const header = {
      ris_date: form.ris_date,
      entity_name: form.entity_name.trim(),
      fund_cluster: form.fund_cluster.trim(),
      division: form.division.trim(),
      office: form.office.trim(),
      responsibility_center_code: form.responsibility_center_code.trim(),
      purpose: form.purpose.trim(),
      requested_by_name: form.requested_by_name.trim(),
      requested_by_designation: form.requested_by_designation.trim(),
      approved_by_name: form.approved_by_name.trim(),
      approved_by_designation: form.approved_by_designation.trim(),
      issued_by_name: form.issued_by_name.trim(),
      issued_by_designation: form.issued_by_designation.trim(),
      received_by_name: form.received_by_name.trim(),
      received_by_designation: form.received_by_designation.trim(),
      status,
      ...(status === 'issued' ? { issued_at: new Date().toISOString() } : {}),
    }

    try {
      let risId = form.id
      if (risId) {
        const { error } = await supabase.from('ris').update(header).eq('id', risId)
        if (error) throw error
        await supabase.from('ris_items').delete().eq('ris_id', risId)
      } else {
        let attempts = 0
        // The RIS number is generated here; if two people save at once, try the next number
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const ris_no = await nextRisNo(form.ris_date)
          const { data, error } = await supabase.from('ris').insert({ ...header, ris_no }).select().single()
          if (!error) { risId = data.id; break }
          if (error.code === '23505' && attempts++ < 3) continue
          throw error
        }
      }

      const rows = lines.map((l, i) => {
        const avail = lineAvailable(l)
        const qty = Number(l.quantity)
        return {
          ris_id: risId,
          line_no: i + 1,
          inventory_id: l.inventory_id || null,
          stock_no: l.stock_no.trim(),
          unit: l.unit.trim(),
          description: l.description.trim(),
          quantity: qty,
          stock_available: avail === null ? true : avail,
          issue_quantity: l.issue_quantity === '' ? (avail === false ? 0 : qty) : Number(l.issue_quantity),
          remarks: l.remarks.trim(),
        }
      })
      const { error: itemsErr } = await supabase.from('ris_items').insert(rows)
      if (itemsErr) throw itemsErr

      await load()
      const { data: saved } = await supabase.from('ris').select('*, ris_items(*)').eq('id', risId).single()
      if (saved) {
        saved.ris_items = [...(saved.ris_items || [])].sort((a, b) => a.line_no - b.line_no)
        openPrint(saved)
      } else {
        setView('list')
      }
      notify('ok', status === 'issued' ? 'RIS saved and marked as issued.' : 'RIS saved as draft.')
    } catch (err) {
      notify('err', err?.message || 'Could not save the RIS.')
    }
    setSaving(false)
  }

  async function changeStatus(r, status) {
    const msg = status === 'cancelled' ? 'Cancel this RIS?' : 'Mark this RIS as issued?'
    if (!confirm(msg)) return
    const patch = { status, ...(status === 'issued' ? { issued_at: new Date().toISOString() } : {}) }
    const { error } = await supabase.from('ris').update(patch).eq('id', r.id)
    if (error) return notify('err', 'Could not update the status.')
    await load()
    if (current?.id === r.id) setCurrent({ ...current, ...patch })
  }

  const printStyles = `
    .ris-spacer { height: 0; }
    @media print {
      @page { size: A4; margin: 0; }
      html, body, #root { height: auto !important; overflow: visible !important; background: #fff !important; }
      body.ris-printing * { visibility: hidden !important; }
      body.ris-printing .ris-print-page, body.ris-printing .ris-print-page * { visibility: visible !important; }
      body.ris-printing .ris-print-page {
        position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: none !important;
        margin: 0 !important; box-shadow: none !important;
      }
      .ris-spacer { height: 10mm; }
      .ris-body { padding: 0 12mm !important; }
      .no-print { display: none !important; }
      .ris-print-page tr, .ris-print-page img { break-inside: avoid; page-break-inside: avoid; }
    }
  `

  /* ───────── PRINT VIEW ───────── */
  if (view === 'print' && current) {
    return (
      <>
        <style>{printStyles}</style>
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card bg-white/90 px-5 py-3 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('list')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink transition hover:border-admin hover:bg-admin-light"
            >
              <Icon path={icons.back} /> Back to list
            </button>
            <div>
              <div className="text-sm font-bold text-ink">{current.ris_no}</div>
              <StatusPill status={current.status} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {current.status === 'draft' && (
              <>
                <button onClick={() => editRis(current)} className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink hover:border-admin">
                  Edit
                </button>
                <button onClick={() => changeStatus(current, 'issued')} className="rounded-lg bg-[#2f855a] px-3 py-2 text-xs font-bold text-white hover:bg-[#276f4c]">
                  Mark as issued
                </button>
              </>
            )}
            {current.status !== 'cancelled' && (
              <button onClick={() => changeStatus(current, 'cancelled')} className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-muted hover:text-admin">
                Cancel RIS
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-admin px-4 py-2 text-xs font-bold text-white shadow transition hover:-translate-y-0.5 hover:bg-admin-dark"
            >
              <Icon path={icons.print} /> Print / Save as PDF
            </button>
          </div>
        </div>
        {toast && (
          <div className={`no-print mb-3 rounded-lg px-4 py-3 text-sm font-semibold ${toast.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {toast.text}
          </div>
        )}
        <RisSheet ris={current} />
      </>
    )
  }

  /* ───────── FORM VIEW ───────── */
  if (view === 'form') {
    const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-faint'
    return (
      <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-card bg-white/90 px-5 py-4 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
          <div>
            <h1 className="text-lg font-bold leading-tight text-admin-dark">{form.id ? 'Edit RIS' : 'New RIS'}</h1>
            <p className="text-xs text-faint">
              {form.id ? form.ris_no : 'The RIS number is generated when you save.'}
            </p>
          </div>
          <button
            onClick={() => setView('list')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink transition hover:border-admin hover:bg-admin-light"
          >
            <Icon path={icons.back} /> Back to list
          </button>
        </div>

        {toast && (
          <div className={`mb-3 rounded-lg px-4 py-3 text-sm font-semibold ${toast.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {toast.text}
          </div>
        )}

        <Card className="mb-3 p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className={label}>Entity name</span>
              <input className="input-base" value={form.entity_name} onChange={(e) => setField('entity_name', e.target.value)} /></label>
            <label className="block"><span className={label}>Fund cluster</span>
              <input className="input-base" value={form.fund_cluster} onChange={(e) => setField('fund_cluster', e.target.value)} /></label>
            <label className="block"><span className={label}>Division</span>
              <input className="input-base" value={form.division} onChange={(e) => setField('division', e.target.value)} /></label>
            <label className="block"><span className={label}>Responsibility center code</span>
              <input className="input-base" value={form.responsibility_center_code} onChange={(e) => setField('responsibility_center_code', e.target.value)} /></label>
            <label className="block"><span className={label}>Office</span>
              <input className="input-base" value={form.office} onChange={(e) => setField('office', e.target.value)} /></label>
            <label className="block"><span className={label}>Date</span>
              <input type="date" className="input-base" value={form.ris_date} onChange={(e) => setField('ris_date', e.target.value)} /></label>
            <label className="block sm:col-span-2"><span className={label}>Purpose</span>
              <textarea rows={2} className="input-base" placeholder="e.g. Relief assistance for families affected by the landslide in Brgy. San Miguel"
                value={form.purpose} onChange={(e) => setField('purpose', e.target.value)} /></label>
          </div>
        </Card>

        <Card className="mb-3 p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Items requested</h2>
            <button onClick={addLine} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-bold text-ink transition hover:border-admin hover:bg-admin-light">
              <Icon path={icons.plus} className="h-3.5 w-3.5" /> Add item
            </button>
          </div>

          <div className="space-y-3">
            {form.items.map((l, idx) => {
              const avail = lineAvailable(l)
              const inv = invById[l.inventory_id]
              return (
                <div key={l.key} className="rounded-xl border border-line-soft bg-black/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted">Item {idx + 1}</span>
                    {form.items.length > 1 && (
                      <button onClick={() => removeLine(l.key)} className="text-[11px] font-semibold text-faint transition hover:text-admin">
                        Remove ✕
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-12">
                    <label className="block sm:col-span-6"><span className={label}>From inventory</span>
                      <select className="input-base" value={l.inventory_id} onChange={(e) => pickInventory(l.key, e.target.value)}>
                        <option value="">Pick an item (or type below)</option>
                        {inventory.map((i) => (
                          <option key={i.id} value={String(i.id)}>
                            {i.category ? `${i.category} — ` : ''}{i.item} ({i.quantity_on_hand} {i.unit})
                          </option>
                        ))}
                      </select></label>
                    <label className="block sm:col-span-6"><span className={label}>Description</span>
                      <input className="input-base" value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} /></label>

                    <label className="block sm:col-span-2"><span className={label}>Stock no.</span>
                      <input className="input-base" value={l.stock_no} onChange={(e) => setLine(l.key, { stock_no: e.target.value })} /></label>
                    <label className="block sm:col-span-2"><span className={label}>Unit</span>
                      <input className="input-base" value={l.unit} onChange={(e) => setLine(l.key, { unit: e.target.value })} /></label>
                    <label className="block sm:col-span-2"><span className={label}>Quantity</span>
                      <input type="number" min="0" step="any" className="input-base" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} /></label>
                    <div className="sm:col-span-2">
                      <span className={label}>Stock available?</span>
                      <div className="flex h-[38px] items-center">
                        {avail === null ? (
                          <span className="text-[11px] text-faint">Not checked</span>
                        ) : avail ? (
                          <span className="rounded-full bg-[#E9F6EC] px-2.5 py-1 text-[11px] font-bold text-[#2F855A]">Yes · {inv.quantity_on_hand} left</span>
                        ) : (
                          <span className="rounded-full bg-[#FDECEC] px-2.5 py-1 text-[11px] font-bold text-[#B03A3A]">No · only {inv.quantity_on_hand}</span>
                        )}
                      </div>
                    </div>
                    <label className="block sm:col-span-2"><span className={label}>Issue quantity</span>
                      <input type="number" min="0" step="any" className="input-base" placeholder="auto" value={l.issue_quantity} onChange={(e) => setLine(l.key, { issue_quantity: e.target.value })} /></label>
                    <label className="block sm:col-span-2"><span className={label}>Remarks</span>
                      <input className="input-base" value={l.remarks} onChange={(e) => setLine(l.key, { remarks: e.target.value })} /></label>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="mb-3 p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Signatories</h2>
          <p className="mb-3 text-[11px] text-faint">The signature and date lines stay blank on the printed form so they can be signed by hand.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['requested_by', 'Requested by'],
              ['approved_by', 'Approved by'],
              ['issued_by', 'Issued by'],
              ['received_by', 'Received by'],
            ].map(([k, title]) => (
              <div key={k} className="rounded-xl border border-line-soft p-3">
                <div className="mb-2 text-[11px] font-bold text-muted">{title}</div>
                <label className="mb-2 block"><span className={label}>Printed name</span>
                  <input className="input-base" value={form[`${k}_name`]} onChange={(e) => setField(`${k}_name`, e.target.value)} /></label>
                <label className="block"><span className={label}>Designation</span>
                  <input className="input-base" value={form[`${k}_designation`]} onChange={(e) => setField(`${k}_designation`, e.target.value)} /></label>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setView('list')} className="rounded-lg px-4 py-2.5 text-xs font-bold text-faint transition hover:text-ink">
            Cancel
          </button>
          <button
            onClick={() => save(form.id ? undefined : 'draft')}
            disabled={saving}
            className="rounded-lg border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink transition hover:border-admin hover:bg-admin-light disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & preview'}
          </button>
          {form.status !== 'issued' && (
            <button
              onClick={() => save('issued')}
              disabled={saving}
              className="rounded-lg bg-admin px-4 py-2.5 text-xs font-bold text-white shadow transition hover:-translate-y-0.5 hover:bg-admin-dark disabled:opacity-60"
            >
              Save & mark as issued
            </button>
          )}
        </div>
      </>
    )
  }

  /* ───────── LIST VIEW ───────── */
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-card bg-white/90 px-5 py-4 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-admin-light text-admin-dark">
            <Icon path={icons.doc} className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight text-admin-dark">Requisition and Issue Slip (RIS)</h1>
            <p className="text-xs text-faint">Record items taken out of stock, then print the official RIS form.</p>
          </div>
        </div>
        <button
          onClick={newRis}
          className="inline-flex items-center gap-2 rounded-xl bg-admin px-4 py-2.5 text-xs font-bold text-white shadow transition duration-200 hover:-translate-y-0.5 hover:bg-admin-dark hover:shadow-md"
        >
          <Icon path={icons.plus} /> New RIS
        </button>
      </div>

      {toast && (
        <div className={`mb-3 rounded-lg px-4 py-3 text-sm font-semibold ${toast.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {toast.text}
        </div>
      )}

      <Card className="mb-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
              <Icon path={icons.search} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search RIS no., purpose, or item"
              className="input-base pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              ['all', 'All'],
              ['draft', 'Draft'],
              ['issued', 'Issued'],
              ['cancelled', 'Cancelled'],
            ].map(([k, lab]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition ${
                  filter === k
                    ? 'border-admin bg-admin text-white shadow-sm'
                    : 'border-line bg-white text-ink hover:border-admin hover:bg-admin-light'
                }`}
              >
                {lab} · {counts[k] || 0}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading && <p className="text-xs text-faint">Loading…</p>}
      {!loading && visible.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-faint">
            <Icon path={icons.doc} className="h-6 w-6" />
          </span>
          <p className="text-sm font-bold text-ink">{list.length === 0 ? 'No RIS yet' : 'No RIS match your filters'}</p>
          <p className="text-xs text-faint">
            {list.length === 0 ? 'Tap “New RIS” to make the first one.' : 'Try a different search or status.'}
          </p>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((r) => {
          const count = (r.ris_items || []).length
          return (
            <div
              key={r.id}
              className="rounded-card bg-white p-4 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink">{r.ris_no}</div>
                  <div className="text-[11px] text-faint">{fmtDate(r.ris_date)}</div>
                </div>
                <StatusPill status={r.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted">{r.purpose || '—'}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(r.ris_items || []).slice(0, 3).map((i) => (
                  <span key={i.id} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {i.description} · {i.issue_quantity} {i.unit}
                  </span>
                ))}
                {count > 3 && <span className="text-[10px] text-faint">+{count - 3} more</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                <button onClick={() => openPrint(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-admin px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-admin-dark">
                  <Icon path={icons.print} className="h-3.5 w-3.5" /> View / Print
                </button>
                {r.status === 'draft' && (
                  <>
                    <button onClick={() => editRis(r)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-bold text-ink transition hover:border-admin">
                      Edit
                    </button>
                    <button onClick={() => changeStatus(r, 'issued')} className="rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-bold text-[#2f855a] transition hover:border-[#2f855a]">
                      Mark issued
                    </button>
                  </>
                )}
                {r.status !== 'cancelled' && (
                  <button onClick={() => changeStatus(r, 'cancelled')} className="ml-auto text-[11px] font-semibold text-faint transition hover:text-admin">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}