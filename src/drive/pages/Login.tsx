import { useState, type FormEvent } from 'react'
import { signInWithCustomToken } from 'firebase/auth'
import { sampleDriveAuth } from '../../lib/firebase'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/internal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string; token?: string }
      if (!response.ok || typeof result.token !== 'string') {
        throw new Error(result.error ?? 'Username atau kata sandi salah.')
      }
      await signInWithCustomToken(sampleDriveAuth, result.token)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal masuk. Periksa koneksi lalu coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Masuk ke Samples</h1>
          <p className="mt-1 text-sm text-slate-600">Gunakan username dan kata sandi dashboard Sobat Guru Digital.</p>
        </div>
        <label className="block space-y-1 text-sm font-medium">
          <span>Username</span>
          <input type="text" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="Masukkan username" className="w-full border border-slate-300 rounded px-3 py-2 font-normal" />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Kata sandi</span>
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Kata sandi dashboard" className="w-full border border-slate-300 rounded px-3 py-2 font-normal" />
        </label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={busy} className="w-full bg-slate-900 text-white rounded py-2 disabled:opacity-50">
          {busy ? 'Memeriksa akun…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
