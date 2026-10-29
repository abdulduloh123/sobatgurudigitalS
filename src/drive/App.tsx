import { useEffect, useState } from 'react'
import { ArrowLeft, Database, LogOut, ScrollText, Search as SearchIcon } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { sampleDriveAuth } from '../lib/firebase'
import Login from './pages/Login'
import Search from './pages/Search'
import Manage from './pages/Manage'
import Logs from './pages/Logs'

type Page = 'cari' | 'kelola' | 'log'

function useHash() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function pageFor(hash: string, isAdmin: boolean): Page {
  if (!isAdmin) return 'cari'
  // '#/admin' is kept for older links from the dashboard.
  if (hash === '#/kelola' || hash === '#/admin') return 'kelola'
  if (hash === '#/log') return 'log'
  return 'cari'
}

function logout() {
  // Samples shares the dashboard session, so signing out here signs out of both.
  try { localStorage.removeItem('sobatguru_session') } catch { /* storage may be unavailable */ }
  void sampleDriveAuth.signOut()
}

export default function App() {
  const { session, role, name, loading } = useAuth()
  const hash = useHash()

  if (loading) return <p className="p-6 text-slate-600">Memuat…</p>
  if (!session) return <Login />

  if (role !== 'admin' && role !== 'cs') {
    return (
      <div className="space-y-3 p-6">
        <p>Akun kamu belum diberi akses. Hubungi admin untuk mengaktifkan peran.</p>
        <button onClick={logout} className="underline">Keluar</button>
      </div>
    )
  }

  const isAdmin = role === 'admin'
  const page = pageFor(hash, isAdmin)
  const tabs: [Page, string, typeof SearchIcon][] = isAdmin
    ? [['cari', 'Cari dokumen', SearchIcon], ['kelola', 'Kelola pencarian', Database], ['log', 'Log unduhan', ScrollText]]
    : []

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 text-sm">
          <a href="/" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100" title="Kembali ke dashboard">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Dashboard</span>
          </a>
          <strong className="mr-2 whitespace-nowrap text-blue-950">Samples</strong>
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(([key, label, Icon]) => <a key={key} href={`#/${key}`}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 ${page === key ? 'bg-blue-950 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon size={15} /> <span className="hidden md:inline">{label}</span>
            </a>)}
          </div>
          <span className="ml-auto hidden truncate text-slate-500 sm:inline">{name}{isAdmin ? ' · Admin' : ' · CS'}</span>
          <button onClick={logout} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 sm:ml-0">
            <LogOut size={16} /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </nav>
      {page === 'kelola' ? <Manage /> : page === 'log' ? <Logs /> : <Search isAdmin={isAdmin} />}
    </div>
  )
}
