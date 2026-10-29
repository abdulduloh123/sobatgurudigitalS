import WordExtractor from 'word-extractor'
import { drive, firestore, isQuotaError } from './clients.js'

export const WORD_MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  gdoc: 'application/vnd.google-apps.document',
} as const
export const SEARCHABLE_MIMES: string[] = Object.values(WORD_MIME)
export const FOLDER_MIME = 'application/vnd.google-apps.folder'

export const sampleFiles = () => firestore.collection('sampleFiles')
export const sampleTexts = () => firestore.collection('sampleTexts')
export const indexMetaRef = () => firestore.doc('sampleIndex/meta')
export const indexStateRef = () => firestore.doc('sampleIndex/state')
export const catalogShardRef = (n: number) => firestore.doc(`sampleIndex/catalog-${n}`)

export type CatalogEntry = { id: string; name: string; mimeType: string; path: string; modifiedTime: string; size?: number }
export type FolderCount = { path: string; count: number }
export type IndexMeta = {
  fileCount: number
  readableCount: number
  failedCount: number
  folders: FolderCount[]
  indexedAt: string
  shards: number
}

export function rootFolderId() {
  const id = process.env.DRIVE_ROOT_FOLDER_ID?.trim()
  if (!id) throw new Error('ID folder Drive belum diisi. Tambahkan DRIVE_ROOT_FOLDER_ID di Vercel.')
  return id
}

/** Short-lived cache so each search costs one meta read instead of re-reading the whole catalog. */
let catalogCache: { meta: IndexMeta | null; map: Map<string, CatalogEntry>; checkedAt: number } | null = null

/** Drops the cached catalog so the next read sees a freshly packed one. */
export function forgetCatalog() {
  catalogCache = null
}

export async function loadCatalog() {
  const now = Date.now()
  if (catalogCache && now - catalogCache.checkedAt < 30_000) return catalogCache
  const snapshot = await indexMetaRef().get()
  const meta = snapshot.exists ? snapshot.data() as IndexMeta : null
  if (catalogCache && meta && catalogCache.meta?.indexedAt === meta.indexedAt) {
    catalogCache.checkedAt = now
    return catalogCache
  }
  const map = new Map<string, CatalogEntry>()
  if (meta?.shards) {
    const shards = await firestore.getAll(...Array.from({ length: meta.shards }, (_, n) => catalogShardRef(n)))
    for (const shard of shards) {
      const entries = JSON.parse(shard.data()?.data ?? '[]') as CatalogEntry[]
      for (const entry of entries) map.set(entry.id, entry)
    }
  }
  catalogCache = { meta, map, checkedAt: now }
  return catalogCache
}

// Folder id -> path inside the root folder ('' for the root itself) or null when outside it.
const folderPaths = new Map<string, Promise<string | null>>()

function folderPath(folderId: string, root: string, depth = 0): Promise<string | null> {
  if (folderId === root) return Promise.resolve('')
  if (depth > 12) return Promise.resolve(null)
  const known = folderPaths.get(folderId)
  if (known) return known
  if (folderPaths.size > 2000) folderPaths.clear()
  const pending = (async () => {
    const result = await drive.files.get({ fileId: folderId, fields: 'name, parents', supportsAllDrives: true }).catch(() => null)
    const parent = result?.data.parents?.[0]
    if (!parent || !result?.data.name) return null
    const base = await folderPath(parent, root, depth + 1)
    if (base === null) return null
    return base ? `${base}/${result.data.name}` : result.data.name
  })()
  folderPaths.set(folderId, pending)
  return pending
}

type DriveFile = { id?: string | null; name?: string | null; mimeType?: string | null; modifiedTime?: string | null; parents?: string[] | null; size?: string | null; trashed?: boolean | null }

/** Returns the catalog entry for a Drive file only when it is a Word document inside the samples folder. */
export async function resolveDriveFile(file: DriveFile, catalog: Map<string, CatalogEntry>): Promise<CatalogEntry | null> {
  if (!file.id) return null
  const known = catalog.get(file.id)
  if (known) return file.modifiedTime ? { ...known, modifiedTime: file.modifiedTime } : known
  if (!file.name || !file.mimeType || !SEARCHABLE_MIMES.includes(file.mimeType) || file.trashed) return null
  const parent = file.parents?.[0]
  if (!parent) return null
  const path = await folderPath(parent, rootFolderId())
  if (path === null) return null
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    path,
    modifiedTime: file.modifiedTime ?? '',
    size: file.size ? Number(file.size) : undefined,
  }
}

export async function resolveFileId(id: string) {
  const { map } = await loadCatalog()
  const file = await drive.files.get({
    fileId: id,
    fields: 'id, name, mimeType, modifiedTime, parents, size, trashed',
    supportsAllDrives: true,
  }).catch(() => null)
  if (!file?.data || file.data.trashed) return null
  return resolveDriveFile(file.data, map)
}

const MAX_DOWNLOAD_BYTES = 40 * 1024 * 1024
const DRIVE_TIMEOUT_MS = 25_000
// Firestore documents are limited to 1 MiB.
const MAX_TEXT_BYTES = 900_000
const extractor = new WordExtractor()

