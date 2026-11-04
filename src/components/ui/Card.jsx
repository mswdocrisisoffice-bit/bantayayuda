export default function Card({ children, className = '', style, ...rest }) {
  return (
    <div
      className={`rounded-card bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
