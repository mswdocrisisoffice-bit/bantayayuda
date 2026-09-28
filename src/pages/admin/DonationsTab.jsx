import { useEffect, useMemo, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { supabase } from '../../lib/supabase.js'
import { BARANGAY_POSITIONS } from '../../components/ui/BarangayMap.jsx'

/* ── Full donation category → item list ── */
export const CATEGORIES = {
  'Medical & Health Supplies': [
    'Bandages', 'Gauze', 'Medical tape', 'Antiseptic wipes', 'Tweezers', 'Scissors',
    'Pain relievers (ibuprofen/acetaminophen)', 'Antacids', 'Cold medicine', 'Rehydration salts',
    'Crutches', 'Wheelchairs', 'Splints', 'Blood pressure monitors',
    'Face masks', 'Medical gloves', 'Hand sanitizer',
  ],
  'Food & Nutrition': [
    'Canned vegetables', 'Canned fruits', 'Canned soups', 'Canned beans', 'Canned tuna', 'Canned chicken',
    'Rice', 'Pasta', 'Oats', 'Lentils', 'Dried beans', 'Flour',
    'Infant formula', 'Baby food jars', 'Baby cereals',
    'Granola bars', 'Nuts', 'Dried fruit', 'Peanut butter', 'Crackers',
    'Bottled water', 'Shelf-stable milk', 'Powdered milk',
  ],
  'Hygiene & Personal Care': [
    'Bar soap', 'Body wash', 'Shampoo', 'Conditioner', 'Deodorant',
    'Toothbrushes', 'Toothpaste', 'Dental floss',
    'Toilet paper', 'Wet wipes', 'Tissues', 'Trash bags',
    'Pads', 'Tampons', 'Menstrual cups',
    'Diapers', 'Baby wipes', 'Diaper rash cream',
  ],
  'Clothing & Linens': [
    'Shirts', 'Pants', 'Jackets', 'Coats', 'Socks', 'Underwear (new)',
    'Sneakers', 'Boots', 'Sandals',
    'Blankets', 'Sleeping bags', 'Sheets', 'Pillows',
    'Towels', 'Washcloths',
    'Raincoats', 'Umbrellas', 'Hats', 'Gloves', 'Scarves',
  ],
  'Shelter & Survival Gear': [
    'Tents', 'Tarps', 'Ropes', 'Ground mats',
    'Flashlights', 'Headlamps', 'Batteries', 'Multi-tools', 'Duct tape',
    'Portable stoves', 'Fuel canisters', 'Pots', 'Pans', 'Disposable utensils',
    'Hand warmers', 'Emergency space blankets',
  ],
  'Education & Child Development': [
    'Notebooks', 'Paper', 'Pencils', 'Pens', 'Crayons', 'Markers',
    'Backpacks', 'Calculators', 'Rulers', 'Scissors',
    'Stuffed animals', 'Small toys', 'Board games', 'Coloring books',
  ],
}

export const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'sacks', 'boxes', 'packs', 'bottles', 'cans', 'sets', 'pairs', 'rolls']

export const DONOR_TYPES = [
  { value: 'non-government', label: 'Non-government / Private' },
  { value: 'government', label: 'Government' },
]

const DONOR_TYPE_HINTS = {
  government: 'From a government agency or LGU office (e.g. DSWD, barangay, municipal office).',
  'non-government': 'From a private individual, company, church, or civic organization.',
}

const OTHER = 'Other (specify)'

/* ── Unit that usually goes with an item (pants → pcs, rice → kg, canned goods → cans …).
   First matching rule wins; otherwise fall back on the category. ── */
