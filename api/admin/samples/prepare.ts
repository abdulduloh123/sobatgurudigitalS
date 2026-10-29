import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldPath, FieldValue, type DocumentData } from 'firebase-admin/firestore'
import { drive, firestore, requireUser } from '../../_lib/clients.js'
import {
  FOLDER_MIME, SEARCHABLE_MIMES, catalogShardRef, describeError, extractText, indexMetaRef, indexStateRef,
  mapLimit, rootFolderId, sampleFiles, sampleTexts, saveText, type CatalogEntry, type FolderCount, type IndexMeta,
} from '../../_lib/samples.js'

type Phase = 'legacy' | 'scan' | 'text' | 'cleanup' | 'finalize'
type FolderCursor = { folderId: string; path: string; depth: number; pageToken?: string }
type State = {
  runId: string
  phase: Phase
  stack: FolderCursor[]
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
      const failed = await sampleFiles().where('textStatus', '==', 'error').limit(400).get()
      const batch = firestore.batch()
      for (const entry of failed.docs) batch.update(entry.ref, { needsText: true, textModified: null })
      await batch.commit()
      return res.json({ ...await status(), retried: failed.size })
    }
    return res.json(await run())
  } catch (error) {
    console.error('Sample index failed:', error)
    return res.status(500).json({ error: friendlyError(error) })
  }
}

async function status() {
  const [meta, state, failed, pending] = await Promise.all([
    indexMetaRef().get(),
    indexStateRef().get(),
    sampleFiles().where('textStatus', '==', 'error').limit(50).get(),
    sampleFiles().where('needsText', '==', true).count().get(),
  ])
  const metaData = meta.data() as IndexMeta | undefined
  const stateData = state.data() as State | undefined
  return {
    meta: metaData ? { ...metaData, shards: undefined } : null,
    running: stateData ? {
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
    const current = snapshot.data() as State | undefined
    if (current && current.leaseUntil > Date.now()) return null
    const next: State = current ?? {
      runId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      phase: 'legacy',
      stack: [{ folderId: rootFolderId(), path: '', depth: 0 }],
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
        const old = await firestore.collection('driveSamples').limit(400).get()
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
      const existing = items.length ? await firestore.getAll(...items.map((item) => sampleFiles().doc(item.id))) : []
      const batch = firestore.batch()
      items.forEach((item, index) => {
        const data = existing[index].data()
        const changed = !data || data.textModified !== item.modifiedTime
        batch.set(sampleFiles().doc(item.id), {
          name: item.name,
          mimeType: item.mimeType,
          path: item.path,
          modifiedTime: item.modifiedTime,
          size: item.size ?? 0,
          run: state.runId,
          ...(changed ? { needsText: true, textStatus: data?.textStatus ?? 'pending' } : {}),
        }, { merge: true })
      })
      const stack = state.stack.slice(0, -1)
      if (result.data.nextPageToken) stack.push({ ...cursor, pageToken: result.data.nextPageToken })
      stack.push(...folders.reverse())
      state.stack = stack
      state.scanned += items.length
      if (!stack.length) state.phase = 'text'
      batch.set(indexStateRef(), state)
      await batch.commit()
    }

    while (state.phase === 'text' && timeLeft() > 0) {
      const queue = await sampleFiles().where('needsText', '==', true).limit(TEXT_BATCH).get()
      if (queue.empty) { state.phase = 'cleanup'; break }
      // Searches may already have read some files; reuse that text instead of downloading again.
      const cached = await firestore.getAll(...queue.docs.map((doc) => sampleTexts().doc(doc.id)))
      await mapLimit(queue.docs, 4, async (doc) => {
        const data = doc.data()
        const entry = toEntry(doc.id, data)
        const known = cached.find((item) => item.id === doc.id)?.data()
        try {
          let text: string
          if (known && known.modifiedTime === entry.modifiedTime && !known.error) {
            text = known.text ?? ''
          } else {
            text = await extractText(entry)
            await saveText(entry, text)
          }
          await doc.ref.update({ needsText: false, textStatus: text ? 'ok' : 'empty', textModified: entry.modifiedTime, chars: text.length, textError: FieldValue.delete() })
          state.textDone++
        } catch (error) {
          const message = describeError(error)
          await saveText(entry, '', message)
          await doc.ref.update({ needsText: false, textStatus: 'error', textModified: entry.modifiedTime, textError: message })
          state.textFailed++
        }
      })
      await save()
    }

    while (state.phase === 'cleanup' && timeLeft() > 0) {
      const removed = await sampleFiles().where('run', '!=', state.runId).limit(200).get()
      if (removed.empty) { state.phase = 'finalize'; break }
      const batch = firestore.batch()
      for (const entry of removed.docs) {
        batch.delete(entry.ref)
        batch.delete(sampleTexts().doc(entry.id))
      }
      await batch.commit()
    }

    if (state.phase === 'finalize' && timeLeft() > 0) {
      await finalize()
      await indexStateRef().delete()
      return { done: true, ...await status() }
    }

    await save({ leaseUntil: 0 })
    const pending = state.phase === 'text' ? (await sampleFiles().where('needsText', '==', true).count().get()).data().count : 0
    return { done: false, phase: state.phase, scanned: state.scanned, textDone: state.textDone, textFailed: state.textFailed, pending }
  } catch (error) {
    await save({ leaseUntil: 0 }).catch(() => undefined)
    throw error
  }
}

function toEntry(id: string, data: DocumentData): CatalogEntry {
  return { id, name: data.name ?? '', mimeType: data.mimeType ?? '', path: data.path ?? '', modifiedTime: data.modifiedTime ?? '', size: data.size ?? 0 }
}

/** Packs the catalog into a few documents so searches can load it with 1–3 reads. */
async function finalize() {
  const entries: CatalogEntry[] = []
  let failedCount = 0
  let readableCount = 0
  const folderCounts = new Map<string, number>()
  let last: string | undefined
  while (true) {
    let query = sampleFiles().orderBy(FieldPath.documentId()).limit(1000)
    if (last) query = query.startAfter(last)
    const page = await query.get()
    for (const doc of page.docs) {
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
}

function friendlyError(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error)
  if (/DRIVE_ROOT_FOLDER_ID/.test(detail)) return detail
  if (/invalid_grant|private key|PEM|DECODER/i.test(detail)) return 'Kunci Firebase server tidak terbaca. Periksa FIREBASE_CLIENT_EMAIL dan FIREBASE_PRIVATE_KEY di Vercel.'
  if (/permission|forbidden|not found|404|403/i.test(detail)) return 'Akun server belum bisa membuka folder Drive. Bagikan folder utama ke FIREBASE_CLIENT_EMAIL sebagai Viewer dan pastikan DRIVE_ROOT_FOLDER_ID benar.'
  return detail || 'Gagal menyiapkan pencarian. Buka Vercel → Logs untuk detail.'
}
