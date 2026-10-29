export type Role = 'admin' | 'cs' | 'pending'

export type Segment = { text: string; hit?: true }
export type MatchTier = 'frasa' | 'semua' | 'sebagian' | 'judul'

export interface SearchResult {
  id: string
  name: string
  mimeType: string
  path: string
  modifiedTime: string
  readable: boolean
  tier: MatchTier
  occurrences: number
  passages: Segment[][]
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  offset: number
  hasMore: boolean
  widened: boolean
}

export interface Preview {
  id: string
  name: string
  mimeType: string
  path: string
  modifiedTime: string
  readable: boolean
  chars: number
  intro: string
  occurrences: number
  passages: Segment[][]
}

export interface FolderCount { path: string; count: number }

export interface CatalogMeta {
  fileCount: number
  readableCount: number
  failedCount: number
  folders: FolderCount[]
  indexedAt: string
}

export interface IndexStatus {
  meta: CatalogMeta | null
  running: {
    phase: 'legacy' | 'scan' | 'text' | 'cleanup' | 'finalize'
    scanned: number
    textDone: number
    textFailed: number
    startedAt: string
    active: boolean
  } | null
  pending: number
  failed: { id: string; name: string; path: string; error: string }[]
}

export interface DownloadLog {
  id: string
  fileName: string
  path: string | null
  userName: string
  guru: string | null
  catatan: string | null
  createdAt: string | null
}
