import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldPath, type DocumentReference } from 'firebase-admin/firestore'
import { drive, firestore, requireUser } from '../_lib/clients.js'

type FolderCursor = { folderId: string; parts: string[]; depth: number; pageToken?: string }
type SyncState = {
  runId: string
  phase: 'scan' | 'missing'
  stack: FolderCursor[]
  lastDocId?: string
  total: number
  baru: number
  hilang: number
}
type DriveItem = { id: string; name: string; mimeType: string; parts: string[] }

// Keep each Vercel request short. The browser automatically asks for the next chunk.
const PAGES_PER_REQUEST = 12
const PAGE_SIZE = 200
const MISSING_PAGE_SIZE = 300
const STATE_PATH = '_internal/driveSync'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
  if (!await requireUser(req, res, ['admin'])) return

  try {
    const rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID?.trim()
    if (!rootFolderId) {
      return res.status(500).json({ error: 'ID folder Drive belum diisi. Tambahkan DRIVE_ROOT_FOLDER_ID di Vercel.' })
    }

    const stateRef = firestore.doc(STATE_PATH)
    const collection = firestore.collection('driveSamples')
    let stateSnapshot = await stateRef.get()
    if (!stateSnapshot.exists) {
      const initial: SyncState = {
        runId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        phase: 'scan',
        stack: [{ folderId: rootFolderId, parts: [], depth: 0 }],
        total: 0,
        baru: 0,
        hilang: 0,
      }
      await stateRef.create(initial)
      stateSnapshot = await stateRef.get()
    }
    let state = stateSnapshot.data() as SyncState

    if (state.phase === 'scan') {
      // Read the existing catalog once per short chunk so edits/approval fields remain intact.
      const knownSnapshot = await collection.get()
      const known = new Map<string, DocumentReference>()
      for (const entry of knownSnapshot.docs) {
        const driveId = entry.data().drive_file_id
        if (typeof driveId === 'string' && driveId) known.set(driveId, entry.ref)
      }

      let pages = 0
      while (state.stack.length && pages < PAGES_PER_REQUEST) {
        const cursor = state.stack[state.stack.length - 1]
        const result = await drive.files.list({
          q: `'${cursor.folderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType)',
          pageSize: PAGE_SIZE,
          pageToken: cursor.pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })
        const items: DriveItem[] = []
        const childFolders: FolderCursor[] = []
        for (const file of result.data.files ?? []) {
          if (!file.id || !file.name) continue
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            if (cursor.depth < 6) childFolders.push({ folderId: file.id, parts: [...cursor.parts, file.name], depth: cursor.depth + 1 })
          } else {
            items.push({ id: file.id, name: file.name, mimeType: file.mimeType ?? '', parts: cursor.parts })
          }
        }

        const nextStack = state.stack.slice(0, -1)
        if (result.data.nextPageToken) nextStack.push({ ...cursor, pageToken: result.data.nextPageToken })
        nextStack.push(...childFolders.reverse())
        const batch = firestore.batch()
        let added = 0
        for (const item of items) {
          const existing = known.get(item.id)
          const ref = existing ?? collection.doc()
          const values = {
            file_name: item.name,
            mime_type: item.mimeType,
            drive_path: item.parts.join('/'),
            is_missing: false,
            drive_sync_run: state.runId,
          }
          if (!existing) {
            batch.set(ref, {
              drive_file_id: item.id,
              ...values,
              jenjang: item.parts[0] ?? null,
              kelas: item.parts[1] ?? null,
              mapel: item.parts[2] ?? null,
              versi_buku: null,
              jenis_dokumen: null,
              topik: null,
              kata_kunci: [],
              paket_produk: null,
              boleh_dikirim: false,
            })
            known.set(item.id, ref)
            added++
          } else {
            batch.set(ref, values, { merge: true })
          }
        }
        const nextState: SyncState = {
          ...state,
          stack: nextStack,
          phase: nextStack.length ? 'scan' : 'missing',
          total: state.total + items.length,
          baru: state.baru + added,
        }
        batch.set(stateRef, nextState)
        await batch.commit()
        state = nextState
        pages++
      }

      if (state.phase === 'scan') {
        return res.json({ done: false, total: state.total, baru: state.baru, hilang: state.hilang })
      }
    }

    // After the full Drive scan, mark catalog items not seen in this run as missing in pages.
    let query = collection.orderBy(FieldPath.documentId()).limit(MISSING_PAGE_SIZE)
    if (state.lastDocId) query = query.startAfter(state.lastDocId)
    const page = await query.get()
    if (!page.empty) {
      const batch = firestore.batch()
      let hilang = 0
      for (const entry of page.docs) {
        const data = entry.data()
        if (typeof data.drive_file_id !== 'string' || !data.drive_file_id) continue
        if (data.drive_sync_run !== state.runId) {
          batch.set(entry.ref, { is_missing: true, boleh_dikirim: false }, { merge: true })
          hilang++
        }
      }
      const lastDocId = page.docs[page.docs.length - 1].id
      const isLastPage = page.docs.length < MISSING_PAGE_SIZE
      const nextState = { ...state, lastDocId, hilang: state.hilang + hilang }
      if (isLastPage) batch.delete(stateRef)
      else batch.set(stateRef, nextState)
      await batch.commit()
      if (isLastPage) return res.json({ done: true, total: state.total, baru: state.baru, hilang: nextState.hilang })
      return res.json({ done: false, total: state.total, baru: state.baru, hilang: nextState.hilang })
    }

    await stateRef.delete()
    return res.json({ done: true, total: state.total, baru: state.baru, hilang: state.hilang })
  } catch (error) {
    console.error('Drive sync failed:', error)
    const value = error as {
      message?: unknown
      errors?: Array<{ message?: unknown }>
      response?: { status?: number; data?: { error?: { message?: unknown } | string } }
    } | null
    const responseError = value?.response?.data?.error
    const detail = typeof value?.message === 'string'
      ? value.message
      : typeof responseError === 'string'
        ? responseError
        : typeof responseError?.message === 'string'
          ? responseError.message
          : typeof value?.errors?.[0]?.message === 'string'
            ? value.errors[0].message
            : ''
    const status = value?.response?.status ?? (error as { code?: number } | null)?.code
    const message = /invalid_grant|private key|PEM|DECODER/i.test(detail)
      ? 'Kunci Firebase server tidak terbaca. Periksa FIREBASE_CLIENT_EMAIL dan FIREBASE_PRIVATE_KEY di Vercel.'
      : /permission|forbidden|not found|404|403/i.test(detail)
        ? 'Akun server belum bisa membuka folder Drive. Bagikan folder utama ke FIREBASE_CLIENT_EMAIL sebagai Viewer dan pastikan DRIVE_ROOT_FOLDER_ID benar.'
        : detail || (status ? `Google Drive mengembalikan error ${status}. Periksa izin folder dan ID folder Drive.` : 'Server gagal membaca Google Drive. Buka Vercel → Logs untuk melihat detail.')
    return res.status(500).json({ error: message })
  }
}

