import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import { sampleDriveDb } from '../../lib/firebase'
import { syncDrive } from '../lib/api'
import type { Sample } from '../types'

type Filter = 'semua' | 'draft' | 'disetujui' | 'hilang'
const JENIS = ['Bab', 'Prota', 'Promes', 'Modul Ajar', 'ATP', 'Soal', 'Lainnya']

async function fetchSamples(): Promise<Sample[]> {
  const snapshot = await getDocs(collection(sampleDriveDb, 'driveSamples'))
  const rows = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as Sample)
  rows.sort((a, b) => `${a.drive_path ?? ''}/${a.file_name}`.localeCompare(`${b.drive_path ?? ''}/${b.file_name}`))
  return rows
}

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

  const load = useCallback(async () => {
    try {
      setSamples(await fetchSamples())
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Gagal membaca katalog Firebase.')
    }
  }, [])

  useEffect(() => {
    let alive = true
    void fetchSamples().then((rows) => {
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
  }), [samples, filter])

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
      const r = await syncDrive()
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
      await updateDoc(doc(sampleDriveDb, 'driveSamples', selected.id), {
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

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Repositori sampel (Google Drive)</h1>
        <button onClick={sync} disabled={busy} className="bg-slate-900 text-white rounded px-4 py-2 disabled:opacity-50">
          {busy ? 'Memproses…' : 'Sinkronkan dari Drive'}
        </button>
      </div>
      {msg && <p className="mb-3 text-sm bg-amber-50 border border-amber-200 rounded px-3 py-2">{msg}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex gap-2 mb-2 flex-wrap">
            {tabs.map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1 rounded border text-sm ${filter === k ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>
          <ul className="border border-slate-200 rounded divide-y max-h-[70vh] overflow-auto">
            {shown.length === 0 && <li className="p-3 text-sm text-slate-500">Tidak ada file di daftar ini.</li>}
            {shown.map((s) => (
              <li key={s.id}>
                <button onClick={() => pick(s)}
                  className={`w-full text-left p-3 hover:bg-slate-50 ${selected?.id === s.id ? 'bg-slate-100' : ''}`}>
                  <div className="text-sm font-medium">{s.file_name}</div>
                  <div className="text-xs text-slate-500">{s.drive_path || '(root)'}</div>
                  <div className="text-xs mt-1">
                    {s.boleh_dikirim ? 'Boleh dikirim' : s.is_missing ? 'Hilang dari Drive' : 'Belum disetujui'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-slate-200 rounded p-4">
          {!selected ? (
            <p className="text-sm text-slate-500">Pilih file di sebelah kiri untuk mengisi data dan menyetujuinya.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium break-all">{selected.file_name}</p>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Jenjang" value={selected.jenjang ?? ''} onChange={(v) => set('jenjang', v)} list={['SD', 'SMP', 'SMA', 'SMK']} />
                <Field label="Kelas" value={selected.kelas ?? ''} onChange={(v) => set('kelas', v)} />
                <Field label="Mapel" value={selected.mapel ?? ''} onChange={(v) => set('mapel', v)} />
              </div>
              <Field label="Versi buku" value={selected.versi_buku ?? ''} onChange={(v) => set('versi_buku', v)} />
              <Field label="Jenis dokumen" value={selected.jenis_dokumen ?? ''} onChange={(v) => set('jenis_dokumen', v)} list={JENIS} />
              <Field label="Bab / topik" value={selected.topik ?? ''} onChange={(v) => set('topik', v)} />
              <Field label="Kata kunci (pisahkan koma)" value={kataKunci} onChange={setKataKunci} />
              <Field label="Paket produk terkait" value={selected.paket_produk ?? ''} onChange={(v) => set('paket_produk', v)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.boleh_dikirim} disabled={selected.is_missing}
                  onChange={(e) => set('boleh_dikirim', e.target.checked)} />
                Disetujui, CS boleh mengirim file ini ke guru
              </label>
              <button onClick={save} disabled={busy} className="bg-slate-900 text-white rounded px-4 py-2 disabled:opacity-50">
                Simpan perubahan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
