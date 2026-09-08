export const AVATAR_PRESETS = [
  { id: 'sun', bg: '#F2A93B' },
  { id: 'leaf', bg: '#5B8C3E' },
  { id: 'wave', bg: '#3B7A9E' },
  { id: 'star', bg: '#A34B9E' },
  { id: 'heart', bg: '#C1443C' },
  { id: 'moon', bg: '#2E3B6E' },
  { id: 'flower', bg: '#D46FA0' },
  { id: 'mountain', bg: '#6B6B4E' },
]

const iconPaths = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  leaf: <path d="M11 20A7 7 0 0 1 4 13c0-5 5-11 9-11s3 8-1 12-1 6-1 6z" />,
  wave: <><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" /><path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" /></>,
  star: <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6z" />,
  heart: <path d="M12 20s-7-4.4-9.5-8.8C.7 8 2.4 4 6 4c2 0 3.5 1.2 4 2.5C10.5 5.2 12 4 14 4c3.6 0 5.3 4 3.5 7.2C15 15.6 12 20 12 20z" />,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  flower: <><circle cx="12" cy="12" r="2.5" /><path d="M12 2a3 3 0 0 1 0 6 3 3 0 0 1 0-6zM12 16a3 3 0 0 1 0 6 3 3 0 0 1 0-6zM2 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0zM16 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0z" /></>,
  mountain: <path d="M3 20l6-10 4 6 3-4 5 8z" />,
}

export function PresetAvatarIcon({ id, size = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[id] || iconPaths.sun}
    </svg>
  )
}