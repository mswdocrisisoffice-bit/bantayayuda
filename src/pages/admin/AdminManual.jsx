import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import PageBanner from '../../components/ui/PageBanner.jsx'

/**
 * In-app user manual for MSWDO / LGU staff.
 * Written around the real labels inside the admin pages, so a staff member can
 * search for the button they see on screen and follow the steps.
 */

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}

const icons = {
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  print: <><path d="M6 9V2h12v7" /><rect x="6" y="14" width="12" height="8" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /></>,
  check: <path d="m20 6-11 11-5-5" />,
  tip: <><circle cx="12" cy="12" r="9" /><path d="M12 8v.5" /><path d="M12 11v5" /></>,
  warn: <><path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17v.5" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
  login: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  donations: <><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7c-1.5 0-4-1-4-3.2A2.3 2.3 0 0 1 10.3 2 3 3 0 0 1 12 3" /><path d="M12 7c1.5 0 4-1 4-3.2A2.3 2.3 0 0 0 13.7 2 3 3 0 0 0 12 3" /></>,
  beneficiaries: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3S15.5 16.4 15.5 20" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.9 13.8c2.8.4 4.6 2.6 4.6 6.2" /></>,
  distribution: <><rect x="1" y="7" width="13" height="10" rx="1" /><path d="M14 10h4l3 3v4h-3" /><circle cx="6" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></>,
  inventory: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>,
  reports: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  generator: <><path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M15 2v5h5" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
  archive: <><rect x="2.5" y="4" width="19" height="4.5" rx="1" /><path d="M4 8.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8.5" /><path d="M10 12.5h4" /></>,
  staff: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  offline: <><path d="M2 2l20 20" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M5 12a10 10 0 0 1 3-2" /><path d="M19 12a10 10 0 0 0-9-3" /><path d="M12 20v.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" /></>,
  wrench: <><path d="M14.7 6.3a4 4 0 0 0 5 5L21 21H3l7.7-7.7a4 4 0 0 0 4-7z" /></>,
}

const QUICK_START = [
  { label: 'Sign in', hint: 'Staff email and password, then set your PIN.' },
  { label: 'Verify your name', hint: 'Staff profile → Verify my name.' },
  { label: 'Record a donation', hint: 'Donations → Record donation.' },
  { label: 'Register a family', hint: 'Record distribution → Register new family.' },
  { label: 'Record the aid', hint: 'Signature, then Confirm distribution.' },
]

