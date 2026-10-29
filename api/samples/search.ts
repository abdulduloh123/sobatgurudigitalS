import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireUser } from '../_lib/clients.js'
import {
  analyzeText, driveClauses, driveSearch, getTexts, loadCatalog, mapLimit, parseQuery, resolveDriveFile,
  type CatalogEntry,
} from '../_lib/samples.js'

const PAGE_SIZE = 12
const TIER_ORDER = { frasa: 0, semua: 1, sebagian: 2, judul: 3 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })
  if (!await requireUser(req, res, ['cs', 'admin'])) return

  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : ''
  const folder = typeof req.query.folder === 'string' ? req.query.folder.slice(0, 300) : ''
  const offset = Math.max(0, Math.min(Number(req.query.offset) || 0, 500))
  const query = parseQuery(q)
  if (!query.terms.length) return res.status(400).json({ error: 'Ketik kata atau kalimat yang ingin dicari.' })

  try {
    const clauses = driveClauses(query)
    const [phraseHits, allHits] = await Promise.all([
      clauses.phrase ? driveSearch(clauses.phrase) : Promise.resolve([]),
      driveSearch(clauses.all),
    ])
    // Only widen to "any word" when the stricter searches find very little.
    const seen = new Set([...phraseHits, ...allHits].map((file) => file.id))
    const anyHits = clauses.any && seen.size < 8 ? await driveSearch(clauses.any) : []

    const ordered = [...phraseHits, ...allHits, ...anyHits].filter((file, index, list) =>
      file.id && list.findIndex((other) => other.id === file.id) === index)

    const { map } = await loadCatalog()
    const resolved: (CatalogEntry | null)[] = new Array(ordered.length).fill(null)
    await mapLimit(ordered.map((file, index) => ({ file, index })), 6, async ({ file, index }) => {
      resolved[index] = await resolveDriveFile(file, map)
    })
    const inScope = resolved.filter((entry): entry is CatalogEntry => entry !== null)
      .filter((entry) => !folder || entry.path === folder || entry.path.startsWith(`${folder}/`))

    const page = inScope.slice(offset, offset + PAGE_SIZE)
    const texts = await getTexts(page)
    const results = page.map((entry) => {
      const text = texts.get(entry.id) ?? ''
      const analysis = analyzeText(text, entry.name, query, 2)
      return {
        id: entry.id,
        name: entry.name,
        mimeType: entry.mimeType,
        path: entry.path,
        modifiedTime: entry.modifiedTime,
        readable: text.length > 0,
        ...analysis,
      }
    })
    // Within a page, show exact phrase matches before looser ones.
    results.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])

    return res.json({
      results,
      total: inScope.length,
      offset,
      hasMore: offset + PAGE_SIZE < inScope.length,
      widened: anyHits.length > 0,
    })
  } catch (error) {
    console.error('Sample search failed:', error)
    const message = error instanceof Error ? error.message : ''
    return res.status(500).json({
      error: /DRIVE_ROOT_FOLDER_ID/.test(message) ? message : 'Pencarian gagal. Coba lagi sebentar, atau minta admin memeriksa Vercel Logs.',
    })
  }
}
