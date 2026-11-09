import { supabase } from './supabase.js'

/** Join the two name fields into the display name stored in records. */
export function staffNameFromParts(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ')
}

/** Split an old full name into first / last for the two-line profile form. */
export function splitStaffName(fullName) {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ')
  if (!clean) return { firstName: '', lastName: '' }
  const space = clean.indexOf(' ')
  if (space === -1) return { firstName: clean, lastName: '' }
  return { firstName: clean.slice(0, space), lastName: clean.slice(space + 1) }
}

/**
 * Read the signed-in user from the local session so this still works when the
 * device is offline.
 */
export async function getSessionUser() {
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.user || null
  } catch {
    return null
  }
}

/**
 * The verified staff identity of the signed-in administrator.
 *
 * The name lives on the authenticated account's metadata (set once from the
 * Staff profile page) and falls back to the profiles row for older accounts.
 */
export async function loadStaffIdentity() {
  const user = await getSessionUser()
  if (!user) return null

  const meta = user.user_metadata || {}
  let profile = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', user.id)
      .maybeSingle()
    profile = data || null
  } catch {
    // Offline — the session metadata below is enough.
  }

  let firstName = (meta.first_name || '').trim()
  let lastName = (meta.last_name || '').trim()
  const fallbackFull = (meta.full_name || '').trim() || (profile?.full_name || '').trim()

  if (!firstName && !lastName && fallbackFull) {
    const parts = splitStaffName(fallbackFull)
    firstName = parts.firstName
    lastName = parts.lastName
  }

  const fullName = staffNameFromParts(firstName, lastName) || fallbackFull

  return {
    id: user.id,
    email: user.email || profile?.email || '',
    role: profile?.role || 'admin',
    firstName,
    lastName,
    fullName,
    verifiedAt: meta.staff_name_verified_at || '',
    isVerified: Boolean(fullName),
  }
}

/**
 * Save the staff name once on the authenticated admin account. The profiles
 * row is mirrored when the database policy allows it so other staff see the
 * same name in the verified-staff list.
 */
export async function saveStaffIdentity({ firstName, lastName }) {
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()
  const fullName = staffNameFromParts(first, last)
  const verifiedAt = new Date().toISOString()

  const { data, error } = await supabase.auth.updateUser({
    data: {
      first_name: first,
      last_name: last,
      full_name: fullName,
      staff_name_verified_at: verifiedAt,
    },
  })
  if (error) return { error, fullName }

  const uid = data?.user?.id
  if (uid) {
    try {
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', uid)
    } catch {
      // The auth metadata above remains the source of truth for this account.
    }
  }

  return { error: null, fullName, verifiedAt }
}
