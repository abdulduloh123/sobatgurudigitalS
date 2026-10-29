import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldPath, type DocumentData } from 'firebase-admin/firestore'
import { QUOTA_MESSAGE, drive, firestore, isQuotaError, requireUser } from '../../_lib/clients.js'
import {
  FOLDER_MIME, SEARCHABLE_MIMES, catalogShardRef, describeError, extractText, indexMetaRef, indexStateRef,
  forgetCatalog, loadCatalog, mapLimit, rootFolderId, sampleFiles, sampleTexts, textFields, type CatalogEntry, type FolderCount,
  type IndexMeta,
} from '../../_lib/samples.js'

type Phase = 'legacy' | 'scan' | 'text' | 'finalize'
type FolderCursor = { folderId: string; path: string; depth: number; pageToken?: string }
type State = {
  version: 2
  runId: string
  phase: Phase
  stack: FolderCursor[]
  // Ids found in Drive during this run; anything else in the catalog was removed from Drive.
  seen: string[]
  scanned: number
  textDone: number
  textFailed: number
  startedAt: string
  leaseUntil: number
}

// Each request works for a bounded time; the admin page keeps calling until done.
const TIME_BUDGET_MS = 40_000
const LEASE_MS = 75_000
const TEXT_BATCH = 8
const SHARD_BYTES = 800_000
// The seen list lives in the state document, which Firestore limits to 1 MiB.
const MAX_FILES = 20_000
const META_FIELDS = ['name', 'mimeType', 'path', 'modifiedTime', 'size', 'textStatus', 'textModified', 'needsText']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!await requireUser(req, res, ['admin'])) return
  try {
    if (req.method === 'GET') return res.json(await status())
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan GET atau POST.' })
    const action = typeof req.body?.action === 'string' ? req.body.action : 'run'
    if (action === 'reset') {
      await indexStateRef().delete()
      return res.json(await status())
    }
    if (action === 'retry') {
      const failed = await sampleFiles().where('textStatus', '==', 'error').select('textStatus').limit(400).get()
      const batch = firestore.batch()
      for (const entry of failed.docs) batch.update(entry.ref, { needsText: true, textModified: null })
      await batch.commit()
      return res.json({ ...await status(), retried: failed.size })
    }
    return res.json(await run())
  } catch (error) {
    console.error('Sample index failed:', error)
    return res.status(isQuotaError(error) ? 503 : 500).json({ error: friendlyError(error) })
  }
}

async function status() {
  const [meta, state, failed, pending] = await Promise.all([
    indexMetaRef().get(),
    indexStateRef().get(),
    sampleFiles().where('textStatus', '==', 'error').select('name', 'path', 'textError').limit(50).get(),
    sampleFiles().where('needsText', '==', true).count().get(),
  ])
  const metaData = meta.data() as IndexMeta | undefined
  const stateData = state.data() as State | undefined
  return {
    meta: metaData ? { ...metaData, shards: undefined } : null,
    running: stateData?.version === 2 ? {
      phase: stateData.phase,
      scanned: stateData.scanned,
      textDone: stateData.textDone,
      textFailed: stateData.textFailed,
      startedAt: stateData.startedAt,
      active: stateData.leaseUntil > Date.now(),
    } : null,
    pending: pending.data().count,
    failed: failed.docs.map((entry) => ({
      id: entry.id,
      name: entry.data().name,
      path: entry.data().path,
      error: entry.data().textError ?? 'Gagal dibaca.',
    })),
  }
}