const UNIT_RULES = [
  [/^canned |infant formula/, 'cans'],
  [/bottled water|hand sanitizer|shampoo|conditioner|body wash|peanut butter|cooking oil|soy sauce|vinegar/, 'bottles'],
  [/socks|sneakers|boots|sandals|shoes|slippers|crutches|^gloves/, 'pairs'],
  [/toilet paper|medical tape|duct tape|ropes|gauze/, 'rolls'],
  [/face masks|medical gloves|pain relievers|antacids|cold medicine|tampons|baby cereals|granola|crayons|markers|pencils|pens|shelf-stable milk/, 'boxes'],
  [/wipes|tissues|trash bags|pads|diapers|paper|batteries|crackers|powdered milk|rehydration|utensils|hand warmers|noodles/, 'packs'],
  [/\b(rice|pasta|oats|lentils|dried beans|flour|nuts|dried fruit|sugar|salt)\b/, 'kg'],
]

export function suggestUnit(category, item, customItem = '') {
  const name = String((item === OTHER ? customItem : item) || '').trim().toLowerCase()
  if (name) {
    for (const [pattern, unit] of UNIT_RULES) {
      if (pattern.test(name)) return unit
    }
  }
  return category === 'Food & Nutrition' ? 'kg' : 'pcs'
}

function donorDisplayName(d) {
  return d.full_name || (d.email ? d.email.split('@')[0] : 'Unnamed donor')
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/* One color family per category (same palette as the Reports tab) */
const CATEGORY_COLORS = {
  'Food & Nutrition':              { bg: '#FFF4E5', accent: '#D97706' },
  'Hygiene & Personal Care':       { bg: '#E8F3FD', accent: '#2563A8' },
  'Medical & Health Supplies':     { bg: '#FDECEC', accent: '#C0392B' },
  'Clothing & Linens':             { bg: '#F3ECFB', accent: '#7C3AED' },
  'Shelter & Survival Gear':       { bg: '#E9F6EC', accent: '#2F855A' },
  'Education & Child Development': { bg: '#E6F7F6', accent: '#0F8B8D' },
}
const FALLBACK_COLOR = { bg: '#EEF1F4', accent: '#4A5568' }

/* Date filter for the Manage donations list */
const RANGE_OPTIONS = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'Last 30 days' },
]