function normalizeText(raw: string) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v\u00a0]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n[ \n]*\n/g, '\n\n')
    .trim()
}

function clipText(text: string) {
  let value = text.length > MAX_TEXT_BYTES ? text.slice(0, MAX_TEXT_BYTES) : text
  while (Buffer.byteLength(value) > MAX_TEXT_BYTES) value = value.slice(0, Math.floor(value.length * 0.9))
  return value
}

export async function extractText(entry: CatalogEntry) {
  let raw: string
  if (entry.mimeType === WORD_MIME.gdoc) {
    const result = await drive.files.export({ fileId: entry.id, mimeType: 'text/plain' }, { responseType: 'text', timeout: DRIVE_TIMEOUT_MS })
    raw = String(result.data ?? '')
  } else {
    if ((entry.size ?? 0) > MAX_DOWNLOAD_BYTES) throw new Error('File lebih dari 40 MB, terlalu besar untuk dibaca.')
    const result = await drive.files.get(
      { fileId: entry.id, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer', timeout: DRIVE_TIMEOUT_MS },
    )
    const document = await extractor.extract(Buffer.from(result.data as ArrayBuffer))
    raw = [document.getBody(), document.getTextboxes({ includeHeadersAndFooters: false })].filter(Boolean).join('\n')
  }
  return clipText(normalizeText(raw))
}

export function describeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/Unable to read this type of file|end of central directory|invalid/i.test(message)) return 'Isi file tidak bisa dibaca (file rusak atau bukan dokumen Word asli).'
  if (/export.*(too large|size)|exportSizeLimitExceeded/i.test(message)) return 'Google Docs terlalu besar untuk diekspor.'
  if (/permission|forbidden|403|404|not found/i.test(message)) return 'Akun server tidak punya akses ke file ini.'
  if (/timeout|ETIMEDOUT|aborted/i.test(message)) return 'Google Drive terlalu lama mengirim file ini.'
  return message.slice(0, 300)
}

/** Fields that store a file's text together with its read status, so reading a file costs one write. */
export function textFields(entry: CatalogEntry, text: string, error?: string) {
  return {
    text,
    chars: text.length,
    textIn: 'file',
    textModified: entry.modifiedTime,
    textStatus: error ? 'error' : text ? 'ok' : 'empty',
    textError: error ?? null,
    needsText: false,
  }
}

export async function saveText(entry: CatalogEntry, text: string, error?: string) {
  await sampleFiles().doc(entry.id).set({
    name: entry.name,
    mimeType: entry.mimeType,
    path: entry.path,
    modifiedTime: entry.modifiedTime,
    size: entry.size ?? 0,
    ...textFields(entry, text, error),
  }, { merge: true })
}

/**
 * Reads cached text, extracting (and caching) any file that is new or changed since it was read.
 * Text read before the storage change lives in sampleTexts and is still used while the file is unchanged.
 */
export async function getTexts(entries: CatalogEntry[], concurrency = 4) {
  const result = new Map<string, string>()
  if (!entries.length) return result
  const snapshots = await firestore.getAll(...entries.map((entry) => sampleFiles().doc(entry.id)))
  const legacy: CatalogEntry[] = []
  const stale: CatalogEntry[] = []
  entries.forEach((entry, index) => {
    const data = snapshots[index].data()
    const fresh = data && data.textModified === entry.modifiedTime
    if (fresh && data.textIn === 'file') result.set(entry.id, data.text ?? '')
    else if (fresh) legacy.push(entry)
    else stale.push(entry)
  })
  if (legacy.length) {
    const old = await firestore.getAll(...legacy.map((entry) => sampleTexts().doc(entry.id)))
    legacy.forEach((entry, index) => {
      const data = old[index].data()
      if (data && data.modifiedTime === entry.modifiedTime) result.set(entry.id, data.text ?? '')
      else stale.push(entry)
    })
  }
  await mapLimit(stale, concurrency, async (entry) => {
    try {
      const text = await extractText(entry)
      result.set(entry.id, text)
      await saveText(entry, text)
    } catch (error) {
      if (isQuotaError(error)) throw error
      console.error('Sample text extraction failed:', entry.id, error)
      result.set(entry.id, '')
      await saveText(entry, '', describeError(error)).catch(() => undefined)
    }
  })
  return result
}

export async function mapLimit<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await task(items[next++])
  })
  await Promise.all(workers)
}

// ---------- Query parsing ----------

const STOPWORDS = new Set([
  'dan', 'yang', 'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 'dalam', 'atau', 'ini', 'itu', 'adalah',
  'sebagai', 'oleh', 'para', 'akan', 'juga', 'tentang', 'serta', 'bagi', 'agar', 'the', 'of', 'and',
])

export type ParsedQuery = { words: string[]; terms: string[] }

export function parseQuery(input: string): ParsedQuery {
  const words = (input.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 10)
  const content = words.filter((word) => word.length > 1 && !STOPWORDS.has(word))
  return { words, terms: [...new Set(content.length ? content : words)] }
}

