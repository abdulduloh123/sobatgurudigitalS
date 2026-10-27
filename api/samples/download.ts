import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Readable } from 'node:stream'
import { drive, firestore, requireUser } from '../_lib/clients.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
  const user = await requireUser(req, res, ['cs', 'admin'])
  if (!user) return

  const { sampleId, guru, catatan } = (req.body ?? {}) as {
    sampleId?: string
    guru?: string
    catatan?: string
  }
  if (!sampleId) return res.status(400).json({ error: 'sampleId wajib diisi.' })

  const sample = await firestore.collection('driveSamples').doc(sampleId).get()
  const data = sample.data()
  if (!data || !data.boleh_dikirim || data.is_missing) {
    return res.status(403).json({ error: 'Sampel ini tidak diizinkan untuk dikirim.' })
  }

  try {
    const isGoogleDoc = String(data.mime_type).startsWith('application/vnd.google-apps')
    let stream: Readable
    let filename = data.file_name as string
    let contentType = (data.mime_type as string) || 'application/octet-stream'

    if (isGoogleDoc) {
      const result = await drive.files.export(
        { fileId: data.drive_file_id as string, mimeType: 'application/pdf' },
        { responseType: 'stream' },
      )
      stream = result.data as unknown as Readable
      filename = filename.replace(/\.pdf$/i, '') + '.pdf'
      contentType = 'application/pdf'
    } else {
      const result = await drive.files.get(
        { fileId: data.drive_file_id as string, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' },
      )
      stream = result.data as unknown as Readable
    }

    await firestore.collection('driveDownloadLogs').add({
      sample_id: sample.id,
      file_name: data.file_name,
      user_id: user.id,
      guru: typeof guru === 'string' ? guru.slice(0, 160) : null,
      catatan: typeof catatan === 'string' ? catatan.slice(0, 1000) : null,
      created_at: new Date().toISOString(),
    })

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    stream.on('error', () => res.end())
    stream.pipe(res)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil file dari Drive.'
    if (!res.headersSent) res.status(500).json({ error: message })
    else res.end()
  }
}
