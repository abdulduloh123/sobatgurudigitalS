import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { DocumentReference } from 'firebase-admin/firestore'
import { drive, firestore, requireUser } from '../_lib/clients.js'

type DriveItem = { id: string; name: string; mimeType: string; parts: string[] }

async function walk(folderId: string, parts: string[], out: DriveItem[], depth = 0) {
  let pageToken: string | undefined
  do {
    const result = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
    for (const file of result.data.files ?? []) {
      if (!file.id || !file.name) continue
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        if (depth < 6) await walk(file.id, [...parts, file.name], out, depth + 1)
      } else {
        out.push({ id: file.id, name: file.name, mimeType: file.mimeType ?? '', parts })
      }
    }
    pageToken = result.data.nextPageToken ?? undefined
  } while (pageToken)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
  if (!await requireUser(req, res, ['admin'])) return

  try {
    const items: DriveItem[] = []
    await walk(process.env.DRIVE_ROOT_FOLDER_ID!, [], items)

    const collection = firestore.collection('driveSamples')
    const snapshot = await collection.get()
    const known = new Map<string, DocumentReference>()
    for (const entry of snapshot.docs) {
      const driveId = entry.data().drive_file_id
      if (typeof driveId === 'string' && driveId) known.set(driveId, entry.ref)
    }
    const found = new Set(items.map((item) => item.id))
    let batch = firestore.batch()
    let batchSize = 0
    const commitIfFull = async () => {
      if (batchSize < 400) return
      await batch.commit()
      batch = firestore.batch()
      batchSize = 0
    }

    let baru = 0
    for (const item of items) {
      const knownRef = known.get(item.id)
      const ref = knownRef ?? collection.doc()
      if (!knownRef) {
        batch.set(ref, {
          drive_file_id: item.id,
          file_name: item.name,
          mime_type: item.mimeType,
          drive_path: item.parts.join('/'),
          jenjang: item.parts[0] ?? null,
          kelas: item.parts[1] ?? null,
          mapel: item.parts[2] ?? null,
          versi_buku: null,
          jenis_dokumen: null,
          topik: null,
          kata_kunci: [],
          paket_produk: null,
          boleh_dikirim: false,
          is_missing: false,
        })
        baru++
      } else {
        batch.set(ref, {
          file_name: item.name,
          mime_type: item.mimeType,
          drive_path: item.parts.join('/'),
          is_missing: false,
        }, { merge: true })
      }
      batchSize++
      await commitIfFull()
    }

    let hilang = 0
    for (const id of known.keys()) {
      if (found.has(id)) continue
      const ref = known.get(id)
      if (!ref) continue
      batch.set(ref, { is_missing: true, boleh_dikirim: false }, { merge: true })
      batchSize++
      hilang++
      await commitIfFull()
    }
    if (batchSize) await batch.commit()

    return res.json({ total: items.length, baru, hilang })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sinkronisasi gagal.'
    return res.status(500).json({ error: message })
  }
}
