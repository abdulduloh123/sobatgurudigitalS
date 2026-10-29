import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { drive, firestore, requireUser } from '../_lib/clients.js'
import { WORD_MIME, resolveFileId } from '../_lib/samples.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
  const user = await requireUser(req, res, ['cs', 'admin'])
  if (!user) return

  const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {}
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!id || id.length > 200) return res.status(400).json({ error: 'File tidak valid.' })

  let stream: Readable
  let filename: string
  let contentType: string
  let entryPath: string
  try {
    const entry = await resolveFileId(id)
    if (!entry) return res.status(404).json({ error: 'File tidak ditemukan di folder sampel.' })
    entryPath = entry.path
    filename = entry.name
    if (entry.mimeType === WORD_MIME.gdoc) {
      const result = await drive.files.export({ fileId: entry.id, mimeType: WORD_MIME.docx }, { responseType: 'stream' })
      stream = result.data as unknown as Readable
      filename = `${filename.replace(/\.docx?$/i, '')}.docx`
      contentType = WORD_MIME.docx
    } else {
      const result = await drive.files.get({ fileId: entry.id, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' })
      stream = result.data as unknown as Readable
      contentType = entry.mimeType
    }
  } catch (error) {
    console.error('Sample download failed to start:', error)
    return res.status(500).json({ error: 'Gagal mengambil file dari Google Drive. Coba lagi sebentar.' })
  }

  await firestore.collection('driveDownloadLogs').add({
    file_id: id,
    file_name: filename,
    path: entryPath,
    user_id: user.id,
    user_name: user.name || null,
    role: user.role,
    guru: typeof body.guru === 'string' ? body.guru.trim().slice(0, 160) || null : null,
    catatan: typeof body.catatan === 'string' ? body.catatan.trim().slice(0, 1000) || null : null,
    created_at: new Date().toISOString(),
  }).catch((error) => console.error('Download log failed:', error))

  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
  try {
    await pipeline(stream, res)
  } catch (error) {
    // Abort the connection so the browser reports a failed download instead of saving a truncated file.
    console.error('Sample download stream failed:', error)
    res.destroy(error as Error)
  }
}
