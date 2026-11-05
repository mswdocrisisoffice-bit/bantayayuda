// src/lib/inventoryReturns.js
// Returning the items a household received back to inventory when their
// beneficiary record is archived. The database function does the matching
// and the inventory update atomically, so a distribution can never be
// returned twice.
import { supabase } from './supabase.js'

const BASE_COLUMNS =
  'id, household_id, household_head, contact_primary, barangay, category, item, quantity, unit, created_at, archived_at'
const TRACKED_COLUMNS = `${BASE_COLUMNS}, stock_returned_at`

const norm = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
const escapeLike = (value) => String(value || '').replace(/[%_\\]/g, '\\$&')

function mergeRows(results) {
  const map = new Map()
  results.forEach(({ data }) => (data || []).forEach((row) => map.set(row.id, row)))
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  )
}

async function runQueries(household, columns) {
  const queries = [
    supabase.from('distributions').select(columns).eq('household_id', household.id),
  ]

  if (household.household_head) {
    queries.push(
      supabase
        .from('distributions')
        .select(columns)
        .ilike('household_head', escapeLike(household.household_head))
    )
  }

  if (household.contact_number) {
    queries.push(
      supabase
        .from('distributions')
        .select(columns)
        .eq('contact_primary', household.contact_number)
    )
  }

  return Promise.all(queries)
}

/**
 * Loads the household's active distribution records that can still be
 * returned. `trackingReady` is false when the one-time database migration
 * (the `stock_returned_at` column) has not been applied yet.
 */
export async function loadReturnableDistributions(household) {
  const probe = await supabase.from('distributions').select('stock_returned_at').limit(1)
  const trackingReady = !(probe.error && probe.error.code === '42703')

  let results = await runQueries(household, trackingReady ? TRACKED_COLUMNS : BASE_COLUMNS)
  let firstError = results.find((r) => r.error)?.error || null

  if (firstError?.code === '42703' && trackingReady) {
    // The column was removed between the probe and the queries. Retry without
    // it so the household can still be archived (without a stock return).
    results = await runQueries(household, BASE_COLUMNS)
    firstError = results.find((r) => r.error)?.error || null
  }

  if (firstError) return { rows: [], trackingReady, error: firstError }

  const rows = mergeRows(results).filter((row) => {
    if (row.archived_at) return false
    if (trackingReady && row.stock_returned_at) return false

    // Only claim rows that truly belong to this household. Older rows have
    // no household_id, so fall back to an exact contact, or name + barangay.
    if (row.household_id) return row.household_id === household.id

    const sameContact =
      household.contact_number &&
      norm(row.contact_primary) === norm(household.contact_number)
    if (sameContact) return true

    const sameName =
      household.household_head &&
      norm(row.household_head) === norm(household.household_head)
    const sameBarangay =
      !row.barangay || !household.barangay || norm(row.barangay) === norm(household.barangay)

    return sameName && sameBarangay
  })

  return { rows, trackingReady, error: null }
}

/** Calls the database function that adds the stock back and marks the rows. */
export async function returnDistributionsToInventory(distributionIds) {
  const ids = (distributionIds || []).filter(Boolean)
  if (ids.length === 0) return { returned: 0, skipped: [] }

  const { data, error } = await supabase.rpc('return_distribution_stock', {
    p_distribution_ids: ids,
  })

  if (error) {
    const missing =
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      /could not find the function|function .* does not exist/i.test(error.message || '')

    return {
      error: {
        ...error,
        code: missing ? 'RETURN_FUNCTION_MISSING' : error.code,
        message: missing
          ? 'The stock-return database function is not installed yet.'
          : error.message,
      },
    }
  }

  return {
    returned: Number(data?.returned) || 0,
    skipped: Array.isArray(data?.skipped) ? data.skipped : [],
  }
}