const SECTIONS = [
  {
    id: 'signing-in',
    title: 'Signing in and the PIN lock',
    icon: 'login',
    summary: 'Open the workspace, log in as staff, and lock the device when you leave.',
    steps: [
      'Open the admin login page and type your Staff email and Password, then tap Log in to workspace. Signing in needs an internet connection.',
      'Only accounts with the admin role are accepted. If your account is rejected, ask the system administrator to check your role.',
      'On a shared device, tap Set PIN (or Change PIN) and choose a 4–6 digit PIN. Use Lock whenever you step away.',
      'Unlock with your PIN. After five wrong attempts the screen waits 30 seconds before you can try again.',
      'If you forgot the PIN, tap Forgot PIN — sign in again. This needs internet.',
    ],
    tips: [
      'The workspace locks by itself after 5 minutes in the background.',
      'The PIN is stored on this device only. It is a convenience lock, not a replacement for your password.',
    ],
    warn: 'Never share your PIN or password. Every record you save carries the staff name that was signed in.',
  },
  {
    id: 'dashboard',
    title: 'Overview (Administrator dashboard)',
    icon: 'overview',
    summary: 'A live summary of donations, households, and barangay coverage.',
    steps: [
      'The three stat cards show Total donations recorded, Registered beneficiary households, and Barangays covered.',
      'Tap a card, or tap View details, to open its panel. Tap Hide details to close it again.',
      'Inside All donations, use the date filter to show only the period you need.',
      'The Live badge shows the last updated time. Numbers refresh every 30 seconds and whenever you return to the tab.',
      'Tap ↻ Refresh to reload right away.',
    ],
    tips: [
      'Barangay totals merge spelling variants (for example Alae, alae, and Brgy. ALAE count as one barangay).',
      'Archived donations, distributions, and households are already excluded from these numbers.',
    ],
    warn: null,
  },
  {
    id: 'donations',
    title: 'Recording and managing donations',
    icon: 'donations',
    summary: 'Enter a donation on behalf of a donor, and correct or archive it later.',
    steps: [
      'Open Donations → Record donation.',
      'In Who donated?, fill in the donor details. Leave the name as Anonymous if the donor prefers not to be named.',
      'In What was donated?, choose the category and item, then enter the quantity and unit. If the item is missing, use the custom category controls to add it.',
      'In Where from & who recorded it, enter the barangay and confirm the recorder.',
      'Tick Keep donor private to hide the entry from the public dashboard.',
      'Save the entry. Donations are saved as confirmed, so the stock in Inventory increases immediately.',
      'To fix a mistake, go to Inventory → find the item → View donors → Edit. To remove a wrong entry, use Archive there.',
      'Use Payment accounts to keep the list of donation channels up to date.',
    ],
    tips: [
      'No internet? The entry is saved on this device and uploads automatically when the connection is back.',
      'Archiving is reversible from the Archive page. Permanent deletion is not.',
    ],
    warn: 'Archiving a donation removes it from Inventory, reports, and the public dashboard at the same time.',
  },
  {
    id: 'beneficiaries',
    title: 'Beneficiary registry',
    icon: 'beneficiaries',
    summary: 'Find a household, correct its details, or archive it.',
    steps: [
      'Use the filter chips: All, Eligible, Recent aid, 4Ps, and Possible duplicates.',
      'Tap Edit to correct the household head, barangay, household size, or contact number.',
      'Tap Archive to remove a household that is no longer part of the program.',
      'In the archive window you can tick Return the items… to inventory, then confirm with Archive & return stock.',
    ],
    tips: [
      'Possible duplicates helps you spot the same family entered twice before you create another record.',
      'Anything archived here can be restored from the Archive page.',
    ],
    warn: 'If a household returned its items to inventory, restoring it later takes that stock out of inventory again.',
  },
  {
    id: 'distribution',
    title: 'Registering families and recording aid',
    icon: 'distribution',
    summary: 'The main field page: register a household, capture proof, and release the aid.',
    steps: [
      'Open Record distribution and choose a mode: Register new family, Existing beneficiary, or Create pending login.',
      'For a fast release to a family already in the list, use Quick distribution.',
      'Use Find record to search for a household that is already registered.',
      'Fill in the family details, then capture the beneficiary signature and thumbmark.',
      'Tap Confirm distribution to save the release. Stock is deducted from Inventory automatically.',
      'Entries that could not be uploaded appear in the waiting list. Tap Try now to retry them.',
    ],
    tips: [
      'Create pending login lets you register a household now and let them activate their own account later.',
      'The offline confirmation hint tells you when an entry is queued instead of saved online.',
    ],
    warn: 'An offline entry is not in the online database yet. Confirm the status pill says it was uploaded before you leave the site.',
  },
  {
    id: 'inventory',
    title: 'Inventory and stock details',
    icon: 'inventory',
    summary: 'See what is on hand and open the donations behind each item.',
    steps: [
      'The stat cards show Total items, Low stock ≤10, and Out of stock.',
      'Use the search box or the category chips to find an item.',
      'Tap View donors → on an item to open its stock details.',
      'Inside the window, Edit corrects a donation and Archive removes a wrong one.',
      'When an item has no active donations left, use Delete item from inventory to remove an empty or misspelled item.',
    ],
    tips: [
      'Stock goes up when a donation is saved and down when a distribution is confirmed. You do not adjust it by hand.',
      'Items at or below 10 are flagged as low stock so you can request a new requisition early.',
    ],
    warn: 'Archiving a donation is the correct way to fix a wrong entry. Deleting the item itself only removes the empty stock card.',
  },
  {
    id: 'reports',
    title: 'Reports and comments',
    icon: 'reports',
    summary: 'Print or export activity reports for a chosen period.',
    steps: [
      'Pick a quick date range or set your own dates. Days with activity shows how busy each day was.',
      'Switch between Charts & insights, Stock status, Beneficiaries, Barangay summary, Donors & comments, and Donor registry.',
      'Tap Export CSV to download the tab you are looking at, or Print report for a paper copy.',
      'In Donors & comments, use Reply to answer a donor or beneficiary, and Archive to hide an inappropriate comment.',
      'Distribution records can be corrected with Edit or removed with Archive.',
    ],
    tips: [
      'Exports follow the dates and tab selected on screen, so check both before sending a file.',
      'Comments and records you archive leave the active reports and appear in the Archive page.',
    ],
    warn: null,
  },
  {
    id: 'report-generator',
    title: 'Report generator',
    icon: 'generator',
    summary: 'Prepare the editable accomplishment report for printing or PDF.',
    steps: [
      'Open Report generator and fill in the editable template fields.',
      'Edit the accomplishment lists so they match the period you are reporting.',
      'Add photos to the photo slots and complete the signature blocks.',
      'Tap Print / Save as PDF when the report is ready.',
    ],
    tips: [
      'Signature and date lines are left blank on purpose so they can be signed by hand.',
    ],
    warn: 'Changes are only included if they are typed into the template before you print.',
  },
  {
    id: 'ris',
    title: 'Requisition (RIS)',
    icon: 'generator',
    summary: 'Create, issue, and track Requisition and Issue Slips.',
    steps: [
      'Filter the list by Draft, Issued, or Cancelled.',
      'Tap New RIS, fill in the request, then choose Save & preview or Save & mark as issued.',
      'Use View / Print to produce a paper copy, or Edit to correct a draft.',
      'Tap Mark issued when the items are actually released, or Cancel if the request will not push through.',
    ],
    tips: [
      'RIS numbers are generated automatically when you save, so leave the number field alone.',
    ],
    warn: 'Cancelling keeps the slip on record under Cancelled. It does not delete it.',
  },
  {
    id: 'archive',
    title: 'Archive, restore, and delete forever',
    icon: 'archive',
    summary: 'Review removed records, bring them back, or delete them permanently.',
    steps: [
      'Open Archive and choose All, Donations, Distributions, Beneficiaries, or Comments.',
      'Use the search box and the Newest / Oldest sort to find the record.',
      'Tap Restore to return a record to the active lists and reports.',
      'Tap Delete, then confirm with Yes, delete to remove it permanently.',
    ],
    tips: [
      'Restoring a donation makes it count in Inventory and reports again.',
      'Check the record twice before deleting — there is no undo.',
    ],
    warn: 'Delete forever cannot be undone. Restoring a household that had its stock returned will deduct that stock again.',
  },
  {
    id: 'staff-profile',
    title: 'Staff profile',
    icon: 'staff',
    summary: 'Set the name that appears on the records you save.',
    steps: [
      'Open Staff profile and enter your First name and Last name.',
      'Tap Verify my name to confirm the spelling is correct.',
      'Tap Save changes.',
      'Use Go to donations when you are ready to start recording.',
    ],
    tips: [
      'The page lists where your name is used, so you can check before saving.',
    ],
    warn: 'Your staff name appears on donations and distributions. Verify it before you record anything official.',
  },
  {
    id: 'offline',
    title: 'Offline mode and syncing',
    icon: 'offline',
    summary: 'Keep working without signal and upload once the connection returns.',
    steps: [
      'When there is no signal, the status pill says Offline — entries are saved on this device.',
      'Keep recording donations and distributions as usual. They are stored in a queue on the device.',
      'Tap Upload now to sync immediately, or wait — the app retries every 30 seconds.',
      'If an upload fails, the pill shows the failed count and the error. Fix the connection and retry.',
    ],
    tips: [
      'Open the app once while online before going to the field so the pages are cached.',
    ],
    warn: 'Do not clear the browser data or uninstall the app while entries are still waiting to upload.',
  },
  {
    id: 'public-view',
    title: 'What the public dashboard shows',
    icon: 'globe',
    summary: 'The public page only shows confirmed, public, non-archived donations.',
    steps: [
      'Visitors see the total donations, households, and served counts, plus the recent donations feed.',
      'Private donations stay hidden, and the donor shows as Anonymous where a name is not public.',
      'Donations you archive disappear from the public feed automatically.',
      'The feed refreshes every 60 seconds and shows an Updated time.',
    ],
    tips: [
      'If a visitor still sees an old entry, press Ctrl + Shift + R (hard refresh) to load the newest app version.',
    ],
    warn: 'Never write a household contact number or full address in the item or donor name fields — the public feed can show them.',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'wrench',
    summary: 'Quick fixes for the problems staff meet most often.',
    steps: [
      'Archive shows a message about a missing database update: ask the system administrator to run the donation archive migration in the Supabase SQL Editor, then try again.',
      'An archived donation is still on the public dashboard: wait one minute, then hard refresh the browser. The database policy and the app cache both need to update once.',
      'The PIN no longer works: use Forgot PIN — sign in again, which needs internet.',
      'Stock looks wrong after fixing a donation: open Inventory, find the item, and check the remaining active donations with View donors.',
      'Entries recorded offline are missing online: check the status pill, then tap Upload now.',
    ],
    tips: [
      'When reporting a problem, include the page name, what you tapped, and the exact message on screen.',
    ],
    warn: null,
  },
]

