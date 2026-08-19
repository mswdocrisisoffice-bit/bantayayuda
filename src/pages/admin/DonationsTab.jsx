import { useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { AdminTabs } from './AdminDashboard.jsx'
import { supabase } from '../../lib/supabase.js'

const CATEGORIES = [
  { group: "NGO's", options: ['Relief Goods (Rice, Canned Goods, etc.)', 'Clothing', 'Financial Assistance'] },
  { group: "GO's — DSWD", options: ['Family Food Pack', 'Family Kit', 'Hygiene Kit', 'Kitchen Kit', 'Sleeping Kit', 'Jerry Can'] },
  { group: 'Other', options: ['Other'] },
]

export default function DonationsTab() {
  const [form, setForm] = useState({
    donorName: '',
    donorEmail: '',
    category: '',
    item: '',
    quantity: '',
    barangay: '',
    isPrivate: false,
  })
  const [status, setStatus] = useState('')

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

    const { error } = await supabase.from('donations').insert({
      donor_id: donorId,
      donor_name: form.donorName,
      category: form.category,
      item: form.item,
      quantity: form.quantity,
      barangay: form.barangay,
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
        quantity: '',
        barangay: '',
        isPrivate: false,
      })
    }
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-xl font-bold text-admin-dark">Donations</h1>
        <p className="mb-6 text-xs text-faint">Verify donors and record entries on their behalf</p>
        <AdminTabs />

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Record donation entry</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Donor name"
              value={form.donorName}
              onChange={(e) => update('donorName', e.target.value)}
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin sm:col-span-2"
            />
            <input
              placeholder="Donor email (optional — links to their dashboard)"
              value={form.donorEmail}
              onChange={(e) => update('donorEmail', e.target.value)}
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin sm:col-span-2"
            />

            <select
              required
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin sm:col-span-2"
            >
              <option value="" disabled>Select category</option>
              {CATEGORIES.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <input
              required
              placeholder="Item detail (e.g. Rice, 20kg bags)"
              value={form.item}
              onChange={(e) => update('item', e.target.value)}
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            />
            <input
              required
              placeholder="Quantity (e.g. 20kg)"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
            />
            <input
              required
              placeholder="Barangay"
              value={form.barangay}
              onChange={(e) => update('barangay', e.target.value)}
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-xs text-muted sm:col-span-2">
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
              <p className="text-xs font-semibold text-donor-dark sm:col-span-2">
                Donation recorded.
              </p>
            )}
            {status === 'error' && (
              <p className="text-xs font-semibold text-admin sm:col-span-2">
                Could not save — please try again.
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  )
}