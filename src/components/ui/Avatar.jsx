const colors = ['bg-donor', 'bg-admin', 'bg-beneficiary', 'bg-navy']

function colorFor(name) {
  const code = (name || '?').charCodeAt(0) || 0
  return colors[code % colors.length]
}

function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export default function Avatar({ name, size = 'md' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg' }
  return (
    <div className={`flex items-center justify-center rounded-full font-bold text-white ${colorFor(name)} ${sizes[size]}`}>
      {initialsFor(name)}
    </div>
  )
}