function Section({ section, open, onToggle }) {
  return (
    <Card className="overflow-hidden break-inside-avoid">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-line-soft/30 sm:p-5"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-admin-light text-admin-dark">
          <Icon path={icons[section.icon] || icons.book} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{section.title}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-faint sm:text-xs">{section.summary}</span>
        </span>
        <Icon
          path={icons.chevron}
          className={`mt-1 h-4 w-4 shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-line-soft px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <ol className="space-y-2">
            {section.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-line-soft text-[10px] font-bold text-muted">
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed text-muted sm:text-[13px]">{step}</span>
              </li>
            ))}
          </ol>

          {section.tips?.length > 0 && (
            <div className="rounded-lg border border-donor/20 bg-donor-light/40 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-donor-dark">
                <Icon path={icons.tip} className="h-3.5 w-3.5" />
                Good to know
              </div>
              <ul className="mt-1 space-y-1">
                {section.tips.map((tip, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-donor-dark sm:text-xs">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.warn && (
            <div className="flex gap-2 rounded-lg border border-warn-text/30 bg-warn-bg px-3 py-2">
              <Icon path={icons.warn} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn-text" />
              <p className="text-[11px] font-semibold leading-relaxed text-warn-text sm:text-xs">{section.warn}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function AdminManual() {
  const [query, setQuery] = useState('')
  const [openIds, setOpenIds] = useState(() => new Set([SECTIONS[0].id]))
  const [printing, setPrinting] = useState(false)

  // Printing should include every section, even the ones that are collapsed.
  useEffect(() => {
    const before = () => setPrinting(true)
    const after = () => setPrinting(false)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SECTIONS
    return SECTIONS.filter((s) =>
      [s.title, s.summary, ...s.steps, ...(s.tips || []), s.warn || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [query])

  function toggle(id) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function jumpTo(id) {
    setOpenIds((prev) => new Set(prev).add(id))
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <>
      <PageBanner
        title="User manual"
        description="How to use every admin page — search for the button you see on screen."
        icon={<Icon path={icons.book} className="h-6 w-6 sm:h-7 sm:w-7" />}
      >
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25"
        >
          <Icon path={icons.back} className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-admin-dark shadow-sm transition hover:bg-white/90"
        >
          <Icon path={icons.print} className="h-3.5 w-3.5" />
          Print manual
        </button>
      </PageBanner>

      {/* Quick start */}
      <Card className="mb-3 p-4 sm:mb-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-donor-light text-donor-dark">
            <Icon path={icons.check} className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-sm font-bold text-ink">Quick start</h2>
        </div>
        <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-2.5">
          {QUICK_START.map((item, i) => (
            <li key={item.label} className="rounded-lg border border-line-soft bg-line-soft/25 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-admin-dark">Step {i + 1}</div>
              <div className="mt-0.5 text-xs font-bold text-ink">{item.label}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-faint">{item.hint}</div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Search + jump links */}
      <div className="no-print sticky top-0 z-20 -mx-3 mb-3 bg-cream/95 px-3 py-2 backdrop-blur sm:mx-0 sm:rounded-card sm:px-3">
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            <Icon path={icons.search} className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the manual — e.g. archive, private, offline…"
            className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-xs text-ink shadow-sm outline-none transition focus:border-admin/50 focus:ring-2 focus:ring-admin/20 sm:text-sm"
          />
        </label>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jumpTo(s.id)}
              className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-semibold text-muted transition hover:border-admin/40 hover:text-admin-dark"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 sm:space-y-3">
        {results.map((section) => (
          <div key={section.id} id={section.id} className="scroll-mt-28">
            <Section
              section={section}
              open={printing || query.trim() !== '' || openIds.has(section.id)}
              onToggle={() => toggle(section.id)}
            />
          </div>
        ))}

        {results.length === 0 && (
          <Card className="p-5 text-center">
            <p className="text-sm font-semibold text-ink">No topic matched “{query}”.</p>
            <p className="mt-1 text-xs text-faint">
              Try a simpler word like archive, donation, distribution, stock, or offline.
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="no-print mt-3 rounded-lg bg-admin px-4 py-2 text-xs font-bold text-white transition hover:bg-admin-dark"
            >
              Clear search
            </button>
          </Card>
        )}
      </div>

      <Card className="mt-3 p-4 sm:mt-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">Still stuck?</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Ask the system administrator to check the database side. When reporting a problem, include the page you were
          on, the button you tapped, and the exact message that appeared.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg bg-admin px-4 py-2 text-xs font-bold text-white transition hover:bg-admin-dark"
          >
            <Icon path={icons.overview} className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <Link
            to="/admin/donations"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-bold text-muted transition hover:bg-line-soft/40"
          >
            Start recording donations
            <Icon path={icons.arrow} className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>
    </>
  )
}
