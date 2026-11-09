import { supabase } from './supabase.js'

/**
 * Load the distributions that belong to a household.
 *
 * `distributions` rows are not always tagged with `household_id` (older records
 * only carry the household head or contact number), so we try every identifier
 * the household has on file and merge the results without duplicates.
 */
export async function fetchBeneficiaryAid(userId, beneficiary) {
  if (!userId) return []

  const queries = [
    supabase.from('distributions').select('*').eq('household_id', userId),
  ]

  if (beneficiary?.household_head) {
    queries.push(
      supabase
        .from('distributions')
        .select('*')
        .ilike('household_head', beneficiary.household_head)
    )
  }

  const contacts = [...new Set(
    [beneficiary?.contact_number, beneficiary?.phone]
      .map((c) => String(c || '').trim())
      .filter(Boolean)
  )]
  contacts.forEach((contact) => {
    queries.push(
      supabase
        .from('distributions')
        .select('*')
        .eq('contact_primary', contact)
    )
  })

  const results = await Promise.all(queries)
  const merged = new Map()
  results.forEach(({ data }) => (data || []).forEach((row) => merged.set(row.id, row)))

  return Array.from(merged.values()).sort((a, b) => {
    const aDate = new Date(a.created_at || a.distributed_at || 0)
    const bDate = new Date(b.created_at || b.distributed_at || 0)
    return bDate - aDate
  })
}