const driveQuote = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const mimeClause = `(${SEARCHABLE_MIMES.map((mime) => `mimeType = '${mime}'`).join(' or ')}) and trashed = false`

export function driveClauses(query: ParsedQuery) {
  const term = (value: string) => `fullText contains '${driveQuote(value)}'`
  return {
    phrase: query.words.length > 1 ? `fullText contains '"${driveQuote(query.words.join(' '))}"'` : null,
    all: query.terms.map(term).join(' and '),
    any: query.terms.length > 1 ? `(${query.terms.map(term).join(' or ')})` : null,
  }
}

export async function driveSearch(clause: string) {
  const result = await drive.files.list({
    q: `${clause} and ${mimeClause}`,
    fields: 'files(id, name, mimeType, modifiedTime, parents, size)',
    pageSize: 100,
    corpora: 'allDrives',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return result.data.files ?? []
}

// ---------- Snippets ----------

export type Segment = { text: string; hit?: true }
export type MatchTier = 'frasa' | 'semua' | 'sebagian' | 'judul'
export type Analysis = { tier: MatchTier; occurrences: number; passages: Segment[][] }

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const BEFORE = 90
const AFTER = 170

function buildPatterns(query: ParsedQuery) {
  const start = '(?<![\\p{L}\\p{N}])'
  const phrase = query.words.length > 1
    ? new RegExp(start + query.words.map(escapeRegex).join('[\\s\\p{P}]+'), 'giu')
    : null
  const terms = query.terms.length ? new RegExp(`${start}(?:${query.terms.map(escapeRegex).join('|')})`, 'giu') : null
  return { phrase, terms }
}

function passage(text: string, from: number, to: number, patterns: ReturnType<typeof buildPatterns>): Segment[] {
  let start = Math.max(0, from - BEFORE)
  let end = Math.min(text.length, to + AFTER)
  if (start > 0) {
    const space = text.indexOf(' ', start)
    if (space !== -1 && space < from) start = space + 1
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end)
    if (space > to) end = space
  }
  const window = text.slice(start, end)
  const ranges: [number, number][] = []
  for (const pattern of [patterns.phrase, patterns.terms]) {
    if (!pattern) continue
    for (const match of window.matchAll(pattern)) ranges.push([match.index, match.index + match[0].length])
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }
  const segments: Segment[] = []
  const push = (value: string, hit?: true) => {
    const clean = value.replace(/\s+/g, ' ')
    if (clean) segments.push(hit ? { text: clean, hit } : { text: clean })
  }
  if (start > 0) push('… ')
  let cursor = 0
  for (const [a, b] of merged) {
    push(window.slice(cursor, a))
    push(window.slice(a, b), true)
    cursor = b
  }
  push(window.slice(cursor))
  if (end < text.length) push(' …')
  return segments
}

/** Finds where the query appears in a document and returns highlighted passages. */
export function analyzeText(text: string, name: string, query: ParsedQuery, maxPassages: number): Analysis {
  const patterns = buildPatterns(query)
  const passages: Segment[][] = []

  if (patterns.phrase) {
    const matches = [...text.matchAll(patterns.phrase)].slice(0, 500)
    if (matches.length) {
      let lastEnd = -1
      for (const match of matches) {
        if (passages.length >= maxPassages) break
        if (match.index < lastEnd) continue
        passages.push(passage(text, match.index, match.index + match[0].length, patterns))
        lastEnd = match.index + match[0].length + AFTER + BEFORE
      }
      return { tier: 'frasa', occurrences: matches.length, passages }
    }
  }

  const hits = patterns.terms ? [...text.matchAll(patterns.terms)].slice(0, 3000) : []
  const found = new Set(hits.map((hit) => hit[0].toLowerCase()))
  const allTerms = query.terms.every((term) => [...found].some((value) => value.startsWith(term)))
  const lowerName = name.toLowerCase()
  const nameHasPhrase = query.words.length > 1 && lowerName.includes(query.words.join(' '))

  // Pick the windows that contain the most distinct query terms.
  const used: [number, number][] = []
  while (passages.length < maxPassages && hits.length) {
    let best: { from: number; to: number; score: number } | null = null
    for (let i = 0; i < hits.length; i++) {
      const from = hits[i].index
      if (used.some(([a, b]) => from >= a && from <= b)) continue
      const distinct = new Set<string>()
      let to = from + hits[i][0].length
      for (let j = i; j < hits.length && hits[j].index - from < 220; j++) {
        distinct.add(hits[j][0].toLowerCase())
        to = hits[j].index + hits[j][0].length
      }
      const score = distinct.size * 100 - (to - from) / 10
      if (!best || score > best.score) best = { from, to, score }
    }
    if (!best) break
    used.push([best.from - BEFORE - AFTER, best.to + AFTER])
    passages.push(passage(text, best.from, best.to, patterns))
  }

  const tier: MatchTier = nameHasPhrase ? 'frasa' : hits.length && allTerms ? 'semua' : hits.length ? 'sebagian' : 'judul'
  return { tier, occurrences: hits.length, passages }
}
