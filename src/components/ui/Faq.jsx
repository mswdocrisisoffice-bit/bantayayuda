import { useState } from 'react'

/**
 * Simple, accessible FAQ accordion used by the donor and beneficiary guides.
 * `items` is an array of { q, a } objects.
 */
export default function Faq({ items = [], accent = '#1d5fa8' }) {
  const [open, setOpen] = useState(null)

  return (
    <div className="divide-y divide-line-soft">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-ink">{item.q}</span>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-sm font-bold leading-none"
                style={{ color: accent }}
                aria-hidden="true"
              >
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && <p className="pb-4 pr-9 text-xs leading-relaxed text-muted">{item.a}</p>}
          </div>
        )
      })}
    </div>
  )
}
