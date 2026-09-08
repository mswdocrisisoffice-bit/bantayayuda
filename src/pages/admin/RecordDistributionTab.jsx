import { useState } from 'react'
import dswdLogo from '../../assets/dswd-logo.png'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import ESignatureCanvas from '../../components/ESignatureCanvas.jsx'
import { CATEGORIES, UNITS } from './DonationsTab.jsx'
import { supabase } from '../../lib/supabase.js'

const emptyMember = { name: '', relation: '', birthdate: '', age: '', sex: '', education: '', occupation: '', remarks: '' }

function SectionHeader({ children }) {
  return (
    <div className="-mx-6 -mt-6 mb-4 bg-navy px-6 py-2.5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-white">{children}</h2>
    </div>
  )
}

function Field({ number, label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-admin-dark">
        {number ? `${number}. ` : ''}{label}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-admin"

function generateSerialNumber() {
  const year = new Date().getFullYear()
  const rand = String(Date.now()).slice(-6)
  return `MF-${year}-${rand}`
}

/* ── Mode picker: New family vs. Existing beneficiary ── */
function ModePicker({ mode, onSelect }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        onClick={() => onSelect('new')}
        className={`rounded-lg border-2 p-4 text-left transition ${
          mode === 'new' ? 'border-admin bg-admin-light' : 'border-line bg-white hover:border-admin/50'
        }`}
      >
        <div className="text-sm font-bold text-ink">Register new family</div>
        <div className="mt-1 text-xs text-faint">
          First time this household is receiving aid — fill up the complete FACED form.
        </div>
      </button>
      <button
        onClick={() => onSelect('existing')}
        className={`rounded-lg border-2 p-4 text-left transition ${
          mode === 'existing' ? 'border-admin bg-admin-light' : 'border-line bg-white hover:border-admin/50'
        }`}
      >
        <div className="text-sm font-bold text-ink">Existing beneficiary</div>
        <div className="mt-1 text-xs text-faint">
          Already on file — just enter their serial number, then record the new item and signature.
        </div>
      </button>
    </div>
  )
}

/* ── Quick form for a beneficiary who's already on file ── */
function QuickDistributionForm({ existingRecord, onDone }) {
  const [category, setCategory] = useState('')
  const [item, setItem] = useState('')
  const [customItem, setCustomItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [signature, setSignature] = useState(null)
  const [status, setStatus] = useState('')

  async function handleSubmit() {
    if (!signature) return
    setStatus('saving')

    const fileName = `signatures/${Date.now()}.png`
    const blob = await (await fetch(signature)).blob()
    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, blob, { contentType: 'image/png' })

    const finalItem = item === 'Other (specify)' ? customItem : item

    const { error: insertError } = await supabase.from('distributions').insert({
      serial_number: existingRecord.serial_number,
      household_head: existingRecord.household_head,
      category,
      item: finalItem,
      quantity: Number(quantity),
      unit,
      barangay: existingRecord.barangay,
      signature_path: fileName,
      thumbmark_data: fileName,
      status: 'confirmed',

      region: existingRecord.region,
      province: existingRecord.province,
      district: existingRecord.district,
      city_municipality: existingRecord.city_municipality,
      evacuation_center: existingRecord.evacuation_center,

      head_last_name: existingRecord.head_last_name,
      head_first_name: existingRecord.head_first_name,
      head_middle_name: existingRecord.head_middle_name,
      head_name_ext: existingRecord.head_name_ext,
      head_birthdate: existingRecord.head_birthdate,
      head_age: existingRecord.head_age,
      head_birthplace: existingRecord.head_birthplace,
      head_sex: existingRecord.head_sex,
      civil_status: existingRecord.civil_status,
      mothers_maiden_name: existingRecord.mothers_maiden_name,
      religion: existingRecord.religion,
      occupation: existingRecord.occupation,
      monthly_family_income: existingRecord.monthly_family_income,
      id_card_presented: existingRecord.id_card_presented,
      id_card_number: existingRecord.id_card_number,
      contact_primary: existingRecord.contact_primary,
      contact_alternate: existingRecord.contact_alternate,
      permanent_address: existingRecord.permanent_address,

      is_4ps_beneficiary: existingRecord.is_4ps_beneficiary,
      ip_ethnicity: existingRecord.ip_ethnicity,

      family_members: existingRecord.family_members,

      vulnerable_older_persons: existingRecord.vulnerable_older_persons,
      vulnerable_pregnant_women: existingRecord.vulnerable_pregnant_women,
      vulnerable_lactating_women: existingRecord.vulnerable_lactating_women,
      vulnerable_pwds: existingRecord.vulnerable_pwds,

      house_ownership: existingRecord.house_ownership,
      shelter_damage: existingRecord.shelter_damage,

      date_registered: existingRecord.date_registered,
      brgy_captain_name: existingRecord.brgy_captain_name,
      lswdo_name: existingRecord.lswdo_name,
    })

    setStatus(!uploadError && !insertError ? 'success' : 'error')
  }

  if (status === 'success') {
    return (
      <Card className="p-6">
        <div className="rounded border border-beneficiary-dark bg-beneficiary-light p-4">
          <p className="text-sm font-bold text-donor-dark">Distribution recorded ✓</p>
          <p className="mt-1 text-xs text-beneficiary-dark">
            Serial number: <span className="font-bold">{existingRecord.serial_number}</span>
          </p>
        </div>
        <button
          onClick={onDone}
          className="mt-4 text-xs font-semibold text-admin-dark hover:underline"
        >
          Look up another beneficiary
        </button>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-sm font-bold text-ink">Quick distribution</h2>
      <p className="mb-4 text-xs text-faint">
        Household details are already on file — just record what was given out this time.
      </p>

      <div className="mb-4 rounded-lg border border-line-soft bg-line-soft/40 p-3 text-xs text-muted">
        <div className="font-semibold text-ink">{existingRecord.household_head || 'Unnamed household'}</div>
        <div>Brgy. {existingRecord.barangay || '—'} · Serial: {existingRecord.serial_number}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Category</label>
          <select
            className={inputClass}
            value={category}
            onChange={(e) => { setCategory(e.target.value); setItem(''); setCustomItem('') }}
          >
            <option value="" disabled>Select category</option>
            {Object.keys(CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Item</label>
          <select
            className={inputClass}
            value={item}
            disabled={!category}
            onChange={(e) => setItem(e.target.value)}
          >
            <option value="" disabled>{category ? 'Select item' : 'Pick a category first'}</option>
            {(category ? [...CATEGORIES[category], 'Other (specify)'] : []).map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        {item === 'Other (specify)' && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted">Specify item name</label>
            <input className={inputClass} value={customItem} onChange={(e) => setCustomItem(e.target.value)} />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Quantity</label>
          <input type="number" min="0" className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Unit</label>
          <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 border border-line-soft p-4">
        <div className="mb-2 text-xs font-bold text-ink">Hand device to recipient to confirm receipt</div>
        <ESignatureCanvas onSave={setSignature} />
        {signature && <p className="mt-2 text-xs font-semibold text-donor-dark">Thumbmark captured ✓</p>}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="admin"
          disabled={!signature || !category || !item || !quantity || status === 'saving'}
          onClick={handleSubmit}
        >
          {status === 'saving' ? 'Saving…' : 'Confirm distribution'}
        </Button>
        <button onClick={onDone} className="text-xs font-semibold text-faint hover:text-admin">
          Cancel
        </button>
      </div>

      {status === 'error' && (
        <p className="mt-3 text-xs font-semibold text-admin">Could not save the record — please try again.</p>
      )}
    </Card>
  )
}

/* ── Lookup screen: find an existing beneficiary by serial number ── */
function ExistingBeneficiaryFlow({ onSwitchToNew }) {
  const [serialNumber, setSerialNumber] = useState('')
  const [checking, setChecking] = useState(false)
  const [searched, setSearched] = useState(false)
  const [record, setRecord] = useState(null)
  const [resetKey, setResetKey] = useState(0)

  async function checkSerialNumber() {
    if (!serialNumber.trim()) return
    setChecking(true)
    const { data } = await supabase
      .from('distributions')
      .select('*')
      .eq('serial_number', serialNumber.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setRecord(data || null)
    setSearched(true)
    setChecking(false)
  }

  if (record) {
    return (
      <QuickDistributionForm
        key={resetKey}
        existingRecord={record}
        onDone={() => {
          setRecord(null)
          setSearched(false)
          setSerialNumber('')
          setResetKey((k) => k + 1)
        }}
      />
    )
  }

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-sm font-bold text-ink">Find existing beneficiary</h2>
      <p className="mb-4 text-xs text-faint">
        Enter the household's serial number to skip re-filling their details.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          placeholder="Enter serial number"
          value={serialNumber}
          onChange={(e) => { setSerialNumber(e.target.value); setSearched(false) }}
          className={inputClass}
        />
        <button
          onClick={checkSerialNumber}
          disabled={!serialNumber.trim() || checking}
          className="whitespace-nowrap rounded bg-admin px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {checking ? 'Searching…' : 'Find record'}
        </button>
      </div>

      {searched && !record && (
        <div className="mt-4 rounded border border-warn-text bg-warn-bg p-4 text-xs text-warn-text">
          <p className="font-bold">No record found for this serial number.</p>
          <button onClick={() => onSwitchToNew(serialNumber)} className="mt-2 font-bold underline">
            Register this as a new family instead
          </button>
        </div>
      )}
    </Card>
  )
}

/* ── Full FACED registration form for a brand-new family ── */
function NewFamilyForm({ prefillSerial }) {
  const [serialNumber] = useState(prefillSerial || '')
  const [form, setForm] = useState({
    region: '', province: '', district: '', cityMunicipality: '', barangay: '', evacuationCenter: '',
    lastName: '', firstName: '', middleName: '', nameExt: '',
    birthdate: '', age: '', birthplace: '', sex: '', civilStatus: '', mothersMaidenName: '',
    religion: '', occupation: '', monthlyIncome: '', idCardPresented: '', idCardNumber: '',
    contactPrimary: '', contactAlternate: '', permanentAddress: '',
    is4Ps: false, ipEthnicity: '',
    vulnerableOlder: 0, vulnerablePregnant: 0, vulnerableLactating: 0, vulnerablePwd: 0,
    houseOwnership: '', shelterDamage: '',
    category: '', item: '', customItem: '', quantity: '', unit: 'kg',
    dateRegistered: '', brgyCaptainName: '', lswdoName: '',
  })
  const [familyMembers, setFamilyMembers] = useState([{ ...emptyMember }])
  const [signature, setSignature] = useState(null)
  const [status, setStatus] = useState('')
  const [savedSerial, setSavedSerial] = useState('')

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

  async function handleSubmit() {
    if (!signature) return
    setStatus('saving')

    const finalSerial = serialNumber.trim() || generateSerialNumber()

    const fileName = `signatures/${Date.now()}.png`
    const blob = await (await fetch(signature)).blob()
    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, blob, { contentType: 'image/png' })

    const householdHead = [form.lastName, form.firstName, form.middleName].filter(Boolean).join(', ')
    const finalItem = form.item === 'Other (specify)' ? form.customItem : form.item

    const { error: insertError } = await supabase.from('distributions').insert({
      serial_number: finalSerial,
      household_head: householdHead,
      category: form.category,
      item: finalItem,
      quantity: Number(form.quantity),
      unit: form.unit,
      barangay: form.barangay,
      signature_path: fileName,
      thumbmark_data: fileName,
      status: 'confirmed',

      region: form.region,
      province: form.province,
      district: form.district,
      city_municipality: form.cityMunicipality,
      evacuation_center: form.evacuationCenter,

      head_last_name: form.lastName,
      head_first_name: form.firstName,
      head_middle_name: form.middleName,
      head_name_ext: form.nameExt,
      head_birthdate: form.birthdate || null,
      head_age: form.age ? Number(form.age) : null,
      head_birthplace: form.birthplace,
      head_sex: form.sex,
      civil_status: form.civilStatus,
      mothers_maiden_name: form.mothersMaidenName,
      religion: form.religion,
      occupation: form.occupation,
      monthly_family_income: form.monthlyIncome,
      id_card_presented: form.idCardPresented,
      id_card_number: form.idCardNumber,
      contact_primary: form.contactPrimary,
      contact_alternate: form.contactAlternate,
      permanent_address: form.permanentAddress,

      is_4ps_beneficiary: form.is4Ps,
      ip_ethnicity: form.ipEthnicity,

      family_members: familyMembers,

      vulnerable_older_persons: Number(form.vulnerableOlder) || 0,
      vulnerable_pregnant_women: Number(form.vulnerablePregnant) || 0,
      vulnerable_lactating_women: Number(form.vulnerableLactating) || 0,
      vulnerable_pwds: Number(form.vulnerablePwd) || 0,

      house_ownership: form.houseOwnership,
      shelter_damage: form.shelterDamage,

      date_registered: form.dateRegistered || null,
      brgy_captain_name: form.brgyCaptainName,
      lswdo_name: form.lswdoName,
    })

    if (!uploadError && !insertError) {
      setSavedSerial(finalSerial)
      setStatus('success')
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border-2 border-navy bg-white">

      <Card className="rounded-none border-0 border-b border-line p-6 shadow-none">
        <SectionHeader>Location of the affected family</SectionHeader>
        <div className="grid grid-cols-1 gap-3 border border-line-soft p-3 sm:grid-cols-3">
          <Field number={1} label="Region"><input className={inputClass} value={form.region} onChange={(e) => update('region', e.target.value)} /></Field>
          <Field number={2} label="Province"><input className={inputClass} value={form.province} onChange={(e) => update('province', e.target.value)} /></Field>
          <Field number={3} label="District"><input className={inputClass} value={form.district} onChange={(e) => update('district', e.target.value)} /></Field>
          <Field number={4} label="City/Municipality"><input className={inputClass} value={form.cityMunicipality} onChange={(e) => update('cityMunicipality', e.target.value)} /></Field>
          <Field number={5} label="Barangay"><input className={inputClass} value={form.barangay} onChange={(e) => update('barangay', e.target.value)} /></Field>
          <Field number={6} label="Evacuation center / site"><input className={inputClass} value={form.evacuationCenter} onChange={(e) => update('evacuationCenter', e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="rounded-none border-0 border-b border-line p-6 shadow-none">
        <SectionHeader>Head of the family</SectionHeader>
        <div className="grid grid-cols-1 gap-3 border border-line-soft p-3 sm:grid-cols-3">
          <Field number={7} label="Last name"><input className={inputClass} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></Field>
          <Field number={8} label="First name"><input className={inputClass} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></Field>
          <Field number={9} label="Middle name"><input className={inputClass} value={form.middleName} onChange={(e) => update('middleName', e.target.value)} /></Field>
          <Field number={10} label="Name ext. (Jr., Sr., I)"><input className={inputClass} value={form.nameExt} onChange={(e) => update('nameExt', e.target.value)} /></Field>
          <Field number={11} label="Birthdate"><input type="date" className={inputClass} value={form.birthdate} onChange={(e) => update('birthdate', e.target.value)} /></Field>
          <Field number={12} label="Age"><input type="number" className={inputClass} value={form.age} onChange={(e) => update('age', e.target.value)} /></Field>
          <Field number={13} label="Birthplace"><input className={inputClass} value={form.birthplace} onChange={(e) => update('birthplace', e.target.value)} /></Field>
          <Field number={14} label="Sex">
            <div className="flex items-center gap-4 pt-2 text-xs">
              <label className="flex items-center gap-1.5"><input type="radio" name="sex" checked={form.sex === 'Male'} onChange={() => update('sex', 'Male')} /> Male</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="sex" checked={form.sex === 'Female'} onChange={() => update('sex', 'Female')} /> Female</label>
            </div>
          </Field>
          <Field number={15} label="Civil status"><input className={inputClass} value={form.civilStatus} onChange={(e) => update('civilStatus', e.target.value)} /></Field>
          <Field number={16} label="Mother's maiden name"><input className={inputClass} value={form.mothersMaidenName} onChange={(e) => update('mothersMaidenName', e.target.value)} /></Field>
          <Field number={17} label="Religion"><input className={inputClass} value={form.religion} onChange={(e) => update('religion', e.target.value)} /></Field>
          <Field number={18} label="Occupation"><input className={inputClass} value={form.occupation} onChange={(e) => update('occupation', e.target.value)} /></Field>
          <Field number={19} label="Monthly family net income"><input className={inputClass} value={form.monthlyIncome} onChange={(e) => update('monthlyIncome', e.target.value)} /></Field>
          <Field number={20} label="ID card presented"><input className={inputClass} value={form.idCardPresented} onChange={(e) => update('idCardPresented', e.target.value)} /></Field>
          <Field number={21} label="ID card number"><input className={inputClass} value={form.idCardNumber} onChange={(e) => update('idCardNumber', e.target.value)} /></Field>
          <Field number={22} label="Contact number">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Primary" className={inputClass} value={form.contactPrimary} onChange={(e) => update('contactPrimary', e.target.value)} />
              <input placeholder="Alternate" className={inputClass} value={form.contactAlternate} onChange={(e) => update('contactAlternate', e.target.value)} />
            </div>
          </Field>
        </div>
        <div className="mt-3 border border-t-0 border-line-soft p-3">
          <Field number={23} label="Permanent address">
            <input className={inputClass} placeholder="House/Block/Lot No., Street, Subdivision/Village, Barangay, City/Municipality, Province, Zipcode"
              value={form.permanentAddress} onChange={(e) => update('permanentAddress', e.target.value)} />
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-admin-dark">
              <input type="checkbox" checked={form.is4Ps} onChange={(e) => update('is4Ps', e.target.checked)} />
              24. Others — 4Ps Beneficiary
            </label>
            <Field label="IP — Type of ethnicity">
              <input className={inputClass} value={form.ipEthnicity} onChange={(e) => update('ipEthnicity', e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="rounded-none border-0 border-b border-line p-6 shadow-none">
        <div className="mb-2 flex items-center justify-between">
          <SectionHeader>25. Family information</SectionHeader>
        </div>
        <div className="mb-2 flex justify-end">
          <button onClick={addMemberRow} className="text-xs font-semibold text-admin-dark hover:underline">+ Add member</button>
        </div>
        <div className="overflow-x-auto border border-line-soft">
          <table className="w-full min-w-[700px] border-collapse text-xs">
            <thead>
              <tr className="bg-line-soft text-left text-ink">
                <th className="border border-line-soft px-2 py-1.5">Family members</th>
                <th className="border border-line-soft px-2 py-1.5">Relation to family head</th>
                <th className="border border-line-soft px-2 py-1.5">Birthdate</th>
                <th className="border border-line-soft px-2 py-1.5">Age</th>
                <th className="border border-line-soft px-2 py-1.5">Sex</th>
                <th className="border border-line-soft px-2 py-1.5">Highest educ. attainment</th>
                <th className="border border-line-soft px-2 py-1.5">Occupation</th>
                <th className="border border-line-soft px-2 py-1.5">Remarks</th>
                <th className="border border-line-soft px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {familyMembers.map((m, i) => (
                <tr key={i}>
                  <td className="border border-line-soft p-1"><input className="w-full px-1 py-1 outline-none" value={m.name} onChange={(e) => updateMember(i, 'name', e.target.value)} /></td>
                  <td className="border border-line-soft p-1"><input className="w-full px-1 py-1 outline-none" value={m.relation} onChange={(e) => updateMember(i, 'relation', e.target.value)} /></td>
                  <td className="border border-line-soft p-1"><input type="date" className="w-full px-1 py-1 outline-none" value={m.birthdate} onChange={(e) => updateMember(i, 'birthdate', e.target.value)} /></td>
                  <td className="border border-line-soft p-1"><input className="w-14 px-1 py-1 outline-none" value={m.age} onChange={(e) => updateMember(i, 'age', e.target.value)} /></td>
                  <td className="border border-line-soft p-1"><input className="w-16 px-1 py-1 outline-none" value={m.sex} onChange={(e) => updateMember(i, 'sex', e.target.value)} /></td>
                  <td className="border border-line-soft p-1"><input className="w-full px-1 py-1 outline-none" value={m.education} onChange={(e) => updateMember(i, 'education', e.target.value)} /></td>
                  <td className="border border-line-soft p-1"><input className="w-full px-1 py-1 outline-none" value={m.occupation} onChange={(e) => updateMember(i, 'occupation', e.target.value)} /></td>
                  <td className="border border-line-soft p-1"><input className="w-full px-1 py-1 outline-none" value={m.remarks} onChange={(e) => updateMember(i, 'remarks', e.target.value)} /></td>
                  <td className="border border-line-soft p-1 text-center">
                    {familyMembers.length > 1 && (
                      <button onClick={() => removeMemberRow(i)} className="text-admin hover:underline">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rounded-none border-0 border-b border-line p-6 shadow-none">
        <SectionHeader>26. No. of vulnerable family members</SectionHeader>
        <div className="grid grid-cols-2 gap-3 border border-line-soft p-3 sm:grid-cols-4">
          <Field label="No. of older persons"><input type="number" min="0" className={inputClass} value={form.vulnerableOlder} onChange={(e) => update('vulnerableOlder', e.target.value)} /></Field>
          <Field label="No. of pregnant women"><input type="number" min="0" className={inputClass} value={form.vulnerablePregnant} onChange={(e) => update('vulnerablePregnant', e.target.value)} /></Field>
          <Field label="No. of lactating women"><input type="number" min="0" className={inputClass} value={form.vulnerableLactating} onChange={(e) => update('vulnerableLactating', e.target.value)} /></Field>
          <Field label="No. of PWDs / medical condition/s"><input type="number" min="0" className={inputClass} value={form.vulnerablePwd} onChange={(e) => update('vulnerablePwd', e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="rounded-none border-0 border-b border-line p-6 shadow-none">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="border border-line-soft p-3">
            <div className="-mx-3 -mt-3 mb-3 bg-navy px-3 py-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-white">27. House ownership</h2>
            </div>
            <div className="flex gap-4 text-xs text-muted">
              {['Owner', 'Renter', 'Sharer'].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5">
                  <input type="radio" name="houseOwnership" checked={form.houseOwnership === opt} onChange={() => update('houseOwnership', opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="border border-line-soft p-3">
            <div className="-mx-3 -mt-3 mb-3 bg-navy px-3 py-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-white">28. Shelter damage classification</h2>
            </div>
            <div className="flex gap-4 text-xs text-muted">
              {['Partially Damaged', 'Totally Damaged'].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5">
                  <input type="radio" name="shelterDamage" checked={form.shelterDamage === opt} onChange={() => update('shelterDamage', opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-none border-0 border-b border-line p-6 shadow-none">
        <SectionHeader>Relief goods distributed</SectionHeader>
        <div className="grid grid-cols-1 gap-3 border border-line-soft p-3 sm:grid-cols-2">
          <Field label="Category">
            <select className={inputClass} value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, item: '', customItem: '' }))}>
              <option value="" disabled>Select category</option>
              {Object.keys(CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Item">
            <select className={inputClass} value={form.item} disabled={!form.category}
              onChange={(e) => update('item', e.target.value)}>
              <option value="" disabled>{form.category ? 'Select item' : 'Pick a category first'}</option>
              {(form.category ? [...CATEGORIES[form.category], 'Other (specify)'] : []).map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          {form.item === 'Other (specify)' && (
            <Field label="Specify item name">
              <input className={inputClass} value={form.customItem} onChange={(e) => update('customItem', e.target.value)} />
            </Field>
          )}
          <Field label="Quantity">
            <input type="number" min="0" className={inputClass} value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
          </Field>
          <Field label="Unit">
            <select className={inputClass} value={form.unit} onChange={(e) => update('unit', e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="rounded-none border-0 border-b border-line p-6 shadow-none">
        <SectionHeader>Registration details</SectionHeader>
        <div className="grid grid-cols-1 gap-3 border border-line-soft p-3 sm:grid-cols-3">
          <Field label="Date registered"><input type="date" className={inputClass} value={form.dateRegistered} onChange={(e) => update('dateRegistered', e.target.value)} /></Field>
          <Field label="Name/Signature of Brgy. Captain"><input className={inputClass} value={form.brgyCaptainName} onChange={(e) => update('brgyCaptainName', e.target.value)} /></Field>
          <Field label="Name/Signature of LSWDO"><input className={inputClass} value={form.lswdoName} onChange={(e) => update('lswdoName', e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="rounded-none border-0 p-6 shadow-none">
        <SectionHeader>Signature/Thumbmark of family head</SectionHeader>
        <div className="mb-4 border border-line-soft p-4">
          <div className="mb-2 text-xs font-bold text-ink">Hand device to recipient to confirm receipt</div>
          <ESignatureCanvas onSave={setSignature} />
          {signature && <p className="mt-2 text-xs font-semibold text-donor-dark">Thumbmark captured ✓</p>}
        </div>

        <Button
          variant="admin"
          disabled={!signature || !form.lastName || !form.firstName || !form.item || !form.category || !form.quantity}
          onClick={handleSubmit}
        >
          Confirm distribution
        </Button>

        {status === 'success' && (
          <div className="mt-3 rounded border border-beneficiary-dark bg-beneficiary-light p-3">
            <p className="text-xs font-semibold text-donor-dark">Distribution recorded.</p>
            <p className="mt-1 text-xs text-beneficiary-dark">Serial number: <span className="font-bold">{savedSerial}</span> — write this on the beneficiary's physical FACED card copy.</p>
          </div>
        )}
        {status === 'error' && <p className="mt-3 text-xs font-semibold text-admin">Could not save the record — please try again.</p>}

        <p className="mt-6 border-t border-line-soft pt-3 text-[10px] text-faint">
          29. Data Privacy Declaration: All data and information indicated herein shall be used for identification purposes for the implementation of DRRM programs, projects and activities and its disclosure shall be in compliance to Republic Act 10173 (Data Privacy Act of 2012).
        </p>
      </Card>
    </div>
  )
}

export default function RecordDistributionTab() {
  const [mode, setMode] = useState(null) // null | 'new' | 'existing'
  const [prefillSerial, setPrefillSerial] = useState('')

  return (
    <>
      <div className="mb-6 flex items-center gap-3 rounded-card bg-white/90 p-5 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <img src={dswdLogo} alt="DSWD logo" className="h-12 w-12 rounded-full object-contain" />
        <div>
          <h1 className="text-xl font-bold text-admin-dark">Record distribution</h1>
          <p className="text-xs text-faint">Family Assistance Card in Emergencies and Disasters (FACED)</p>
          <p className="mt-1 text-xs text-faint">Locked until the family head confirms with a thumbmark</p>
        </div>
      </div>

      <ModePicker mode={mode} onSelect={setMode} />

      {mode === 'existing' && (
        <ExistingBeneficiaryFlow
          onSwitchToNew={(serial) => {
            setPrefillSerial(serial)
            setMode('new')
          }}
        />
      )}

      {mode === 'new' && <NewFamilyForm key={prefillSerial} prefillSerial={prefillSerial} />}
    </>
  )
}