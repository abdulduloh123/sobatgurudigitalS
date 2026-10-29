import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, ChevronRight, Copy, Download, Eye, FileText, Folder, History, LoaderCircle, Search as SearchIcon, SearchX,
  Sparkles, TriangleAlert, User, X,
} from 'lucide-react'
import { downloadSample, getCatalogMeta, searchSamples } from '../lib/api'
import { TIERS, timeAgo } from '../lib/format'
import { Highlight, Passage, TypeBadge } from '../lib/ui'
import PreviewPanel from './PreviewPanel'
import type { CatalogMeta, SearchResponse, SearchResult } from '../types'

const RECENT_KEY = 'samples_recent'
const RECIPIENT_KEY = 'samples_recipient'
const EXAMPLES = ['manusia dan kehidupan', 'modul ajar IPA kelas 7', 'asesmen diagnostik', 'projek penguatan profil pelajar pancasila']

function readStorage<T>(storage: () => Storage, key: string, fallback: T): T {
  try {
    const raw = storage().getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeStorage(storage: () => Storage, key: string, value: unknown) {
  try { storage().setItem(key, JSON.stringify(value)) } catch { /* storage may be unavailable */ }
}

export default function Search({ isAdmin }: { isAdmin: boolean }) {
  const initial = useMemo(() => new URLSearchParams(window.location.search), [])
  const [input, setInput] = useState(initial.get('q') ?? '')
  const [q, setQ] = useState(initial.get('q') ?? '')
  const [folder, setFolder] = useState(initial.get('folder') ?? '')
  // Results are tagged with the query they belong to, so "loading" is simply a mismatch.
  const [data, setData] = useState<(SearchResponse & { key: string; error: string }) | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [meta, setMeta] = useState<CatalogMeta | null | undefined>(undefined)
  const [recent, setRecent] = useState<string[]>(() => readStorage(() => localStorage, RECENT_KEY, []))
  const [recipient, setRecipient] = useState<{ guru: string; catatan: string }>(() => readStorage(() => sessionStorage, RECIPIENT_KEY, { guru: '', catatan: '' }))
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getCatalogMeta().then(setMeta).catch(() => setMeta(null))
  }, [])

  // Type-to-search with a short pause, so CS does not need to press Enter.
  useEffect(() => {
    const value = input.trim()
    if (value === q) return
    if (value && value.length < 3) return
    const timer = setTimeout(() => setQ(value), 650)
    return () => clearTimeout(timer)
  }, [input, q])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (folder) params.set('folder', folder)
    const search = params.toString()
    history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }, [q, folder])

  const rememberQuery = useCallback((value: string) => {
    setRecent((current) => {
      const next = [value, ...current.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8)
      writeStorage(() => localStorage, RECENT_KEY, next)
      return next
    })
  }, [])

  const key = `${q}|${folder}`
  useEffect(() => {
    if (!q) return
    const controller = new AbortController()
    searchSamples(q, folder, 0, controller.signal).then((response) => {
      setData({ ...response, key: `${q}|${folder}`, error: '' })
      if (response.total) rememberQuery(q)
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      setData({ results: [], total: 0, offset: 0, hasMore: false, widened: false, key: `${q}|${folder}`, error: cause instanceof Error ? cause.message : 'Pencarian gagal.' })
    })
    return () => controller.abort()
  }, [q, folder, rememberQuery])

  const loading = Boolean(q) && data?.key !== key
  const current = !loading && data ? data : null
  const results: SearchResult[] = current?.results ?? []
  const total = current?.total ?? 0
  const hasMore = current?.hasMore ?? false
  const widened = current?.widened ?? false
  const error = current?.error ?? ''

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  function submit(value = input) {
    const next = value.trim()
    setInput(next)
    setQ(next)
    inputRef.current?.blur()
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const response = await searchSamples(q, folder, results.length)
      setData((previous) => previous && previous.key === key ? {
        ...previous,
        hasMore: response.hasMore,
        results: [...previous.results, ...response.results.filter((item) => !previous.results.some((existing) => existing.id === item.id))],
      } : previous)
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : 'Gagal memuat hasil berikutnya.')
    } finally {
      setLoadingMore(false)
    }
  }

  function updateRecipient(changes: Partial<typeof recipient>) {
    setRecipient((current) => {
      const next = { ...current, ...changes }
      writeStorage(() => sessionStorage, RECIPIENT_KEY, next)
      return next
    })
  }

  async function download(file: { id: string; name: string }) {
    setDownloading((current) => new Set(current).add(file.id))
    try {
      await downloadSample(file, recipient.guru, recipient.catatan)
      setDownloaded((current) => new Set(current).add(file.id))
      setToast(`Mengunduh ${file.name}`)
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : 'Gagal mengunduh.')
    } finally {
      setDownloading((current) => { const next = new Set(current); next.delete(file.id); return next })
    }
  }

  async function copyName(name: string) {
    try {
      await navigator.clipboard.writeText(name)
      setToast('Nama file disalin')
    } catch {
      setToast('Browser tidak mengizinkan menyalin otomatis.')
    }
  }

  const folders = meta?.folders ?? []
  const topFolders = folders.filter((item) => !item.path.includes('/'))
  const activeTop = folder.split('/')[0]
  const subFolders = activeTop ? folders.filter((item) => item.path.startsWith(`${activeTop}/`)) : []

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:py-8">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-lg md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Pusat sampel perangkat ajar</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Cari isi dokumen</h1>
        <p className="mt-1 text-sm text-blue-100">
          {meta === undefined ? 'Memuat status katalog…'
            : meta ? `${meta.fileCount.toLocaleString('id-ID')} dokumen Word siap dicari · diperbarui ${timeAgo(meta.indexedAt)}`
              : 'Ketik materi yang dicari guru. Sistem membaca isi dokumen, bukan hanya nama file.'}
        </p>

        <form onSubmit={(event) => { event.preventDefault(); submit() }} className="relative mt-5">
          <SearchIcon size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') { setInput(''); setQ('') } }}
            autoFocus
            enterKeyHint="search"
            placeholder="Contoh: manusia dan kehidupan"
            className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-24 text-base text-slate-900 shadow-inner outline-none ring-4 ring-transparent transition placeholder:text-slate-400 focus:ring-blue-300/50"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {input && <button type="button" onClick={() => { setInput(''); setQ(''); inputRef.current?.focus() }} aria-label="Hapus pencarian"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>}
            <button type="submit" className="rounded-lg bg-blue-950 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900">Cari</button>
          </div>
        </form>
        <p className="mt-2 hidden text-xs text-blue-200 md:block">Tekan <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono">/</kbd> untuk langsung mengetik, <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono">Esc</kbd> untuk menghapus.</p>
      </section>

      {meta === null && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" />
        <span>
          Pencarian belum disiapkan, jadi hasil pertama bisa lebih lambat dan filter folder belum tersedia.
          {isAdmin ? <> Buka <a href="#/kelola" className="font-semibold underline">Kelola pencarian</a> lalu tekan <b>Siapkan pencarian</b>.</> : ' Minta admin menyiapkan pencarian.'}
        </span>
      </div>}

      {topFolders.length > 0 && <section className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FolderChip label="Semua folder" active={!folder} onClick={() => setFolder('')} />
          {topFolders.map((item) => <FolderChip key={item.path} label={item.path} count={item.count} active={activeTop === item.path} onClick={() => setFolder(activeTop === item.path ? '' : item.path)} />)}
        </div>
        {subFolders.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1 pl-3">
          {subFolders.map((item) => <FolderChip key={item.path} small label={item.path.split('/').slice(1).join('/')} count={item.count}
            active={folder === item.path || folder.startsWith(`${item.path}/`)} onClick={() => setFolder(folder === item.path ? activeTop : item.path)} />)}
        </div>}
      </section>}
      {folder && !folders.some((item) => item.path === folder) && <button onClick={() => setFolder('')}
        className="inline-flex items-center gap-1.5 rounded-full bg-blue-950 px-3 py-1.5 text-xs font-semibold text-white">
        <Folder size={13} /> {folder} <X size={13} />
      </button>}

      <details className="group rounded-xl border border-slate-200 bg-white" open={Boolean(recipient.guru || recipient.catatan)}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-slate-700">
          <User size={16} className="text-slate-400" />
          {recipient.guru ? <span>Mengirim untuk <b>{recipient.guru}</b></span> : <span>Catat untuk guru siapa <span className="text-slate-400">(opsional, masuk ke log unduhan)</span></span>}
          <ChevronRight size={16} className="ml-auto text-slate-400 transition group-open:rotate-90" />
        </summary>
        <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
          <input value={recipient.guru} onChange={(event) => updateRecipient({ guru: event.target.value })} placeholder="Nama guru"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={recipient.catatan} onChange={(event) => updateRecipient({ catatan: event.target.value })} placeholder="Catatan, misal: sekolah / no. WA"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </details>

      {!q && <section className="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        {recent.length > 0 && <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><History size={14} /> Pencarian terakhir</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((item) => <span key={item} className="inline-flex items-center rounded-full bg-slate-100 text-sm text-slate-700">
              <button onClick={() => submit(item)} className="py-1.5 pl-3 pr-1 hover:text-blue-800">{item}</button>
              <button aria-label={`Hapus ${item}`} onClick={() => setRecent((current) => {
                const next = current.filter((value) => value !== item)
                writeStorage(() => localStorage, RECENT_KEY, next)
                return next
              })} className="rounded-full p-1.5 text-slate-400 hover:text-slate-700"><X size={13} /></button>
            </span>)}
          </div>
        </div>}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Sparkles size={14} /> Coba cari</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((item) => <button key={item} onClick={() => submit(item)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-800">{item}</button>)}
          </div>
        </div>
        <p className="text-sm text-slate-500">Tips: ketik 2–4 kata kunci materi. Dokumen yang memuat <b>frasa persis</b> tampil paling atas, disusul dokumen yang memuat semua kata.</p>
      </section>}

      {q && <section className="space-y-3" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <p className="text-slate-600">
            {loading ? 'Mencari di isi dokumen…'
              : error ? ''
                : total ? <><b className="text-slate-900">{total.toLocaleString('id-ID')}{total >= 100 ? '+' : ''}</b> dokumen untuk “{q}”{folder && <> di <b>{folder}</b></>}</>
                  : null}
          </p>
          {widened && !loading && total > 0 && <p className="text-xs text-amber-700">Hasil persis sedikit, jadi ikut ditampilkan dokumen yang memuat sebagian kata.</p>}
        </div>

        {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>}

        {loading && Array.from({ length: 3 }, (_, index) => <div key={index} className="animate-pulse space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="h-4 w-2/3 rounded bg-slate-200" /><div className="h-3 w-1/3 rounded bg-slate-100" />
          <div className="h-12 rounded bg-slate-100" />
        </div>)}

        {!loading && !error && total === 0 && <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <SearchX size={34} className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">Belum ada dokumen yang cocok</p>
          <ul className="mx-auto mt-2 max-w-md space-y-1 text-sm text-slate-500">
            <li>Periksa ejaan, misalnya “kehidupan” bukan “kehidupn”.</li>
            <li>Kurangi kata, misalnya cukup “ekosistem” daripada kalimat panjang.</li>
            <li>Dokumen yang baru diunggah ke Drive butuh beberapa menit sebelum bisa dicari.</li>
          </ul>
          {folder && <button onClick={() => setFolder('')} className="mt-4 rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white">Cari di semua folder</button>}
        </div>}

        {!loading && results.map((result) => <ResultCard key={result.id} result={result} q={q}
          downloading={downloading.has(result.id)} downloaded={downloaded.has(result.id)}
          onDownload={() => void download(result)} onPreview={() => setPreviewId(result.id)} onCopy={() => void copyName(result.name)}
          onFolder={(path) => setFolder(path)} />)}

        {!loading && hasMore && <button onClick={() => void loadMore()} disabled={loadingMore}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {loadingMore ? <><LoaderCircle size={16} className="animate-spin" /> Memuat…</> : 'Tampilkan hasil berikutnya'}
        </button>}
      </section>}

      {previewId && <PreviewPanel key={previewId} id={previewId} q={q} onClose={() => setPreviewId(null)}
        downloading={downloading.has(previewId)} onDownload={(file) => void download(file)} />}

      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  )
}

