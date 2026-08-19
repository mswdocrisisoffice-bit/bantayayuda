const variants = {
  donor: 'bg-donor hover:bg-donor-dark text-white',
  admin: 'bg-admin hover:bg-admin-dark text-white',
  beneficiary: 'bg-beneficiary hover:bg-beneficiary-dark text-white',
  neutral: 'bg-line-soft hover:bg-line text-ink',
}

export default function Button({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) {
  return (
    <button
      className={`w-full rounded-lg px-5 py-3 text-sm font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
