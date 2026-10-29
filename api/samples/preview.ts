import type { VercelRequest, VercelResponse } from '@vercel/node'
import { QUOTA_MESSAGE, isQuotaError, requireUser } from '../_lib/clients.js'
import { analyzeText, getTexts, parseQuery, resolveFileId } from '../_lib/samples.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })
  if (!await requireUser(req, res, ['cs', 'admin'])) return

  const id = typeof req.query.id === 'string' ? req.query.id.trim() : ''
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : ''
  if (!id || id.length > 200) return res.status(400).json({ error: 'File tidak valid.' })

  try {
    const entry = await resolveFileId(id)
    if (!entry) return res.status(404).json({ error: 'File tidak ditemukan di folder sampel.' })
    const text = (await getTexts([entry])).get(entry.id) ?? ''
    const query = parseQuery(q)
    const analysis = query.terms.length ? analyzeText(text, entry.name, query, 12) : null
    return res.json({
      id: entry.id,
      name: entry.name,
      mimeType: entry.mimeType,
      path: entry.path,
      modifiedTime: entry.modifiedTime,
      readable: text.length > 0,
      chars: text.length,
      intro: text.slice(0, 900),
      occurrences: analysis?.occurrences ?? 0,
      passages: analysis?.passages ?? [],
    })
  } catch (error) {
    console.error('Sample preview failed:', error)
    return res.status(isQuotaError(error) ? 503 : 500).json({ error: isQuotaError(error) ? QUOTA_MESSAGE : 'Gagal membuka pratinjau dokumen.' })
  }
}
