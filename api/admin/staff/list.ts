import type { VercelRequest, VercelResponse } from '@vercel/node'
import { firestore, requireUser } from '../../_lib/clients.js'

const APP_ID = process.env.FIREBASE_PROJECT_ID || 'sobatguru-digital'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })
  if (!await requireUser(req, res, ['admin'])) return

  try {
    const snapshot = await firestore.collection(`artifacts/${APP_ID}/public/data/usersData`).get()
    const users = snapshot.docs
      .map((entry) => {
        const data = entry.data()
        return { id: entry.id, name: data.name ?? '', username: data.username ?? '', role: data.role ?? 'staff' }
      })
      .filter((user) => user.role === 'staff')
    return res.json({ users })
  } catch (error) {
    const value = error as { code?: unknown; message?: unknown }
    console.error('Staff list read failed:', { code: value?.code, message: value?.message })
    return res.status(500).json({ error: 'Gagal memuat daftar staff.' })
  }
}