async function run() {
  const started = Date.now()
  const timeLeft = () => TIME_BUDGET_MS - (Date.now() - started)

  // Lease the job so two admin tabs cannot process the same chunk at once.
  const state = await firestore.runTransaction(async (tx) => {
    const snapshot = await tx.get(indexStateRef())
    const stored = snapshot.data() as State | undefined
    // A state from the previous storage format restarts the scan; text already read is kept.
    const current = stored?.version === 2 ? stored : undefined
    if (current && current.leaseUntil > Date.now()) return null
    const next: State = current ?? {
      version: 2,
      runId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      phase: 'legacy',
      stack: [{ folderId: rootFolderId(), path: '', depth: 0 }],
      seen: [],
      scanned: 0,
      textDone: 0,
      textFailed: 0,
      startedAt: new Date().toISOString(),
      leaseUntil: 0,
    }
    next.leaseUntil = Date.now() + LEASE_MS
    tx.set(indexStateRef(), next)
    return next
  })
  if (!state) return { done: false, busy: true }

  const save = (changes: Partial<State> = {}) => indexStateRef().set(Object.assign(state, changes))

  try {
    if (state.phase === 'legacy') {
      // One-time cleanup of the old approval catalog.
      while (timeLeft() > 0) {
        const old = await firestore.collection('driveSamples').select().limit(400).get()
        if (old.empty) break
        const batch = firestore.batch()
        old.docs.forEach((entry) => batch.delete(entry.ref))
        await batch.commit()
      }
      if (timeLeft() > 0) {
        await firestore.doc('_internal/driveSync').delete()
        state.phase = 'scan'
      }
    }

    if (state.phase === 'scan') await scan(state, timeLeft)

    while (state.phase === 'text' && timeLeft() > 0) {
      const queue = await sampleFiles().where('needsText', '==', true).select(...META_FIELDS).limit(TEXT_BATCH).get()
      if (queue.empty) { state.phase = 'finalize'; break }
      // Text read before the storage change (or by a search) is reused instead of downloading again.
      const legacy = await firestore.getAll(...queue.docs.map((doc) => sampleTexts().doc(doc.id)))
      const updates: { id: string; fields: ReturnType<typeof textFields> }[] = []
      await mapLimit(queue.docs, 4, async (doc) => {
        const entry = toEntry(doc.id, doc.data())
        const known = legacy.find((item) => item.id === doc.id)?.data()
        try {
          const text = known && known.modifiedTime === entry.modifiedTime && !known.error
            ? String(known.text ?? '')
            : await extractText(entry)
          updates.push({ id: doc.id, fields: textFields(entry, text) })
          state.textDone++
        } catch (error) {
          updates.push({ id: doc.id, fields: textFields(entry, '', describeError(error)) })
          state.textFailed++
        }
      })
      // Only counters change here, so the state document is saved once at the end of the request.
      const batch = firestore.batch()
      for (const update of updates) batch.set(sampleFiles().doc(update.id), update.fields, { merge: true })
      await batch.commit()
    }

    if (state.phase === 'finalize' && timeLeft() > 0) {
      await finalize(new Set(state.seen))
      await indexStateRef().delete()
      return { done: true, ...await status() }
    }

    await save({ leaseUntil: 0 })
    const pending = state.phase === 'text' ? (await sampleFiles().where('needsText', '==', true).count().get()).data().count : 0
    return { done: false, phase: state.phase, scanned: state.scanned, textDone: state.textDone, textFailed: state.textFailed, pending }
  } catch (error) {
    if (!isQuotaError(error)) await save({ leaseUntil: 0 }).catch(() => undefined)
    throw error
  }
}

