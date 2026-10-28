import type { VercelRequest, VercelResponse } from '@vercel/node'
import { firestore, requireUser } from '../../_lib/clients.js'

const APP_ID = process.env.FIREBASE_PROJECT_ID || 'sobatguru-digital'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
  if (!await requireUser(req, res, ['admin'])) return
  const id = typeof req.body?.id === 'string' ? req.body.id.trim() : ''
  if (!id || id.length > 150) return res.status(400).json({ error: 'ID akun tidak valid.' })

  try {
    const batch = firestore.batch()
    batch.delete(firestore.collection(`artifacts/${APP_ID}/public/data/usersData`).doc(id))
    batch.delete(firestore.collection('internalAuth').doc(id))
    await batch.commit()
    return res.json({ ok: true })
  } catch (error) {
    const value = error as { code?: unknown; message?: unknown }
    console.error('Staff account deletion failed:', { code: value?.code, message: value?.message })
    return res.status(500).json({ error: 'Gagal menghapus akun staff.' })
  }
}

