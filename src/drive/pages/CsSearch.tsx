import { useEffect, useMemo, useState } from 'react'
import { downloadSample, listSamples } from '../lib/api'
import type { Sample } from '../types'

const uniq = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean) as string[])].sort()

export default function CsSearch() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [q, setQ] = useState('')
  const [jenjang, setJenjang] = useState('')
  const [kelas, setKelas] = useState('')
  const [jenis, setJenis] = useState('')
  const [guru, setGuru] = useState('')
  const [catatan, setCatatan] = useState('')
  const [busyId, setBusyId] = useState('')
  const [msg, setMsg] = useState('')

  // Backend hanya mengirim katalog yang disetujui dan menyembunyikan ID Drive.
  useEffect(() => {
    let alive = true
    void listSamples().then((rows) => {
      if (!alive) return
      rows.sort((a, b) => `${a.mapel ?? ''}/${a.file_name}`.localeCompare(`${b.mapel ?? ''}/${b.file_name}`))
      setSamples(rows)
    }).catch((error: unknown) => {
      if (alive) setMsg(error instanceof Error ? error.message : 'Gagal membaca katalog Firebase.')
    })
    return () => { alive = false }
  }, [])

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return samples.filter((s) => {
      if (jenjang && s.jenjang !== jenjang) return false
      if (kelas && s.kelas !== kelas) return false
      if (jenis && s.jenis_dokumen !== jenis) return false
      const hay = [
        s.file_name, s.jenjang, `kelas ${s.kelas}`, s.mapel, s.versi_buku,
        s.jenis_dokumen, s.topik, s.paket_produk, ...(s.kata_kunci ?? []),
      ].join(' ').toLowerCase()
      return words.every((w) => hay.includes(w))
    })
  }, [samples, q, jenjang, kelas, jenis])

  async function unduh(s: Sample) {
    setBusyId(s.id); setMsg('')
    try {
      await downloadSample(s, guru, catatan)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal mengunduh.')
    }
    setBusyId('')
  }

  const select = (value: string, set: (v: string) => void, label: string, opts: string[]) => (
    <select value={value} onChange={(e) => set(e.target.value)} className="border border-slate-300 rounded px-2 py-2">
      <option value="">{label}</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Cari sampel perangkat</h1>

      <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
        placeholder="Contoh: IPA kelas 7 sistem organisasi kehidupan"
        className="w-full border border-slate-300 rounded px-3 py-2" />

      <div className="flex gap-2 flex-wrap">
        {select(jenjang, setJenjang, 'Semua jenjang', uniq(samples.map((s) => s.jenjang)))}
        {select(kelas, setKelas, 'Semua kelas', uniq(samples.map((s) => s.kelas)))}
        {select(jenis, setJenis, 'Semua jenis dokumen', uniq(samples.map((s) => s.jenis_dokumen)))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <input value={guru} onChange={(e) => setGuru(e.target.value)} placeholder="Nama guru (opsional, untuk catatan)"
          className="border border-slate-300 rounded px-3 py-2" />
        <input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan (opsional)"
          className="border border-slate-300 rounded px-3 py-2" />
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <p className="text-sm text-slate-500">{results.length} sampel ditemukan</p>

      <ul className="space-y-2">
        {results.map((s) => (
          <li key={s.id} className="border border-slate-200 rounded p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium break-words">{s.file_name}</div>
              <div className="text-sm text-slate-600">
                {[s.jenjang, s.kelas && `Kelas ${s.kelas}`, s.mapel, s.jenis_dokumen].filter(Boolean).join(', ')}
              </div>
              <div className="text-xs text-slate-500">
                {[s.versi_buku, s.topik, s.paket_produk && `Paket: ${s.paket_produk}`].filter(Boolean).join(', ')}
              </div>
            </div>
            <button onClick={() => unduh(s)} disabled={busyId === s.id}
              className="shrink-0 bg-slate-900 text-white rounded px-4 py-2 disabled:opacity-50">
              {busyId === s.id ? 'Mengunduh…' : 'Unduh'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