function FolderChip(props: { label: string; count?: number; active: boolean; small?: boolean; onClick: () => void }) {
  return (
    <button onClick={props.onClick}
      className={`shrink-0 rounded-full font-semibold transition ${props.small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} ${props.active ? 'bg-blue-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>
      {props.label}{props.count !== undefined && <span className="ml-1 opacity-60">{props.count.toLocaleString('id-ID')}</span>}
    </button>
  )
}

function ResultCard(props: {
  result: SearchResult
  q: string
  downloading: boolean
  downloaded: boolean
  onDownload: () => void
  onPreview: () => void
  onCopy: () => void
  onFolder: (path: string) => void
}) {
  const { result } = props
  const tier = TIERS[result.tier]
  const parts = result.path ? result.path.split('/') : []
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 hidden rounded-lg bg-blue-50 p-2 text-blue-700 sm:block"><FileText size={20} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge mimeType={result.mimeType} />
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tier.className}`}>{tier.label}</span>
            {result.occurrences > 1 && <span className="text-[11px] text-slate-500">muncul {result.occurrences.toLocaleString('id-ID')}×</span>}
          </div>
          <button onClick={props.onPreview} className="mt-1.5 block text-left font-semibold leading-snug text-slate-900 hover:text-blue-800">
            <Highlight text={result.name} query={props.q} />
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-0.5 text-xs text-slate-500">
            <Folder size={12} className="mr-0.5" />
            {parts.length ? parts.map((part, index) => <span key={index} className="inline-flex items-center">
              {index > 0 && <ChevronRight size={12} className="text-slate-300" />}
              <button onClick={() => props.onFolder(parts.slice(0, index + 1).join('/'))} className="hover:text-blue-700 hover:underline">{part}</button>
            </span>) : 'Folder utama'}
            <span className="ml-2 text-slate-400">· diubah {timeAgo(result.modifiedTime)}</span>
          </div>
        </div>
      </div>

      {result.passages.length > 0 ? <div className="mt-3 space-y-2">
        {result.passages.map((segments, index) => <div key={index} className="rounded-lg border-l-4 border-yellow-300 bg-yellow-50/50 px-3 py-2"><Passage segments={segments} /></div>)}
      </div> : <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        {result.readable ? 'Kata kunci cocok di judul atau metadata dokumen.' : 'Isi dokumen tidak bisa dibaca untuk cuplikan, tetapi Google Drive menandainya cocok.'}
      </p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={props.onDownload} disabled={props.downloading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-950 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
          {props.downloading ? <LoaderCircle size={16} className="animate-spin" /> : props.downloaded ? <Check size={16} /> : <Download size={16} />}
          {props.downloading ? 'Mengunduh…' : props.downloaded ? 'Unduh lagi' : 'Unduh'}
        </button>
        <button onClick={props.onPreview} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Eye size={16} /> Lihat semua cuplikan
        </button>
        <button onClick={props.onCopy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Copy size={16} /> Salin nama
        </button>
      </div>
    </article>
  )
}
