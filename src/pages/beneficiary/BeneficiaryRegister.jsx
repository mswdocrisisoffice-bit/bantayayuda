import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { supabase } from '../../lib/supabase.js'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
const icons = {
  beneficiary: <><path d="M9 21H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 12v7a2 2 0 0 1-2 2h-4" /><path d="M9 21v-6h6v6" /></>,
  pin: <><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  lock: <><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
}

const BARANGAYS = [
  'Alae', 'Damilag', 'Dahilayan', 'Dicklum', 'Guilang-guilang', 'Kalugmanan',
  'Lindaban', 'Lingion', 'Lunocan', 'Maluko', 'Mambatangan', 'Mampayag',
  'Minsuro', 'San Miguel', 'Sankanan', 'Santiago', 'Sinaad', 'Tankulan',
  'Ticala', 'Diclum', 'Agusan Canyon', 'Sampiano',
]

const emptyMember = { name: '', relation: '', age: '', sex: '', occupation: '' }

export default function BeneficiaryRegister() {
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    barangay: BARANGAYS[0],
    permanentAddress: '',
    householdSize: '',
    contactNumber: '',
    email: '',
    password: '',
    is4Ps: false,
  })
  const [familyMembers, setFamilyMembers] = useState([{ ...emptyMember }])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { role: 'beneficiary' } },
    })

    if (authError) {
      setLoading(false)
      setError(authError.message)
      return
    }

    const householdHead = [form.lastName, form.firstName, form.middleName].filter(Boolean).join(', ')

    const { error: dbError } = await supabase.from('beneficiaries').insert({
      id: data.user.id,
      household_head: householdHead,
      last_name: form.lastName,
      first_name: form.firstName,
      middle_name: form.middleName,
      barangay: form.barangay,
      permanent_address: form.permanentAddress,
      household_size: Number(form.householdSize),
      contact_number: form.contactNumber,
      is_4ps_beneficiary: form.is4Ps,
      family_members: familyMembers.filter((m) => m.name.trim() !== ''),
    })

    setLoading(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    navigate('/beneficiary/dashboard')
  }

  const inputClass = "w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-beneficiary"

  return (
    <div className="min-h-screen bg-cream pb-10">
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-beneficiary-light text-beneficiary-dark">
            <Icon path={icons.beneficiary} className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Register beneficiary household</h1>
            <p className="text-sm text-white/60">This creates your household's profile in the barangay registry</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6">
        <Card className="border-2 border-beneficiary-border p-8">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-beneficiary-dark">
              <Icon path={icons.beneficiary} className="h-4 w-4" />
              Household head
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input required placeholder="Last name" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className={inputClass} />
              <input required placeholder="First name" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className={inputClass} />
              <input placeholder="Middle name" value={form.middleName} onChange={(e) => update('middleName', e.target.value)} className={inputClass} />
            </div>

            <div className="mb-1 mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-beneficiary-dark">
              <Icon path={icons.pin} className="h-4 w-4" />
              Location
            </div>
            <select
              value={form.barangay}
              onChange={(e) => update('barangay', e.target.value)}
              className={inputClass}
            >
              {BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  Brgy. {b}
                </option>
              ))}
            </select>

            <input
              placeholder="Permanent address (House/Block/Lot No., Street, Purok)"
              value={form.permanentAddress}
              onChange={(e) => update('permanentAddress', e.target.value)}
              className={inputClass}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                required
                type="number"
                min="1"
                placeholder="Household size (number of members)"
                value={form.householdSize}
                onChange={(e) => update('householdSize', e.target.value)}
                className={inputClass}
              />
              <input
                required
                placeholder="Contact number"
                value={form.contactNumber}
                onChange={(e) => update('contactNumber', e.target.value)}
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={form.is4Ps} onChange={(e) => update('is4Ps', e.target.checked)} />
              We are a 4Ps beneficiary household
            </label>

            <div className="rounded-lg border border-line bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-beneficiary-dark">
                  <Icon path={icons.users} className="h-4 w-4" />
                  Family members (optional)
                </span>
                <button type="button" onClick={addMemberRow} className="text-xs font-semibold text-beneficiary-dark hover:underline">
                  + Add member
                </button>
              </div>
              <div className="space-y-2">
                {familyMembers.map((m, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                    <input placeholder="Name" value={m.name} onChange={(e) => updateMember(i, 'name', e.target.value)}
                      className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-beneficiary sm:col-span-2" />
                    <input placeholder="Relation" value={m.relation} onChange={(e) => updateMember(i, 'relation', e.target.value)}
                      className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-beneficiary" />
                    <input placeholder="Age" value={m.age} onChange={(e) => updateMember(i, 'age', e.target.value)}
                      className="rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-beneficiary" />
                    <div className="flex gap-1">
                      <input placeholder="Sex" value={m.sex} onChange={(e) => updateMember(i, 'sex', e.target.value)}
                        className="w-full rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-beneficiary" />
                      {familyMembers.length > 1 && (
                        <button type="button" onClick={() => removeMemberRow(i)} className="px-1 text-admin">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-1 mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-beneficiary-dark">
              <Icon path={icons.lock} className="h-4 w-4" />
              Account
            </div>
            <input
              required
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={inputClass}
            />

            <input
              required
              type="password"
              minLength={6}
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className={inputClass}
            />

            {error && <p className="text-xs font-semibold text-admin">{error}</p>}

            <Button type="submit" variant="beneficiary" disabled={loading}>
              {loading ? 'Please wait…' : 'Register household'}
            </Button>
          </form>

          <Link to="/" className="mt-4 block text-center text-xs text-faint">
            ← Back to home
          </Link>
        </Card>
      </div>
    </div>
  )
}