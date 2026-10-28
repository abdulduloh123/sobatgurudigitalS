import type { VercelRequest, VercelResponse } from '@vercel/node'
import { firestore, requireUser } from '../../_lib/clients.js'

const textFields = ['jenjang', 'kelas', 'mapel', 'versi_buku', 'jenis_dokumen', 'topik', 'paket_produk'] as const
const editableFields = new Set<string>([...textFields, 'kata_kunci', 'boleh_dikirim'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
  if (!await requireUser(req, res, ['admin'])) return

  const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {}
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const input = typeof body.changes === 'object' && body.changes !== null
    ? body.changes as Record<string, unknown>
    : {}
  const keys = Object.keys(input)
  if (!id || !keys.length || keys.some((key) => !editableFields.has(key))) {
    return res.status(400).json({ error: 'Data perubahan sampel tidak valid.' })
  }

  const changes: Record<string, unknown> = {}
  for (const key of textFields) {
    if (key in input) {
      if (input[key] !== null && typeof input[key] !== 'string') return res.status(400).json({ error: 'Isi bidang sampel harus berupa teks.' })
      changes[key] = typeof input[key] === 'string' ? (input[key] as string).trim() || null : null
    }
  }
  if ('kata_kunci' in input) {
    if (!Array.isArray(input.kata_kunci) || input.kata_kunci.some((item) => typeof item !== 'string')) {
      return res.status(400).json({ error: 'Kata kunci tidak valid.' })
    }
    changes.kata_kunci = [...new Set((input.kata_kunci as string[]).map((item) => item.trim()).filter(Boolean))]
  }
  if ('boleh_dikirim' in input && typeof input.boleh_dikirim !== 'boolean') {
    return res.status(400).json({ error: 'Status persetujuan tidak valid.' })
  }

  try {
    const ref = firestore.collection('driveSamples').doc(id)
    const current = await ref.get()
    if (!current.exists) return res.status(404).json({ error: 'Sampel tidak ditemukan.' })
    if (input.boleh_dikirim === true) {
      const merged = { ...current.data(), ...changes }
      if (merged.is_missing) return res.status(400).json({ error: 'File ini sudah tidak ada di Drive, tidak bisa disetujui.' })
      if (!merged.jenjang || !merged.kelas || !merged.mapel || !merged.jenis_dokumen) {
        return res.status(400).json({ error: 'Lengkapi jenjang, kelas, mapel, dan jenis dokumen sebelum disetujui.' })
      }
    }
    if ('boleh_dikirim' in input) changes.boleh_dikirim = input.boleh_dikirim
    await ref.update(changes)
    return res.json({ ok: true })
  } catch (error) {
    console.error('Admin sample update failed:', error)
    return res.status(500).json({ error: 'Gagal menyimpan perubahan sampel.' })
  }
}

