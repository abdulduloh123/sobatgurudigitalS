import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { sampleDriveAuth } from '../../lib/firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInWithEmailAndPassword(sampleDriveAuth, email.trim(), password)
    } catch {
      setError('Email atau kata sandi salah, atau metode Email/Password belum diaktifkan di Firebase.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h1 className="text-lg font-semibold">Masuk Sobat Guru Digital</h1>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" className="w-full border border-slate-300 rounded px-3 py-2" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Kata sandi" className="w-full border border-slate-300 rounded px-3 py-2" />
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={busy} className="w-full bg-slate-900 text-white rounded py-2 disabled:opacity-50">
          {busy ? 'Masuk…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
