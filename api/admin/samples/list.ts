import type { VercelRequest, VercelResponse } from '@vercel/node'
import { firestore, requireUser } from '../../_lib/clients.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })
  if (!await requireUser(req, res, ['admin'])) return

  try {
    const snapshot = await firestore.collection('driveSamples').get()
    const samples = snapshot.docs.map((entry) => {
      const data = entry.data()
      return {
        id: entry.id,
        file_name: data.file_name ?? '',
        mime_type: data.mime_type ?? '',
        drive_path: data.drive_path ?? null,
        jenjang: data.jenjang ?? null,
        kelas: data.kelas ?? null,
        mapel: data.mapel ?? null,
        versi_buku: data.versi_buku ?? null,
        jenis_dokumen: data.jenis_dokumen ?? null,
        topik: data.topik ?? null,
        kata_kunci: data.kata_kunci ?? [],
        paket_produk: data.paket_produk ?? null,
        boleh_dikirim: data.boleh_dikirim === true,
        is_missing: data.is_missing === true,
      }
    })
    samples.sort((a, b) => `${a.drive_path ?? ''}/${a.file_name}`.localeCompare(`${b.drive_path ?? ''}/${b.file_name}`))
    return res.json({ samples })
  } catch (error) {
    console.error('Admin sample catalog read failed:', error)
    return res.status(500).json({ error: 'Gagal memuat repositori sampel dari Firebase.' })
  }
}

