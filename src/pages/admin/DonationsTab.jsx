import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { supabase } from '../../lib/supabase.js'

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
          onCategory={(v) => setForm((f) => ({ ...f, category: v, item: '', customItem: '' }))}
          onItem={(v) => update('item', v)}
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
          <label className="mb-1 block text-xs font-semibold text-muted">Barangay</label>
          <input
            value={form.barangay}
            onChange={(e) => update('barangay', e.target.value)}
            placeholder="Barangay"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"
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

  const [donations, setDonations] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [busyId, setBusyId] = useState(null)

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

  useEffect(() => {
    loadDonations()
  }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('saving')

    let donorId = null
    if (form.donorEmail) {
      const { data: donor } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', form.donorEmail)
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
            <label className="mb-1 block text-xs font-semibold text-muted">Donor name</label>
            <input
              required
              placeholder="e.g. Name"
              value={form.donorName}
              onChange={(e) => update('donorName', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted">Donor email (optional — links to their dashboard)</label>
            <input
              placeholder="e.g. email.com"
              value={form.donorEmail}
              onChange={(e) => update('donorEmail', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Category</label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, item: '', customItem: '' }))}
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
              onChange={(e) => update('item', e.target.value)}
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
                onChange={(e) => update('customItem', e.target.value)}
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
              onChange={(e) => update('unit', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted">Barangay</label>
            <input
              required
              placeholder="e.g. Barangay"
              value={form.barangay}
              onChange={(e) => update('barangay', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
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

        <div className="space-y-3">
          {donations.map((d) =>
            editingId === d.id ? (
              <EditDonationRow
                key={d.id}
                donation={d}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null)
                  loadDonations()
                }}
              />
            ) : (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-soft px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {d.item} {d.quantity ? `— ${d.quantity} ${d.unit || ''}` : ''}
                  </div>
                  <div className="text-sm text-faint">
                    {d.donor_name || 'Anonymous'} · Brgy. {d.barangay} ·{' '}
                    {new Date(d.created_at).toLocaleDateString()}
                    {d.is_private ? ' · Private' : ''}
                    {d.recorded_by ? ` · Recorded by ${d.recorded_by}` : ''}
                  </div>
                  {d.description && (
                    <div className="mt-1 text-sm italic text-faint">"{d.description}"</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {d.category && <Badge tone="neutral">{d.category}</Badge>}
                  {d.donor_type && (
                    <Badge tone={d.donor_type === 'government' ? 'government' : 'nonGovernment'}>
                      {d.donor_type === 'government' ? 'Government' : 'Non-government'}
                    </Badge>
                  )}
                  <Badge tone={d.status === 'confirmed' ? 'confirmed' : 'pending'}>
                    {d.status}
                  </Badge>
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
                </div>
              </div>
            )
          )}
        </div>
      </Card>
    </>
  )
}