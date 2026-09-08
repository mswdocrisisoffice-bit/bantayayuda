import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { supabase } from '../../lib/supabase.js'

const emptyMember = { name: '', relation: '', age: '', sex: '' }

function EditHouseholdRow({ household, onCancel, onSaved }) {
  const [form, setForm] = useState({
    lastName: household.last_name || '',
    firstName: household.first_name || '',
    middleName: household.middle_name || '',
    barangay: household.barangay || '',
    permanentAddress: household.permanent_address || '',
    householdSize: household.household_size || '',
    contactNumber: household.contact_number || '',
    is4Ps: household.is_4ps_beneficiary || false,
  })
  const [familyMembers, setFamilyMembers] = useState(
    household.family_members && household.family_members.length > 0
      ? household.family_members
      : [{ ...emptyMember }]
  )
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function updateMember(index, field, value) {
    setFamilyMembers((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addMemberRow() {
    setFamilyMembers((rows) => [...rows, { ...emptyMember }])
  }

  function removeMemberRow(index) {
    setFamilyMembers((rows) => rows.filter((_, i) => i !== index))
  }

  async function save() {
    setSaving(true)
    const householdHead = [form.lastName, form.firstName, form.middleName]
      .filter(Boolean)
      .join(', ')
    const { error } = await supabase
      .from('beneficiaries')
      .update({
        household_head: householdHead,
        last_name: form.lastName,
        first_name: form.firstName,
        middle_name: form.middleName,
        barangay: form.barangay,
        permanent_address: form.permanentAddress,
        household_size: Number(form.householdSize) || 0,
        contact_number: form.contactNumber,
        is_4ps_beneficiary: form.is4Ps,
        family_members: familyMembers.filter((m) => m.name.trim() !== ''),
      })
      .eq('id', household.id)
    setSaving(false)
    if (!error) onSaved()
  }

  return (
    <div className="rounded-lg border border-admin bg-admin-light px-4 py-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={form.lastName}
          onChange={(e) => update('lastName', e.target.value)}
          placeholder="Last name"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.firstName}
          onChange={(e) => update('firstName', e.target.value)}
          placeholder="First name"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.middleName}
          onChange={(e) => update('middleName', e.target.value)}
          placeholder="Middle name"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.barangay}
          onChange={(e) => update('barangay', e.target.value)}
          placeholder="Barangay"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.permanentAddress}
          onChange={(e) => update('permanentAddress', e.target.value)}
          placeholder="Permanent address"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin sm:col-span-2"
        />
        <input
          type="number"
          min="1"
          value={form.householdSize}
          onChange={(e) => update('householdSize', e.target.value)}
          placeholder="Household size"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <input
          value={form.contactNumber}
          onChange={(e) => update('contactNumber', e.target.value)}
          placeholder="Contact number"
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-admin"
        />
        <label className="flex items-center gap-2 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={form.is4Ps}
            onChange={(e) => update('is4Ps', e.target.checked)}
          />
          4Ps beneficiary household
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-ink">Family members</span>
          <button
            type="button"
            onClick={addMemberRow}
            className="text-xs font-semibold text-admin-dark hover:underline"
          >
            + Add member
          </button>
        </div>
        <div className="space-y-2">
          {familyMembers.map((m, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              <input
                placeholder="Name"
                value={m.name}
                onChange={(e) => updateMember(i, 'name', e.target.value)}
                className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-admin sm:col-span-2"
              />
              <input
                placeholder="Relation"
                value={m.relation}
                onChange={(e) => updateMember(i, 'relation', e.target.value)}
                className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-admin"
              />
              <input
                placeholder="Age"
                value={m.age}
                onChange={(e) => updateMember(i, 'age', e.target.value)}
                className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-admin"
              />
              <div className="flex gap-1">
                <input
                  placeholder="Sex"
                  value={m.sex}
                  onChange={(e) => updateMember(i, 'sex', e.target.value)}
                  className="w-full rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-admin"
                />
                {familyMembers.length > 1 && (
                  <button type="button" onClick={() => removeMemberRow(i)} className="px-1 text-admin">
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-admin px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-faint"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function BeneficiaryRegistryTab() {
  const [search, setSearch] = useState('')
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('beneficiaries')
      .select('*')
      .neq('status', 'archived')
      .order('household_head')
    setHouseholds(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function archiveHousehold(id) {
    setBusyId(id)
    const { error } = await supabase
      .from('beneficiaries')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', id)
    setBusyId(null)
    if (!error) load()
  }

  const filtered = households.filter((h) =>
    h.household_head?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="mb-6 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
  <h1 className="mb-1 text-xl font-bold text-admin-dark">Beneficiary registry</h1>
  <p className="text-xs text-faint">Search households and check for duplicate aid</p>
</div>
      <input
        placeholder="Search by household head name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-admin"
      />

      <Card className="p-4">
        {loading && <p className="p-4 text-xs text-faint">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-xs text-faint">No households match your search.</p>
        )}
        <div className="divide-y divide-line-soft">
          {filtered.map((h) =>
            editingId === h.id ? (
              <div key={h.id} className="py-3">
                <EditHouseholdRow
                  household={h}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null)
                    load()
                  }}
                />
              </div>
            ) : (
              <div key={h.id} className="py-3">
                <div className="flex items-center justify-between">
                  <button
                    className="text-left"
                    onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {h.household_head}
                      {h.is_4ps_beneficiary && (
                        <span className="ml-2 text-[10px] font-bold text-beneficiary-dark">4Ps</span>
                      )}
                    </div>
                    <div className="text-xs text-faint">
                      Brgy. {h.barangay} · {h.household_size} members
                      {h.contact_number ? ` · ${h.contact_number}` : ''}
                      {h.family_members?.length > 0 ? ' · Tap to view family members' : ''}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge tone={h.last_aid_within_30_days ? 'pending' : 'confirmed'}>
                      {h.last_aid_within_30_days ? 'Recent aid — review' : 'Eligible'}
                    </Badge>
                    <button
                      onClick={() => setEditingId(h.id)}
                      className="rounded-lg bg-line-soft px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-line"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            'Archive this household? It will be hidden from the active registry.'
                          )
                        ) {
                          archiveHousehold(h.id)
                        }
                      }}
                      disabled={busyId === h.id}
                      className="rounded-lg bg-admin px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-admin-dark disabled:opacity-50"
                    >
                      {busyId === h.id ? 'Archiving…' : 'Archive'}
                    </button>
                  </div>
                </div>

                {expandedId === h.id && (
                  <div className="mt-2 rounded-lg bg-line-soft/60 p-3">
                    {h.permanent_address && (
                      <div className="mb-2 text-xs text-muted">
                        <span className="font-semibold text-ink">Address:</span>{' '}
                        {h.permanent_address}
                      </div>
                    )}
                    {h.family_members?.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-ink">Family members</div>
                        {h.family_members.map((m, i) => (
                          <div key={i} className="text-xs text-muted">
                            • {m.name}
                            {m.relation ? ` — ${m.relation}` : ''}
                            {m.age ? `, ${m.age} yrs old` : ''}
                            {m.sex ? ` (${m.sex})` : ''}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-faint">No family members listed.</p>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </Card>

      <p className="mt-3 text-[11px] text-faint">
        "Recent aid — review" flags households that received aid within the last 30 days, based
        on a backend query against the distributions table — check before recording a new entry
        to avoid duplicate aid. Archived households appear in the Archive tab and can be
        restored from there.
      </p>
    </>
  )
}