import { sampleDriveAuth } from '../../lib/firebase'
import type { Sample } from '../types'

async function authFetch(path: string, init: RequestInit = {}) {
  const token = await sampleDriveAuth.currentUser?.getIdToken()
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
  })
}

export async function listSamples(): Promise<Sample[]> {
  const res = await authFetch('/api/samples/list')
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Gagal memuat katalog sampel.')
  return json.samples as Sample[]
}

export async function syncDrive(): Promise<{ total: number; baru: number; hilang: number }> {
  const res = await authFetch('/api/admin/sync', { method: 'POST' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Sinkronisasi gagal.')
  return json
}

export async function downloadSample(sample: Sample, guru: string, catatan: string) {
  const res = await authFetch('/api/samples/download', {
    method: 'POST',
    body: JSON.stringify({ sampleId: sample.id, guru, catatan }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? 'Gagal mengunduh.')
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') ?? ''
  const m = /filename\*=UTF-8''([^;]+)/.exec(cd)
  const filename = m ? decodeURIComponent(m[1]) : sample.file_name

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
