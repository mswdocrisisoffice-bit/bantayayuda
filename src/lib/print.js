import { useEffect } from 'react'

/*
 * Reliable "print only this element" helper for a React SPA.
 *
 * The old approach (body * { visibility: hidden } + position:absolute) clipped
 * long documents and left fixed bars/backgrounds in the printout. Instead we
 * mark the ancestor chain of the print root and hide every sibling. The global
 * print rules in index.css then flatten the marked wrappers so the content can
 * flow across as many pages as it needs.
 */

let marked = []

export function markPrintArea(root) {
  unmarkPrintArea()
  if (!root || typeof document === 'undefined') return

  let node = root
  while (node && node !== document.body) {
    const parent = node.parentElement
    if (!parent) break

    if (node === root) {
      node.setAttribute('data-print-area', '')
    } else {
      node.setAttribute('data-print-keep', '')
    }
    marked.push(node)

    Array.from(parent.children).forEach((sib) => {
      if (sib === node) return
      if (sib.tagName === 'STYLE' || sib.tagName === 'SCRIPT' || sib.tagName === 'LINK') return
      sib.setAttribute('data-print-hide', '')
      marked.push(sib)
    })

    node = parent
  }
}

export function unmarkPrintArea() {
  marked.forEach((n) => {
    n.removeAttribute('data-print-keep')
    n.removeAttribute('data-print-hide')
    n.removeAttribute('data-print-area')
  })
  marked = []
}

/**
 * Mark `root` and open the browser's print dialog.
 * Returns a cleanup function (also runs automatically after printing).
 */
export function printArea(root) {
  if (!root || typeof window === 'undefined') {
    if (typeof window !== 'undefined') window.print()
    return () => {}
  }

  markPrintArea(root)

  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup)
    unmarkPrintArea()
  }
  window.addEventListener('afterprint', cleanup)

  // The marks are already applied synchronously, so print immediately. This
  // keeps the call inside the user's click gesture in every browser.
  window.print()

  return cleanup
}

/**
 * Keep Ctrl/Cmd+P working too: whenever the browser is about to print, mark
 * the supplied ref as the print area. Only mount one of these at a time.
 */
export function usePrintArea(ref) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const before = () => markPrintArea(ref.current)
    const after = () => unmarkPrintArea()

    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
      unmarkPrintArea()
    }
  }, [ref])
}