function toLocalDate(value) {
  const x = new Date(value)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/* From/To (YYYY-MM-DD) that each quick button stands for */
function rangeDates(key) {
  if (key === 'all') return { from: '', to: '' }
  const daysBack = key === 'today' ? 0 : key === 'week' ? 6 : 29
  const from = new Date()
  from.setDate(from.getDate() - daysBack)
  return { from: toLocalDate(from), to: toLocalDate(new Date()) }
}

export function inDates(iso, from, to) {
  if (!from && !to) return true
  if (!iso) return false
  const day = toLocalDate(iso)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}
export function categoryColor(category) {
  return CATEGORY_COLORS[category] || FALLBACK_COLOR
}

/* ── Text input that suggests registered donors as the admin types (matches name or email) ── */
function DonorSuggestInput({
  label, value, onChange, onPick, donors,
  placeholder, required, type = 'text',
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return []
    return donors
      .filter((d) => {
        const name = (d.full_name || '').toLowerCase()
        const email = (d.email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
      .slice(0, 6)
  }, [donors, value])

  // Hide the list once the typed text is exactly the one donor that matched
  const exactOnly =
    matches.length === 1 &&
    [matches[0].full_name, matches[0].email].some(
      (v) => (v || '').toLowerCase() === value.trim().toLowerCase()
    )
  const showList = open && matches.length > 0 && !exactOnly

  function pick(d) {
    onPick(d)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!showList) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(matches[active] || matches[0])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-semibold text-muted">{label}</label>
      <input
        required={required}
        type={type}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
      />

      {showList && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line-soft bg-white shadow-[0_6px_16px_rgba(0,0,0,0.15)]">
          <div className="border-b border-line-soft bg-line-soft/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            Registered donors
          </div>
          {matches.map((d, i) => (
            <button
              key={d.id}
              type="button"
              // mousedown (not click) so the input doesn't blur before we pick
              onMouseDown={(e) => {
                e.preventDefault()
                pick(d)
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                i === active ? 'bg-admin-light' : 'bg-white'
              }`}
            >
              <Avatar name={donorDisplayName(d)} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{donorDisplayName(d)}</div>
                <div className="truncate text-[11px] text-faint">{d.email}</div>
              </div>
              <span className="shrink-0 rounded-full bg-donor-light px-2 py-0.5 text-[10px] font-bold text-donor-dark">
                ✓ Has account
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Barangay input that lists the 22 official barangays and filters as you type ── */
function BarangaySuggestInput({ label, value, onChange, required, size = 'md' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const names = useMemo(
    () => BARANGAY_POSITIONS.map((b) => b.name).sort((a, b) => a.localeCompare(b)),
    []
  )
  const q = value.trim().toLowerCase()
  const matches = useMemo(
    () => names.filter((n) => !q || n.toLowerCase().includes(q)),
    [names, q]
  )
  const isOfficial = names.some((n) => n.toLowerCase() === q)
  const showList = open && matches.length > 0 && !(matches.length === 1 && isOfficial)
  const pad = size === 'sm' ? 'px-3 py-2' : 'px-4 py-3'

  function pick(name) {
    onChange(name)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!showList) {
      if (e.key === 'ArrowDown') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(matches[active] || matches[0])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-semibold text-muted">{label}</label>
      <input
        required={required}
        autoComplete="off"
        placeholder="Tap to choose a barangay, or type to search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-lg border border-line bg-white ${pad} text-sm outline-none focus:border-admin`}
      />

      {showList && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line-soft bg-white shadow-[0_6px_16px_rgba(0,0,0,0.15)]">
          <div className="sticky top-0 border-b border-line-soft bg-line-soft/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            Official barangays · {matches.length}
          </div>
          {matches.map((n, i) => (
            <button
              key={n}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                pick(n)
              }}
              onMouseEnter={() => setActive(i)}
              className={`block w-full px-3 py-2 text-left text-sm text-ink transition ${
                i === active ? 'bg-admin-light' : 'bg-white'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {value.trim() && !isOfficial && !open && (
        <p className="mt-1 text-[11px] font-semibold text-warn-text">
          ⚠ Not in the official list of 22 barangays. Check the spelling, or pick from the list.
        </p>
      )}
    </div>
  )
}

function CategoryItemFields({ category, item, customItem, onCategory, onItem, onCustomItem }) {
  const itemOptions = category ? [...(CATEGORIES[category] || []), OTHER] : []
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted">Category</label>
        <select
          required
          value={category}
          onChange={(e) => onCategory(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
        >
          <option value="" disabled>Select category</option>
          {Object.keys(CATEGORIES).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted">Item</label>
        <select
          required
          value={item}
          disabled={!category}
          onChange={(e) => onItem(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin disabled:bg-line-soft disabled:text-faint"
        >
          <option value="" disabled>{category ? 'Select item' : 'Pick a category first'}</option>
          {itemOptions.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      {item === OTHER && (
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-muted">Specify item name</label>
          <input
            required
            placeholder="Type the item name"
            value={customItem}
            onChange={(e) => onCustomItem(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
          />
        </div>
      )}
    </>
  )
}

function EditDonationRow({ donation, onCancel, onSaved }) {
  const [form, setForm] = useState({
    category: donation.category || '',
    item: CATEGORIES[donation.category]?.includes(donation.item) ? donation.item : (donation.item ? OTHER : ''),
    customItem: CATEGORIES[donation.category]?.includes(donation.item) ? '' : (donation.item || ''),
    quantity: donation.quantity || '',
    unit: donation.unit || 'kg',
    barangay: donation.barangay || '',
    donorType: donation.donor_type || 'non-government',
    recordedBy: donation.recorded_by || '',
    description: donation.description || '',
    isPrivate: donation.is_private || false,
  })
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function save() {
    setSaving(true)
    const finalItem = form.item === OTHER ? form.customItem : form.item
    const { error } = await supabase
      .from('donations')
      .update({
        category: form.category,
        item: finalItem,
        quantity: form.quantity,
        unit: form.unit,
        barangay: form.barangay,
        donor_type: form.donorType,
        recorded_by: form.recordedBy,
        description: form.description,
        is_private: form.isPrivate,
      })
      .eq('id', donation.id)
    setSaving(false)
    if (!error) onSaved()
  }

  return (
    <div className="rounded-lg border border-admin bg-admin-light px-4 py-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CategoryItemFields
          category={form.category}
          item={form.item}
          customItem={form.customItem}
          onCategory={(v) => setForm((f) => ({ ...f, category: v, item: '', customItem: '', unit: suggestUnit(v, '') }))}
          onItem={(v) => setForm((f) => ({ ...f, item: v, unit: suggestUnit(f.category, v, f.customItem) }))}
          onCustomItem={(v) => update('customItem', v)}
        />

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Quantity</label>
          <input
            type="number"
            min="0"
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            placeholder="Quantity"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Unit</label>
          <select
            value={form.unit}
            onChange={(e) => update('unit', e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <BarangaySuggestInput
            label="Barangay"
            size="sm"
            value={form.barangay}
            onChange={(v) => update('barangay', v)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-muted">Description / notes</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="e.g. Brand new, unopened. Expiry date December 2026."
            className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Donor type</label>
          <select
            value={form.donorType}
            onChange={(e) => update('donorType', e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
          >
            {DONOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-faint">{DONOR_TYPE_HINTS[form.donorType]}</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Recorded by (staff name)</label>
          <input
            value={form.recordedBy}
            onChange={(e) => update('recordedBy', e.target.value)}
            placeholder="Recorded by (staff name)"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(e) => update('isPrivate', e.target.checked)}
          />
          Mark donor identity as private
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-admin px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-faint"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ── Date range filter (From / To calendars + quick picks). Shared with the Overview page. ── */
export function DateRangeFilter({ donations, dateFrom, dateTo, setDateFrom, setDateTo, shown }) {
  const counts = useMemo(() => {
    const c = {}
    RANGE_OPTIONS.forEach((o) => {
      const { from, to } = rangeDates(o.key)
      c[o.key] = donations.filter((d) => inDates(d.created_at, from, to)).length
    })
    return c
  }, [donations])

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-line-soft">
      <div className="flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">From</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="rounded-full bg-admin-light px-3 py-1.5 text-[11px] font-semibold text-admin-dark hover:bg-admin/20"
          >
            Clear ✕
          </button>
        )}
        <span className="ml-auto text-[11px] font-semibold text-muted">
          Showing {shown} of {donations.length}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft bg-line-soft/40 px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Quick pick</span>
        {RANGE_OPTIONS.map((o) => {
          const { from, to } = rangeDates(o.key)
          const active = dateFrom === from && dateTo === to
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => { setDateFrom(from); setDateTo(to) }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                active ? 'bg-admin text-white' : 'bg-admin-light text-admin-dark hover:bg-admin/20'
              }`}
            >
              {o.label}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? 'bg-white/25 text-white' : 'bg-white text-admin-dark'
                }`}
              >
                {counts[o.key]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── One donation as a compact tappable box. `actions` (Edit/Archive buttons) is optional. ── */
export function DonationBox({ d, isOpen, onToggle, actions }) {
  const c = categoryColor(d.category)
  return (
    <div
      className={`overflow-hidden rounded-card border-t-4 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] ${
        isOpen ? 'sm:col-span-2 lg:col-span-3' : ''
      }`}
      style={{ borderTopColor: c.accent }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}
        className="cursor-pointer p-3 transition hover:bg-line-soft/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-ink">{d.item}</div>
            <div className="truncate text-[11px] text-faint">
              {d.donor_name || 'Anonymous'} · Brgy. {d.barangay}
            </div>
          </div>
          <span
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-bold"
            style={{ background: c.bg, color: c.accent }}
          >
            {d.quantity} {d.unit || ''}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-muted">🕒 {formatDateTime(d.created_at)}</span>
          <span className="flex items-center gap-2">
            <Badge tone={d.status === 'confirmed' ? 'confirmed' : 'pending'}>{d.status}</Badge>
            <span className="text-xs text-faint">{isOpen ? '▲' : '▼'}</span>
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-line-soft bg-line-soft/30 p-4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-2">
            <div><span className="text-faint">Category:</span> {d.category || '—'}</div>
            <div>
              <span className="text-faint">Donor type:</span>{' '}
              {d.donor_type === 'government' ? 'Government' : d.donor_type ? 'Non-government' : '—'}
            </div>
            <div><span className="text-faint">Barangay:</span> {d.barangay || '—'}</div>
            <div><span className="text-faint">Recorded by:</span> {d.recorded_by || '—'}</div>
            <div><span className="text-faint">Date &amp; time:</span> {formatDateTime(d.created_at)}</div>
            <div><span className="text-faint">Donor identity:</span> {d.is_private ? 'Private' : 'Public'}</div>
          </div>

          {d.description && (
            <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs italic text-muted">
              "{d.description}"
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {d.category && <Badge tone="neutral">{d.category}</Badge>}
            {d.donor_type && (
              <Badge tone={d.donor_type === 'government' ? 'government' : 'nonGovernment'}>
                {d.donor_type === 'government' ? 'Government' : 'Non-government'}
              </Badge>
            )}
            {actions && <div className="ml-auto flex gap-2">{actions}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DonationsTab() {
  const [form, setForm] = useState({
    donorName: '',
    donorEmail: '',
    category: '',
    item: '',
    customItem: '',
    quantity: '',
    unit: 'kg',
    barangay: '',
    donorType: 'non-government',
    recordedBy: '',
    description: '',
    isPrivate: false,
  })
  const [status, setStatus] = useState('')
  const [unitTouched, setUnitTouched] = useState(false) // true once staff picks a unit by hand

  const [donations, setDonations] = useState([])
  const [donors, setDonors] = useState([]) // registered donor accounts, used for suggestions
  const [listLoading, setListLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [openId, setOpenId] = useState(null) // which donation box is expanded
  const [dateFrom, setDateFrom] = useState('') // date filter for Manage donations
  const [dateTo, setDateTo] = useState('')

  async function loadDonations() {
    setListLoading(true)
    const { data } = await supabase
      .from('donations')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
    setDonations(data || [])
    setListLoading(false)
  }

  async function loadDonors() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'donor')
      .order('full_name', { ascending: true })
    setDonors(data || [])
  }

  useEffect(() => {
    loadDonations()
    loadDonors()
  }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  /* Unit recommended for the chosen item (pants → pcs, rice → kg …) */
  const suggestedUnit = form.category ? suggestUnit(form.category, form.item, form.customItem) : ''

  function handleCategoryChange(v) {
    setUnitTouched(false)
    setForm((f) => ({ ...f, category: v, item: '', customItem: '', unit: suggestUnit(v, '') }))
  }

  function handleItemChange(v) {
    setUnitTouched(false)
    setForm((f) => ({ ...f, item: v, customItem: '', unit: suggestUnit(f.category, v, '') }))
  }

  function handleCustomItemChange(v) {
    setForm((f) => ({
      ...f,
      customItem: v,
      unit: unitTouched ? f.unit : suggestUnit(f.category, OTHER, v),
    }))
  }

  /* The donor account that matches the typed email (if any) */
  const matchedDonor = useMemo(() => {
    const email = form.donorEmail.trim().toLowerCase()
    if (!email) return null
    return donors.find((d) => (d.email || '').toLowerCase() === email) || null
  }, [donors, form.donorEmail])

  /* Their earlier donations, for a quick "returning donor" summary */
  const donorHistory = useMemo(() => {
    if (!matchedDonor) return []
    return donations.filter((d) => d.donor_id === matchedDonor.id)
  }, [donations, matchedDonor])

  /* Picking a suggestion fills in everything we already know about that donor */
  function pickDonor(d) {
    setForm((f) => ({
      ...f,
      donorName: donorDisplayName(d),
      donorEmail: d.email || '',
      donorType: DONOR_TYPES.some((t) => t.value === d.donor_type) ? d.donor_type : f.donorType,
      barangay: f.barangay || d.barangay || '',
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('saving')

    // Prefer the donor picked from suggestions; otherwise look the email up
    let donorId = matchedDonor?.id ?? null
    if (!donorId && form.donorEmail.trim()) {
      const { data: donor } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', form.donorEmail.trim())
        .single()
      donorId = donor?.id ?? null
    }

    const finalItem = form.item === OTHER ? form.customItem : form.item

    const { error } = await supabase.from('donations').insert({
      donor_id: donorId,
      donor_name: form.donorName,
      category: form.category,
      item: finalItem,
      quantity: form.quantity,
      unit: form.unit,
      barangay: form.barangay,
      donor_type: form.donorType,
      recorded_by: form.recordedBy,
      description: form.description,
      is_private: form.isPrivate,
      status: 'confirmed',
    })

    setStatus(error ? 'error' : 'success')
    if (!error) {
      setUnitTouched(false)
      setForm({
        donorName: '',
        donorEmail: '',
        category: '',
        item: '',
        customItem: '',
        quantity: '',
        unit: 'kg',
        barangay: '',
        donorType: 'non-government',
        recordedBy: form.recordedBy, // keep staff name filled in for the next entry
        description: '',
        isPrivate: false,
      })
      loadDonations()
    }
  }

  const visibleDonations = useMemo(
    () => donations.filter((d) => inDates(d.created_at, dateFrom, dateTo)),
    [donations, dateFrom, dateTo]
  )

  async function archiveDonation(id) {
    setBusyId(id)
    const { error } = await supabase
      .from('donations')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', id)
    setBusyId(null)
    if (!error) loadDonations()
  }

  return (
    <>
      <div className="mb-6 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
  <h1 className="mb-1 text-xl font-bold text-admin-dark">Donations</h1>
  <p className="text-sm text-faint">Verify donors and record entries on their behalf</p>
</div>

      <Card className="p-6">
        <h2 className="mb-4 text-base font-bold text-ink">Record donation entry</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <DonorSuggestInput
              label="Donor name"
              required
              placeholder="Start typing — registered donors will show up"
              value={form.donorName}
              onChange={(v) => update('donorName', v)}
              onPick={pickDonor}
              donors={donors}
            />
          </div>

          <div className="sm:col-span-2">
            <DonorSuggestInput
              label="Donor email (optional — links to their dashboard)"
              type="email"
              placeholder="e.g. name@email.com"
              value={form.donorEmail}
              onChange={(v) => update('donorEmail', v)}
              onPick={pickDonor}
              donors={donors}
            />

            {matchedDonor && (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-donor-light bg-donor-light px-3 py-2.5">
                <Avatar name={donorDisplayName(matchedDonor)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-donor-dark">
                    ✓ Registered donor — this donation will appear on their dashboard
                  </div>
                  <div className="truncate text-[11px] text-muted">
                    {donorDisplayName(matchedDonor)} · {matchedDonor.email}
                  </div>
                </div>
                <div className="shrink-0 text-right text-[11px] text-muted">
                  <div className="font-bold text-donor-dark">
                    {donorHistory.length} previous donation{donorHistory.length === 1 ? '' : 's'}
                  </div>
                  {donorHistory[0]?.created_at && (
                    <div>Last: {new Date(donorHistory[0].created_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            )}

            {!matchedDonor && form.donorEmail.includes('@') && (
              <div className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-[11px] text-warn-text">
                No registered account uses this email. The donation will still be recorded, but it won't be linked to a donor dashboard.
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Category</label>
            <select
              required
              value={form.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            >
              <option value="" disabled>Select category</option>
              {Object.keys(CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Item</label>
            <select
              required
              value={form.item}
              disabled={!form.category}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin disabled:bg-line-soft disabled:text-faint"
            >
              <option value="" disabled>{form.category ? 'Select item' : 'Pick a category first'}</option>
              {(form.category ? [...CATEGORIES[form.category], OTHER] : []).map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {form.item === OTHER && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-muted">Specify item name</label>
              <input
                required
                placeholder="Type the item name"
                value={form.customItem}
                onChange={(e) => handleCustomItemChange(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Quantity</label>
            <input
              required
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 20"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Unit</label>
            <select
              required
              value={form.unit}
              onChange={(e) => {
                setUnitTouched(true)
                update('unit', e.target.value)
              }}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {form.item && suggestedUnit && form.unit === suggestedUnit && (
              <p className="mt-1 text-xs text-faint">✨ Unit suggested from the item. Change it if needed.</p>
            )}
            {form.item && suggestedUnit && form.unit !== suggestedUnit && (
              <button
                type="button"
                onClick={() => {
                  setUnitTouched(false)
                  update('unit', suggestedUnit)
                }}
                className="mt-1 text-xs font-semibold text-admin-dark hover:underline"
              >
                Suggested: {suggestedUnit}. Tap to use it
              </button>
            )}
          </div>

          <div className="sm:col-span-2">
            <BarangaySuggestInput
              label="Barangay"
              required
              value={form.barangay}
              onChange={(v) => update('barangay', v)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted">
              Description / notes <span className="font-normal text-faint">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Brand new, unopened. Expiry date December 2026. Donated for the Sitio Kahusayan families."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full resize-none rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Donor type</label>
            <select
              required
              value={form.donorType}
              onChange={(e) => update('donorType', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            >
              {DONOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-faint">{DONOR_TYPE_HINTS[form.donorType]}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Recorded by (staff name)</label>
            <input
              required
              placeholder="e.g. Name"
              value={form.recordedBy}
              onChange={(e) => update('recordedBy', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(e) => update('isPrivate', e.target.checked)}
            />
            Mark donor identity as private (hidden from the public feed)
          </label>

          <div className="sm:col-span-2">
            <Button type="submit" variant="admin">
              Record donation
            </Button>
          </div>

          {status === 'success' && (
            <p className="text-sm font-semibold text-donor-dark sm:col-span-2">
              Donation recorded.
            </p>
          )}
          {status === 'error' && (
            <p className="text-sm font-semibold text-admin sm:col-span-2">
              Could not save — please try again.
            </p>
          )}
        </form>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="mb-1 text-base font-bold text-ink">Manage donations</h2>
        <p className="mb-4 text-sm text-faint">
          Fix a wrong entry, or archive it if it was recorded by mistake. Archived entries
          disappear from the donor's dashboard and the public feed, but stay on record —
          check the Archive tab to restore one.
        </p>

        {listLoading && <p className="text-sm text-faint">Loading…</p>}
        {!listLoading && donations.length === 0 && (
          <p className="text-sm text-faint">No donation entries yet.</p>
        )}

        {donations.length > 0 && (
          <DateRangeFilter
            donations={donations}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
            shown={visibleDonations.length}
          />
        )}

        {!listLoading && donations.length > 0 && visibleDonations.length === 0 && (
          <p className="text-sm text-faint">No donations in this period.</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDonations.map((d) => {
            if (editingId === d.id) {
              return (
                <div key={d.id} className="sm:col-span-2 lg:col-span-3">
                  <EditDonationRow
                    donation={d}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null)
                      loadDonations()
                    }}
                  />
                </div>
              )
            }

            return (
              <DonationBox
                key={d.id}
                d={d}
                isOpen={openId === d.id}
                onToggle={() => setOpenId((cur) => (cur === d.id ? null : d.id))}
                actions={
                  <>
                    <button
                      onClick={() => setEditingId(d.id)}
                      className="rounded-lg bg-line-soft px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            'Archive this donation? It will be removed from the donor dashboard and public feed.'
                          )
                        ) {
                          archiveDonation(d.id)
                        }
                      }}
                      disabled={busyId === d.id}
                      className="rounded-lg bg-admin px-3 py-1.5 text-xs font-semibold text-white hover:bg-admin-dark disabled:opacity-50"
                    >
                      {busyId === d.id ? 'Archiving…' : 'Archive'}
                    </button>
                  </>
                }
              />
            )
          })}
        </div>
      </Card>
    </>
  )
}