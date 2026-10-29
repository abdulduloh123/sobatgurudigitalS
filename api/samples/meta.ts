import type { VercelRequest, VercelResponse } from '@vercel/node'
import { QUOTA_MESSAGE, isQuotaError, requireUser } from '../_lib/clients.js'
import { loadCatalog } from '../_lib/samples.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })
  if (!await requireUser(req, res, ['cs', 'admin'])) return

  try {
    const { meta } = await loadCatalog()
    if (!meta) return res.json({ meta: null })
    const { fileCount, readableCount, failedCount, folders, indexedAt } = meta
    return res.json({ meta: { fileCount, readableCount, failedCount, folders, indexedAt } })
  } catch (error) {
    console.error('Sample meta read failed:', error)
    return res.status(isQuotaError(error) ? 503 : 500).json({ error: isQuotaError(error) ? QUOTA_MESSAGE : 'Gagal membaca status katalog.' })
  }
}
