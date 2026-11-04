/*
  The red gradient page banner used across the admin pages
  (same look as the Overview banner and the Inventory header).

  props:
    title        page name
    description  one short line under the title
    icon         optional node shown in the tinted square
    children     optional buttons shown on the right (desktop) / below (phone)
    className    extra classes, e.g. "no-print mb-3"
*/
export default function PageBanner({
  title,
  description,
  icon,
  children,
  className = 'mb-4 sm:mb-6',
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-card bg-gradient-to-r from-admin-dark to-admin p-4 text-white shadow-[0_4px_14px_rgba(0,0,0,0.2)] sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 right-28 h-44 w-44 rounded-full bg-white/5" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:h-14 sm:w-14">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight sm:text-xl">{title}</h1>
            {description && (
              <p className="mt-0.5 text-[11px] leading-snug text-white/75 sm:text-xs">
                {description}
              </p>
            )}
          </div>
        </div>

        {children && (
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
