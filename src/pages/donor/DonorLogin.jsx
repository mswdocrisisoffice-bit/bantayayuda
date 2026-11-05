import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import { AVATAR_PRESETS, PresetAvatarIcon } from '../../components/ui/AvatarPresets.jsx'
import { supabase } from '../../lib/supabase.js'

const inputClass =
  'w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-donor focus:ring-2 focus:ring-donor/15'

export default function DonorLogin() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [avatarMode, setAvatarMode] = useState('preset') // 'preset' | 'upload'
  const [avatarPreset, setAvatarPreset] = useState(AVATAR_PRESETS[0].id)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isRegister) {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (authError) { setError(authError.message); return }
      navigate('/donor/dashboard')
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'donor',
          full_name: fullName,
          username,
          avatar_preset: avatarMode === 'preset' ? avatarPreset : null,
        },
      },
    })

    if (authError) {
      setLoading(false)
      setError(authError.message)
      return
    }

    const userId = data?.user?.id
    if (userId && avatarMode === 'upload' && avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
        await supabase.from('profiles').update({ avatar_url: publicUrlData.publicUrl }).eq('id', userId)
      }
    }

    setLoading(false)
    navigate('/donor/dashboard')
  }

  return (
    <AuthLayout
      role="donor"
      title={isRegister ? 'Register as donor' : 'Donor login'}
      subtitle={isRegister ? 'Create your donor account' : 'Log in to track your donations'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {isRegister && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Full name</label>
              <input required placeholder="e.g. Maria Santos" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Username</label>
              <input required placeholder="e.g. maria_santos" value={username} onChange={(e) => setUsername(e.target.value)}
                className={inputClass} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Avatar</label>
              <div className="mb-2 flex gap-2">
                <button type="button" onClick={() => setAvatarMode('preset')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${avatarMode === 'preset' ? 'bg-donor text-white shadow-sm' : 'bg-line-soft text-muted hover:bg-line'}`}>
                  Pick an avatar
                </button>
                <button type="button" onClick={() => setAvatarMode('upload')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${avatarMode === 'upload' ? 'bg-donor text-white shadow-sm' : 'bg-line-soft text-muted hover:bg-line'}`}>
                  Upload photo
                </button>
              </div>

              {avatarMode === 'preset' && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {AVATAR_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setAvatarPreset(p.id)}
                      className={`flex aspect-square w-full items-center justify-center rounded-xl ring-2 transition hover:scale-105 ${
                        avatarPreset === p.id ? 'ring-donor ring-offset-2' : 'ring-transparent'
                      }`}
                      style={{ background: p.bg }}
                    >
                      <PresetAvatarIcon id={p.id} size={22} />
                    </button>
                  ))}
                </div>
              )}

              {avatarMode === 'upload' && (
                <div className="flex items-center gap-3">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="h-14 w-14 rounded-full object-cover ring-2 ring-donor/30" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-line-soft text-[10px] text-faint">
                      No photo
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange}
                    className="min-w-0 flex-1 text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-donor file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
                </div>
              )}
            </div>
          </>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Email address</label>
          <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
            className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Password</label>
          <input type="password" required minLength={6} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)}
            className={inputClass} />
        </div>
        {error && <p className="rounded-lg bg-admin-light px-3 py-2 text-xs font-semibold text-admin-dark">{error}</p>}
        <Button type="submit" variant="donor" disabled={loading}>
          {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in to my account'}
        </Button>
      </form>

      <button onClick={() => setIsRegister((v) => !v)} className="mt-4 w-full text-center text-sm font-semibold text-donor-dark hover:underline">
        {isRegister ? 'Already have an account? Log in' : "Don't have an account? Register"}
      </button>

      <Link to="/" className="mt-3 block text-center text-xs text-faint sm:hidden">
        ← Back to home
      </Link>
    </AuthLayout>
  )
}
