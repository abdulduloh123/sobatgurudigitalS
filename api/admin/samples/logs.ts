import type { VercelRequest, VercelResponse } from '@vercel/node'
import { QUOTA_MESSAGE, firestore, isQuotaError, requireUser } from '../../_lib/clients.js'

const APP_ID = process.env.FIREBASE_PROJECT_ID || 'sobatguru-digital'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })
  if (!await requireUser(req, res, ['admin'])) return

  try {
    const [logs, users] = await Promise.all([
      firestore.collection('driveDownloadLogs').orderBy('created_at', 'desc').limit(500).get(),
      firestore.collection(`artifacts/${APP_ID}/public/data/usersData`).get(),
    ])
    // Older log entries only stored the user id.
    const names = new Map(users.docs.map((entry) => [entry.id, String(entry.data().name ?? entry.data().username ?? '')]))
    return res.json({
      logs: logs.docs.map((entry) => {
        const data = entry.data()
        return {
          id: entry.id,
          fileName: data.file_name ?? '',
          path: data.path ?? null,
          userName: data.user_name || names.get(data.user_id) || 'Akun tidak dikenal',
          guru: data.guru ?? null,
          catatan: data.catatan ?? null,
          createdAt: data.created_at ?? null,
        }
      }),
    })
  } catch (error) {
    console.error('Download log read failed:', error)
    return res.status(isQuotaError(error) ? 503 : 500).json({ error: isQuotaError(error) ? QUOTA_MESSAGE : 'Gagal memuat log unduhan.' })
  }
}
