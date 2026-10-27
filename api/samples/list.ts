import type { VercelRequest, VercelResponse } from '@vercel/node'
import { firestore, requireUser } from '../_lib/clients.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })
  if (!await requireUser(req, res, ['cs', 'admin'])) return

  try {
    const snapshot = await firestore.collection('driveSamples').get()
    const samples = snapshot.docs
      .filter((entry) => entry.data().boleh_dikirim === true && entry.data().is_missing === false)
      .map((entry) => {
        const data = entry.data()
        // Whitelist public catalog fields. In particular, never send Drive IDs.
        return {
          id: entry.id,
          file_name: data.file_name,
          mime_type: data.mime_type,
          drive_path: data.drive_path ?? null,
          jenjang: data.jenjang ?? null,
          kelas: data.kelas ?? null,
          mapel: data.mapel ?? null,
          versi_buku: data.versi_buku ?? null,
          jenis_dokumen: data.jenis_dokumen ?? null,
          topik: data.topik ?? null,
          kata_kunci: data.kata_kunci ?? [],
          paket_produk: data.paket_produk ?? null,
          boleh_dikirim: true,
          is_missing: false,
        }
      })
    return res.json({ samples })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membaca katalog sampel.'
    return res.status(500).json({ error: message })
  }
}
