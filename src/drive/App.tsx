import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { sampleDriveAuth } from '../lib/firebase'
import Login from './pages/Login'
import AdminDrive from './pages/AdminDrive'
import CsSearch from './pages/CsSearch'

function useHash() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function ConfiguredApp() {
  const { session, role, loading } = useAuth()
  const hash = useHash()

  if (loading) return <p className="p-6">Memuat…</p>
  if (!session) return <Login />

  const logout = () => sampleDriveAuth.signOut()

  if (role !== 'admin' && role !== 'cs') {
    return (
      <div className="p-6 space-y-3">
        <p>Akun kamu belum diberi akses. Hubungi admin untuk mengaktifkan peran.</p>
        <button onClick={logout} className="underline">Keluar</button>
      </div>
    )
  }

  const page = hash === '#/cs' ? 'cs' : hash === '#/admin' && role === 'admin' ? 'admin' : role === 'admin' ? 'admin' : 'cs'

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="flex items-center gap-4 border-b border-slate-200 px-4 py-3 text-sm">
        <strong>Sobat Guru Digital</strong>
        <a href="#/cs" className={page === 'cs' ? 'font-semibold' : ''}>Cari sampel</a>
        {role === 'admin' && <a href="#/admin" className={page === 'admin' ? 'font-semibold' : ''}>Kelola Drive</a>}
        <button onClick={logout} className="ml-auto underline">Keluar</button>
      </nav>
      {page === 'admin' ? <AdminDrive /> : <CsSearch />}
    </div>
  )
}

export default function App() {
  return <ConfiguredApp />
}
