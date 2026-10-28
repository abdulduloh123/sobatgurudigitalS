import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, FileSearch, FolderSync, Search, XCircle } from 'lucide-react'
import { listAdminSamples, syncDrive, updateAdminSample } from '../lib/api'
import type { Sample } from '../types'

type Filter = 'semua' | 'draft' | 'disetujui' | 'hilang'
const JENIS = ['Bab', 'Prota', 'Promes', 'Modul Ajar', 'ATP', 'Soal', 'Lainnya']

function Field(props: {
  label: string
  value: string
  onChange: (v: string) => void
  list?: string[]
}) {
  const id = `dl-${props.label}`
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        list={props.list ? id : undefined}
        className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5"
      />
      {props.list && (
        <datalist id={id}>{props.list.map((o) => <option key={o} value={o} />)}</datalist>
      )}
    </label>
  )
}

export default function AdminDrive() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [filter, setFilter] = useState<Filter>('draft')
  const [selected, setSelected] = useState<Sample | null>(null)
  const [kataKunci, setKataKunci] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      setSamples(await listAdminSamples())
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Gagal membaca katalog Firebase.')
    }
  }, [])

  useEffect(() => {
    let alive = true
    void listAdminSamples().then((rows) => {
      if (alive) setSamples(rows)
    }).catch((error: unknown) => {
      if (alive) setMsg(error instanceof Error ? error.message : 'Gagal membaca katalog Firebase.')
    })
    return () => { alive = false }
  }, [])

  const shown = useMemo(() => samples.filter((s) => {
    if (filter === 'hilang') return s.is_missing
    if (filter === 'disetujui') return s.boleh_dikirim
    if (filter === 'draft') return !s.boleh_dikirim && !s.is_missing
    return true
  }).filter((s) => {
    const q = query.trim().toLowerCase()
    return !q || `${s.file_name} ${s.drive_path ?? ''} ${s.mapel ?? ''} ${s.topik ?? ''}`.toLowerCase().includes(q)
  }), [samples, filter, query])

  function pick(s: Sample) {
    setSelected({ ...s })
    setKataKunci((s.kata_kunci ?? []).join(', '))
    setMsg('')
  }

  function set<K extends keyof Sample>(key: K, value: Sample[K]) {
    setSelected((s) => (s ? { ...s, [key]: value } : s))
  }

  async function sync() {
    setBusy(true); setMsg('')
    try {
      const r = await syncDrive((total) => setMsg(`Sinkronisasi berjalan… ${total} file sudah diperiksa.`))
      setMsg(`Sinkron selesai: ${r.total} file di Drive, ${r.baru} baru, ${r.hilang} hilang.`)
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Sinkronisasi gagal.')
    }
    setBusy(false)
  }

  async function save() {
    if (!selected) return
    if (selected.boleh_dikirim) {
      if (selected.is_missing) return setMsg('File ini sudah tidak ada di Drive, tidak bisa disetujui.')
      if (!selected.jenjang || !selected.kelas || !selected.mapel || !selected.jenis_dokumen) {
        return setMsg('Lengkapi jenjang, kelas, mapel, dan jenis dokumen sebelum disetujui.')
      }
    }
    setBusy(true)
    try {
      await updateAdminSample(selected.id, {
      jenjang: selected.jenjang || null,
      kelas: selected.kelas || null,
      mapel: selected.mapel || null,
      versi_buku: selected.versi_buku || null,
      jenis_dokumen: selected.jenis_dokumen || null,
      topik: selected.topik || null,
      paket_produk: selected.paket_produk || null,
      kata_kunci: kataKunci.split(',').map((k) => k.trim()).filter(Boolean),
      boleh_dikirim: selected.boleh_dikirim,
      })
      setMsg('Perubahan disimpan.')
      await load()
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Gagal menyimpan ke Firebase.')
    } finally {
      setBusy(false)
    }
  }

  const tabs: [Filter, string][] = [
    ['draft', 'Belum disetujui'], ['disetujui', 'Disetujui'], ['hilang', 'Hilang dari Drive'], ['semua', 'Semua'],
  ]
  const counts = {
    total: samples.length,
    draft: samples.filter((s) => !s.boleh_dikirim && !s.is_missing).length,
    approved: samples.filter((s) => s.boleh_dikirim && !s.is_missing).length,
    missing: samples.filter((s) => s.is_missing).length,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-7">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-lg md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/10 p-3"><FolderSync size={25} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Pusat materi tim</p>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">Repositori sampel</h1>
              <p className="mt-2 max-w-xl text-sm text-blue-100">Temukan file dari Google Drive, rapikan informasinya, lalu pilih materi yang boleh dibagikan CS.</p>
            </div>
          </div>
          <button onClick={sync} disabled={busy}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-blue-950 shadow transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70">
            <FolderSync size={18} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Sedang sinkron…' : 'Sinkronkan Drive'}
          </button>
        </div>
      </section>

      {msg && <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('error') ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
        {msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('error') ? <XCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
        <span>{msg}</span>
      </div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total file', value: counts.total, icon: <FileSearch size={19} />, color: 'text-blue-700 bg-blue-50' },
          { label: 'Perlu diperiksa', value: counts.draft, icon: <FileSearch size={19} />, color: 'text-amber-700 bg-amber-50' },
          { label: 'Siap dibagikan', value: counts.approved, icon: <CheckCircle2 size={19} />, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Tidak ditemukan', value: counts.missing, icon: <XCircle size={19} />, color: 'text-slate-600 bg-slate-100' },
        ].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`mb-3 inline-flex rounded-lg p-2 ${item.color}`}>{item.icon}</div>
          <div className="text-2xl font-bold text-slate-900">{item.value.toLocaleString('id-ID')}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">{item.label}</div>
        </div>)}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-100 p-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama file, mapel, topik, atau folder…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map(([key, label]) => {
                const count = key === 'semua' ? counts.total : key === 'draft' ? counts.draft : key === 'disetujui' ? counts.approved : counts.missing
                return <button key={key} onClick={() => setFilter(key)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${filter === key ? 'bg-blue-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {label} <span className="ml-1 opacity-70">{count}</span>
                </button>
              })}
            </div>
          </div>
          <div className="max-h-[68vh] overflow-y-auto p-2">
            {shown.length === 0 ? <div className="px-5 py-12 text-center">
              <FileSearch size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">Belum ada file di bagian ini</p>
              <p className="mt-1 text-sm text-slate-500">Coba ganti filter atau sinkronkan Drive.</p>
            </div> : shown.map((sample) => <button key={sample.id} onClick={() => pick(sample)}
              className={`mb-1 w-full rounded-xl p-3 text-left transition ${selected?.id === sample.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-900">{sample.file_name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{sample.drive_path || 'Folder utama'}</p>
                  <p className="mt-2 text-xs text-slate-600">{[sample.jenjang, sample.kelas && `Kelas ${sample.kelas}`, sample.mapel].filter(Boolean).join(' · ') || 'Informasi materi belum dilengkapi'}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sample.is_missing ? 'bg-slate-100 text-slate-500' : sample.boleh_dikirim ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {sample.is_missing ? 'Tidak ditemukan' : sample.boleh_dikirim ? 'Siap dibagikan' : 'Perlu diperiksa'}
                </span>
              </div>
            </button>)}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-5">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Detail materi</p>
            <h2 className="mt-1 truncate font-bold text-slate-900">{selected?.file_name || 'Pilih file untuk mulai'}</h2>
          </div>
          {!selected ? <div className="p-8 text-center text-sm text-slate-500">
            <FileSearch size={30} className="mx-auto mb-3 text-slate-300" />Klik salah satu file di daftar untuk mengisi kategori dan statusnya.
          </div> : <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jenjang" value={selected.jenjang ?? ''} onChange={(v) => set('jenjang', v)} list={['SD', 'SMP', 'SMA', 'SMK']} />
              <Field label="Kelas" value={selected.kelas ?? ''} onChange={(v) => set('kelas', v)} />
              <Field label="Mata pelajaran" value={selected.mapel ?? ''} onChange={(v) => set('mapel', v)} />
              <Field label="Jenis dokumen" value={selected.jenis_dokumen ?? ''} onChange={(v) => set('jenis_dokumen', v)} list={JENIS} />
            </div>
            <Field label="Versi buku" value={selected.versi_buku ?? ''} onChange={(v) => set('versi_buku', v)} />
            <Field label="Bab atau topik" value={selected.topik ?? ''} onChange={(v) => set('topik', v)} />
            <Field label="Kata kunci (pisahkan dengan koma)" value={kataKunci} onChange={setKataKunci} />
            <Field label="Paket produk terkait" value={selected.paket_produk ?? ''} onChange={(v) => set('paket_produk', v)} />
            {selected.is_missing && <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">File tidak ditemukan di Drive. Sinkronkan lagi setelah file dipulihkan.</p>}
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${selected.boleh_dikirim ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'} ${selected.is_missing ? 'opacity-60' : ''}`}>
              <input type="checkbox" className="mt-0.5 accent-emerald-700" checked={selected.boleh_dikirim} disabled={selected.is_missing}
                onChange={(e) => set('boleh_dikirim', e.target.checked)} />
              <span><span className="block font-semibold text-slate-800">Siap dibagikan CS</span><span className="mt-0.5 block text-xs text-slate-500">CS dapat mencari dan mengirim file ini.</span></span>
            </label>
            <button onClick={save} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-3 font-semibold text-white transition hover:bg-blue-900 disabled:opacity-50">
              <Check size={18} /> Simpan perubahan
            </button>
          </div>}
        </div>
      </section>
    </div>
  )
}

