const tones = {
  confirmed: 'bg-donor-light text-donor-dark',
  pending: 'bg-warn-bg text-warn-text',
  transit: 'bg-beneficiary-light text-beneficiary-dark',
  neutral: 'bg-line-soft text-muted',
}

export default function Badge({ children, tone = 'neutral' }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
