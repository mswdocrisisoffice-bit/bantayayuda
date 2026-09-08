import { AVATAR_PRESETS, PresetAvatarIcon } from './AvatarPresets.jsx'

const colors = ['bg-donor', 'bg-admin', 'bg-beneficiary', 'bg-navy']
const sizeClasses = { sm: 'h-8 w-8 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg' }
const iconPx = { sm: 14, md: 22, lg: 30 }

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

export default function Avatar({ name, avatarUrl, avatarPreset, size = 'md' }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        className={`rounded-full object-cover ${sizeClasses[size]}`}
      />
    )
  }

  if (avatarPreset) {
    const preset = AVATAR_PRESETS.find((p) => p.id === avatarPreset)
    if (preset) {
      return (
        <div
          className={`flex items-center justify-center rounded-full ${sizeClasses[size]}`}
          style={{ background: preset.bg }}
        >
          <PresetAvatarIcon id={preset.id} size={iconPx[size]} />
        </div>
      )
    }
  }

  return (
    <div className={`flex items-center justify-center rounded-full font-bold text-white ${colorFor(name)} ${sizeClasses[size]}`}>
      {initialsFor(name)}
    </div>
  )
}