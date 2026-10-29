import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, Database, FileWarning, FolderOpen, LoaderCircle, Play, RefreshCw, RotateCcw, TriangleAlert } from 'lucide-react'
import { getIndexStatus, indexAction, runIndex, type RunStep } from '../lib/api'
import { formatDate, timeAgo } from '../lib/format'
import type { IndexStatus } from '../types'

const PHASES: Record<NonNullable<RunStep['phase']>, string> = {
  legacy: 'Membersihkan data persetujuan lama',
  scan: 'Memindai folder Google Drive',
  text: 'Membaca isi dokumen',
  cleanup: 'Membuang file yang sudah dihapus dari Drive',
  finalize: 'Menyusun katalog pencarian',
}
const STALE_DAYS = 3

export default function Manage() {
  const [status, setStatus] = useState<IndexStatus | null>(null)
  const [step, setStep] = useState<RunStep | null>(null)
  const [running, setRunning] = useState(false)
  const [stale, setStale] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const stopRef = useRef(false)

  const refresh = useCallback(() => getIndexStatus().then((value) => {
    setStatus(value)
    setStale(Boolean(value.meta && Date.now() - new Date(value.meta.indexedAt).getTime() > STALE_DAYS * 86_400_000))
  }).catch((cause: unknown) => {
    setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Gagal membaca status.' })
  }), [])

  useEffect(() => {
    void refresh()
    return () => { stopRef.current = true }
  }, [refresh])

  async function start() {
    setRunning(true); setMessage(null); stopRef.current = false
    try {
      const finished = await runIndex(setStep, () => stopRef.current)
      if (finished) setMessage({ tone: 'ok', text: 'Pencarian siap dipakai. Semua dokumen sudah dibaca.' })
    } catch (cause) {
      setMessage({ tone: 'error', text: `${cause instanceof Error ? cause.message : 'Proses berhenti.'} Tekan tombol lagi untuk melanjutkan dari titik terakhir.` })
    } finally {
      setRunning(false); setStep(null)
      await refresh()
    }
  }

  async function act(action: 'reset' | 'retry') {
    if (action === 'reset' && !confirm('Mulai ulang dari awal? Isi dokumen yang sudah dibaca tetap disimpan, jadi prosesnya akan lebih cepat.')) return
    try {
      const result = await indexAction(action)
      setStatus(result)
      setMessage({ tone: 'ok', text: action === 'retry' ? `${result.retried ?? 0} file akan dibaca ulang. Tekan Perbarui pencarian.` : 'Proses diatur ulang. Tekan Siapkan pencarian untuk memulai.' })
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Perintah gagal.' })
    }
  }

  const meta = status?.meta
  const live: RunStep | null = step ?? (status?.running ? { done: false, ...status.running, pending: status.pending } : null)
  const readTotal = (live?.textDone ?? 0) + (live?.textFailed ?? 0)
  const toRead = readTotal + (live?.pending ?? 0)
  const percent = live?.phase === 'text' && toRead ? Math.min(99, Math.round((readTotal / toRead) * 100)) : null

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:py-8">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-lg md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Khusus admin</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Kelola pencarian</h1>
            <p className="mt-1 max-w-xl text-sm text-blue-100">Sistem membaca semua dokumen Word di folder Drive agar CS bisa mencari isinya dan melihat cuplikan. Jalankan lagi setelah menambah atau mengubah banyak file.</p>
          </div>
          <button onClick={() => void start()} disabled={running}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-blue-950 shadow hover:bg-blue-50 disabled:cursor-wait disabled:opacity-80">
            {running ? <LoaderCircle size={18} className="animate-spin" /> : meta ? <RefreshCw size={18} /> : <Play size={18} />}
            {running ? 'Sedang berjalan…' : status?.running ? 'Lanjutkan proses' : meta ? 'Perbarui pencarian' : 'Siapkan pencarian'}
          </button>
        </div>
      </section>

      {message && <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${message.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
        {message.tone === 'error' ? <TriangleAlert size={18} className="mt-0.5 shrink-0" /> : <CircleCheck size={18} className="mt-0.5 shrink-0" />}
        <span>{message.text}</span>
      </div>}

      {stale && meta && !running && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" />
        Katalog terakhir diperbarui {timeAgo(meta.indexedAt)}. File baru tetap bisa dicari, tetapi perbarui pencarian agar filter folder dan cuplikan lebih cepat.
      </div>}

      {live && <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-950">
          {running && <LoaderCircle size={16} className="animate-spin" />}
          {live.busy ? 'Menunggu proses di tab/admin lain selesai…' : PHASES[live.phase ?? 'scan']}
          {!running && status?.running && <span className="font-normal text-blue-800">(terhenti, tekan Lanjutkan proses)</span>}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-blue-100">
          <div className={`h-full rounded-full bg-blue-700 transition-all ${percent === null && running ? 'w-1/3 animate-pulse' : ''}`} style={percent !== null ? { width: `${percent}%` } : undefined} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <Stat label="File ditemukan" value={live.scanned ?? 0} />
          <Stat label="Sudah dibaca" value={live.textDone ?? 0} />
          <Stat label="Gagal dibaca" value={live.textFailed ?? 0} />
        </div>
        <p className="text-xs text-blue-900/70">Biarkan halaman ini terbuka. Jika tertutup atau koneksi putus, tekan tombolnya lagi untuk melanjutkan dari titik terakhir.</p>
      </section>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={<Database size={19} />} tone="text-blue-700 bg-blue-50" label="Dokumen di katalog" value={meta?.fileCount ?? 0} />
        <Card icon={<CircleCheck size={19} />} tone="text-emerald-700 bg-emerald-50" label="Isi terbaca" value={meta?.readableCount ?? 0} />
        <Card icon={<FileWarning size={19} />} tone="text-amber-700 bg-amber-50" label="Gagal dibaca" value={meta?.failedCount ?? 0} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-2 text-slate-600"><RefreshCw size={19} /></div>
          <div className="text-sm font-bold text-slate-900">{meta ? timeAgo(meta.indexedAt) : 'Belum pernah'}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">{meta ? formatDate(meta.indexedAt) : 'Terakhir diperbarui'}</div>
        </div>
      </section>

      {meta && meta.folders.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><FolderOpen size={18} /> Isi per folder</h2>
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {meta.folders.map((item) => <a key={item.path} href={`?folder=${encodeURIComponent(item.path)}#/cari`}
            className={`flex justify-between rounded px-2 py-1 text-sm hover:bg-slate-50 ${item.path.includes('/') ? 'pl-6 text-slate-500' : 'font-medium text-slate-800'}`}>
            <span className="truncate">{item.path.split('/').pop()}</span><span className="text-slate-400">{item.count.toLocaleString('id-ID')}</span>
          </a>)}
        </div>
      </section>}

      {status && status.failed.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><FileWarning size={18} className="text-amber-600" /> File yang gagal dibaca</h2>
          <button onClick={() => void act('retry')} disabled={running} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Coba baca ulang</button>
        </div>
        <p className="mb-3 text-sm text-slate-500">File ini tetap bisa ditemukan lewat pencarian Google Drive, tetapi tanpa cuplikan. Biasanya karena file rusak, dikunci kata sandi, atau terlalu besar.</p>
        <ul className="divide-y divide-slate-100 text-sm">
          {status.failed.map((item) => <li key={item.id} className="py-2">
            <p className="font-medium text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">{item.path || 'Folder utama'} · {item.error}</p>
          </li>)}
        </ul>
      </section>}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
        <div>
          <p className="font-semibold text-slate-900">Proses macet atau ID folder diganti?</p>
          <p className="text-slate-500">Atur ulang untuk memulai pemindaian dari awal.</p>
        </div>
        <button onClick={() => void act('reset')} disabled={running} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50">
          <RotateCcw size={16} /> Atur ulang proses
        </button>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-white px-2 py-2"><div className="text-lg font-bold text-slate-900">{value.toLocaleString('id-ID')}</div><div className="text-xs text-slate-500">{label}</div></div>
}

function Card(props: { icon: ReactNode; tone: string; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${props.tone}`}>{props.icon}</div>
      <div className="text-2xl font-bold text-slate-900">{props.value.toLocaleString('id-ID')}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{props.label}</div>
    </div>
  )
}
