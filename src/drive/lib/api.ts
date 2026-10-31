import { sampleDriveAuth } from '../../lib/firebase'
import type { CatalogMeta, DownloadLog, IndexStatus, Preview, SearchMiss, SearchResponse } from '../types'

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

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try {
    json = JSON.parse(text)
  } catch {
    // Vercel may return a non-JSON error page if the function fails to start or times out.
  }
  if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : `${fallback} (HTTP ${res.status}).`)
  return json as T
}

export async function searchSamples(q: string, folder: string, offset: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ q, offset: String(offset) })
  if (folder) params.set('folder', folder)
  const res = await authFetch(`/api/samples/search?${params}`, { signal })
  return readJson<SearchResponse>(res, 'Pencarian gagal')
}

export async function previewSample(id: string, q: string) {
  const res = await authFetch(`/api/samples/preview?${new URLSearchParams({ id, q })}`)
  return readJson<Preview>(res, 'Gagal membuka pratinjau')
}

export async function getCatalogMeta() {
  const res = await authFetch('/api/samples/meta')
  return (await readJson<{ meta: CatalogMeta | null }>(res, 'Gagal membaca status katalog')).meta
}

export async function downloadSample(file: { id: string; name: string }, guru: string, catatan: string, query: string) {
  const res = await authFetch('/api/samples/download', {
    method: 'POST',
    body: JSON.stringify({ id: file.id, guru, catatan, query }),
  })
  if (!res.ok) await readJson(res, 'Gagal mengunduh')
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') ?? ''
  const m = /filename\*=UTF-8''([^;]+)/.exec(cd)
  const filename = m ? decodeURIComponent(m[1]) : file.name

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Some browsers cancel the download if the URL is revoked immediately.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function getIndexStatus() {
  return readJson<IndexStatus>(await authFetch('/api/admin/samples/prepare'), 'Gagal membaca status')
}

export type RunStep = {
  done: boolean
  busy?: boolean
  phase?: NonNullable<IndexStatus['running']>['phase']
  scanned?: number
  textDone?: number
  textFailed?: number
  pending?: number
}

/** Keeps calling the chunked index job until it reports completion. */
export async function runIndex(onStep: (step: RunStep) => void, shouldStop: () => boolean) {
  while (!shouldStop()) {
    const res = await authFetch('/api/admin/samples/prepare', { method: 'POST', body: JSON.stringify({ action: 'run' }) })
    const step = await readJson<RunStep>(res, 'Gagal menyiapkan pencarian')
    onStep(step)
    if (step.done) return true
    if (step.busy) await new Promise((resolve) => setTimeout(resolve, 4000))
  }
  return false
}

export async function indexAction(action: 'reset' | 'retry') {
  const res = await authFetch('/api/admin/samples/prepare', { method: 'POST', body: JSON.stringify({ action }) })
  return readJson<IndexStatus & { retried?: number }>(res, 'Gagal menjalankan perintah')
}

export async function listDownloadLogs() {
  const res = await authFetch('/api/admin/samples/logs')
  return readJson<{ logs: DownloadLog[]; misses: SearchMiss[] }>(res, 'Gagal memuat log')
}