/** Walks the Drive folders and writes only files that are new or changed since the last run. */
async function scan(state: State, timeLeft: () => number) {
  // The packed catalog from the last finished run answers "unchanged?" for almost every file in a few reads.
  forgetCatalog()
  const { map: catalog } = await loadCatalog()
  while (state.phase === 'scan' && timeLeft() > 0) {
    const cursor = state.stack[state.stack.length - 1]
    if (!cursor) { state.phase = 'text'; break }
    const result = await drive.files.list({
      q: `'${cursor.folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size)',
      pageSize: 200,
      pageToken: cursor.pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
    const items: CatalogEntry[] = []
    const folders: FolderCursor[] = []
    for (const file of result.data.files ?? []) {
      if (!file.id || !file.name) continue
      if (file.mimeType === FOLDER_MIME) {
        if (cursor.depth < 10) folders.push({ folderId: file.id, path: cursor.path ? `${cursor.path}/${file.name}` : file.name, depth: cursor.depth + 1 })
      } else if (file.mimeType && SEARCHABLE_MIMES.includes(file.mimeType)) {
        items.push({ id: file.id, name: file.name, mimeType: file.mimeType, path: cursor.path, modifiedTime: file.modifiedTime ?? '', size: file.size ? Number(file.size) : 0 })
      }
    }

    const unknown = items.filter((item) => !sameFile(catalog.get(item.id), item))
    const stored = unknown.length
      ? await firestore.getAll(...unknown.map((item) => sampleFiles().doc(item.id)), { fieldMask: META_FIELDS })
      : []
    const batch = firestore.batch()
    unknown.forEach((item, index) => {
      const data = stored[index].data()
      const meta = { name: item.name, mimeType: item.mimeType, path: item.path, modifiedTime: item.modifiedTime, size: item.size ?? 0 }
      const textStale = !data || data.textModified !== item.modifiedTime
      if (textStale && data?.needsText !== true) {
        batch.set(sampleFiles().doc(item.id), { ...meta, needsText: true, textStatus: data?.textStatus ?? 'pending' }, { merge: true })
      } else if (!sameFile(data as CatalogEntry | undefined, item)) {
        batch.set(sampleFiles().doc(item.id), meta, { merge: true })
      }
    })

    const stack = state.stack.slice(0, -1)
    if (result.data.nextPageToken) stack.push({ ...cursor, pageToken: result.data.nextPageToken })
    stack.push(...folders.reverse())
    state.stack = stack
    state.seen.push(...items.map((item) => item.id))
    state.scanned += items.length
    if (state.seen.length > MAX_FILES) throw new Error(`Folder sampel berisi lebih dari ${MAX_FILES.toLocaleString('id-ID')} dokumen Word. Hubungi pengembang untuk menaikkan batas ini.`)
    if (!stack.length) state.phase = 'text'
    batch.set(indexStateRef(), state)
    await batch.commit()
  }
}

function sameFile(known: Partial<CatalogEntry> | undefined, item: CatalogEntry) {
  return Boolean(known) && known!.name === item.name && known!.path === item.path
    && known!.modifiedTime === item.modifiedTime && known!.mimeType === item.mimeType
}

function toEntry(id: string, data: DocumentData): CatalogEntry {
  return { id, name: data.name ?? '', mimeType: data.mimeType ?? '', path: data.path ?? '', modifiedTime: data.modifiedTime ?? '', size: data.size ?? 0 }
}

/** Removes files no longer in Drive and packs the catalog into a few documents so searches load it in 1–3 reads. */
async function finalize(seen: Set<string>) {
  const entries: CatalogEntry[] = []
  const removed: string[] = []
  let failedCount = 0
  let readableCount = 0
  const folderCounts = new Map<string, number>()
  let last: string | undefined
  while (true) {
    let query = sampleFiles().select(...META_FIELDS).orderBy(FieldPath.documentId()).limit(1000)
    if (last) query = query.startAfter(last)
    const page = await query.get()
    for (const doc of page.docs) {
      if (!seen.has(doc.id)) { removed.push(doc.id); continue }
      const data = doc.data()
      entries.push(toEntry(doc.id, data))
      if (data.textStatus === 'error') failedCount++
      if (data.textStatus === 'ok') readableCount++
      const parts = (data.path ?? '').split('/').filter(Boolean)
      for (let depth = 1; depth <= Math.min(2, parts.length); depth++) {
        const key = parts.slice(0, depth).join('/')
        folderCounts.set(key, (folderCounts.get(key) ?? 0) + 1)
      }
    }
    if (page.size < 1000) break
    last = page.docs[page.docs.length - 1].id
  }

  for (let i = 0; i < removed.length; i += 200) {
    const batch = firestore.batch()
    for (const id of removed.slice(i, i + 200)) {
      batch.delete(sampleFiles().doc(id))
      batch.delete(sampleTexts().doc(id))
    }
    await batch.commit()
  }

  const shards: string[] = []
  let current: CatalogEntry[] = []
  let bytes = 2
  for (const entry of entries) {
    const size = Buffer.byteLength(JSON.stringify(entry)) + 1
    if (bytes + size > SHARD_BYTES && current.length) {
      shards.push(JSON.stringify(current))
      current = []
      bytes = 2
    }
    current.push(entry)
    bytes += size
  }
  if (current.length || !shards.length) shards.push(JSON.stringify(current))

  const previous = (await indexMetaRef().get()).data() as IndexMeta | undefined
  const folders: FolderCount[] = [...folderCounts].map(([path, count]) => ({ path, count }))
    .sort((a, b) => a.path.localeCompare(b.path, 'id', { numeric: true }))
  const batch = firestore.batch()
  shards.forEach((data, n) => batch.set(catalogShardRef(n), { data }))
  for (let n = shards.length; n < (previous?.shards ?? 0); n++) batch.delete(catalogShardRef(n))
  const meta: IndexMeta = {
    fileCount: entries.length,
    readableCount,
    failedCount,
    folders,
    indexedAt: new Date().toISOString(),
    shards: shards.length,
  }
  batch.set(indexMetaRef(), meta)
  await batch.commit()
  forgetCatalog()
}

function friendlyError(error: unknown) {
  if (isQuotaError(error)) return QUOTA_MESSAGE
  const detail = error instanceof Error ? error.message : String(error)
  if (/DRIVE_ROOT_FOLDER_ID|lebih dari .* dokumen Word/.test(detail)) return detail
  if (/invalid_grant|private key|PEM|DECODER/i.test(detail)) return 'Kunci Firebase server tidak terbaca. Periksa FIREBASE_CLIENT_EMAIL dan FIREBASE_PRIVATE_KEY di Vercel.'
  if (/permission|forbidden|not found|404|403/i.test(detail)) return 'Akun server belum bisa membuka folder Drive. Bagikan folder utama ke FIREBASE_CLIENT_EMAIL sebagai Viewer dan pastikan DRIVE_ROOT_FOLDER_ID benar.'
  return detail || 'Gagal menyiapkan pencarian. Buka Vercel → Logs untuk detail.'
}
