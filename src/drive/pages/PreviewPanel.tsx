import { useEffect, useState } from 'react'
import { Download, Folder, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { previewSample } from '../lib/api'
import { formatDate } from '../lib/format'
import { Passage, TypeBadge } from '../lib/ui'
import type { Preview } from '../types'

export default function PreviewPanel(props: {
  id: string
  q: string
  downloading: boolean
  onClose: () => void
  onDownload: (file: { id: string; name: string }) => void
}) {
  const { id, q, onClose } = props
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')

  // The parent remounts this panel per file (key={id}), so no state reset is needed here.
  useEffect(() => {
    let alive = true
    void previewSample(id, q).then((value) => { if (alive) setPreview(value) })
      .catch((cause: unknown) => { if (alive) setError(cause instanceof Error ? cause.message : 'Gagal membuka pratinjau.') })
    return () => { alive = false }
  }, [id, q])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Pratinjau dokumen" onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            {preview && <TypeBadge mimeType={preview.mimeType} />}
            <h2 className="mt-1 break-words font-bold text-slate-900">{preview?.name ?? 'Memuat dokumen…'}</h2>
            {preview && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Folder size={12} /> {preview.path || 'Folder utama'} · diubah {formatDate(preview.modifiedTime)}</p>}
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><TriangleAlert size={18} className="shrink-0" />{error}</div>}
          {!preview && !error && <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" /> Membaca isi dokumen…</div>}
          {preview && !preview.readable && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Isi dokumen ini tidak bisa dibaca untuk pratinjau. File tetap bisa diunduh.</p>}

          {preview && preview.passages.length > 0 && <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bagian yang cocok dengan “{q}” {preview.occurrences > preview.passages.length && <span className="normal-case tracking-normal text-slate-400">(menampilkan {preview.passages.length} dari {preview.occurrences.toLocaleString('id-ID')})</span>}
            </h3>
            <ol className="space-y-2">
              {preview.passages.map((segments, index) => <li key={index} className="flex gap-3 rounded-lg border-l-4 border-yellow-300 bg-yellow-50/50 px-3 py-2">
                <span className="mt-0.5 text-xs font-bold text-yellow-700">{index + 1}</span>
                <Passage segments={segments} />
              </li>)}
            </ol>
          </section>}

          {preview?.intro && <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Awal dokumen</h3>
            <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">{preview.intro}{preview.chars > preview.intro.length && ' …'}</p>
          </section>}
        </div>

        <footer className="border-t border-slate-200 px-5 py-3">
          <button disabled={!preview || props.downloading} onClick={() => preview && props.onDownload(preview)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-3 font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
            {props.downloading ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}
            {props.downloading ? 'Mengunduh…' : 'Unduh dokumen'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
