export default function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-card bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </div>
  )
}
