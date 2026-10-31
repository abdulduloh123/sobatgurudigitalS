import type { VercelRequest, VercelResponse } from '@vercel/node'
import { QUOTA_MESSAGE, isQuotaError, requireUser } from '../_lib/clients.js'
import {
  MAX_DRIVE_HITS, analyzeText, driveClauses, driveSearch, getTexts, loadCatalog, mapLimit, nameScorer, parseQuery, recordMiss,
  resolveDriveFile, type CatalogEntry,
} from '../_lib/samples.js'

const PAGE_SIZE = 12
// How strongly each way of finding a file counts, before the file and folder name score is added.
const SOURCE_SCORE = { phrase: 300, all: 200, core: 100, any: 0 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })
  if (!await requireUser(req, res, ['cs', 'admin'])) return

  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : ''
  const folder = typeof req.query.folder === 'string' ? req.query.folder.slice(0, 300) : ''
  const offset = Math.max(0, Math.min(Number(req.query.offset) || 0, 5000))
  const query = parseQuery(q)
  if (!query.terms.length) return res.status(400).json({ error: 'Ketik kata atau kalimat yang ingin dicari.' })

  try {
    const clauses = driveClauses(query)
    const [phraseHits, allHits, coreHits] = await Promise.all([
      clauses.phrase ? driveSearch(clauses.phrase) : Promise.resolve([]),
      driveSearch(clauses.all),
      clauses.core ? driveSearch(clauses.core) : Promise.resolve([]),
    ])

    const { map } = await loadCatalog()
    const scoreName = nameScorer(query)
    const inFolder = (entry: CatalogEntry) => !folder || entry.path === folder || entry.path.startsWith(`${folder}/`)
    const candidates = new Map<string, { entry: CatalogEntry; score: number }>()
    const addHits = async (files: typeof allHits, source: number) => {
      const fresh = [...new Map(files.map((file) => [file.id, file])).values()].filter((file) => file.id && !candidates.has(file.id))
      await mapLimit(fresh, 6, async (file) => {
        const entry = await resolveDriveFile(file, map)
        if (entry && inFolder(entry)) candidates.set(entry.id, { entry, score: source + scoreName(entry).score })
      })
    }

    await addHits(phraseHits, SOURCE_SCORE.phrase)
    await addHits(allHits, SOURCE_SCORE.all)
    await addHits(coreHits, SOURCE_SCORE.core)
    // Drive does not search folder names, so files matched only by their path come from the catalog.
    for (const entry of map.values()) {
      if (candidates.has(entry.id) || !inFolder(entry)) continue
      const { score, allTerms } = scoreName(entry)
      if (allTerms) candidates.set(entry.id, { entry, score: SOURCE_SCORE.all + score })
    }

    // Only widen to "any word" when the stricter searches find very little in this folder.
    const strictCount = candidates.size
    const anyHits = clauses.any && strictCount < 8 ? await driveSearch(clauses.any) : []
    await addHits(anyHits, SOURCE_SCORE.any)

    const ranked = [...candidates.values()].sort((a, b) => b.score - a.score).map((item) => item.entry)
    if (!ranked.length && !folder && !offset) await recordMiss(q)

    const page = ranked.slice(offset, offset + PAGE_SIZE)
    const texts = await getTexts(page)
    const scored = page.map((entry) => {
      const text = texts.get(entry.id) ?? ''
      const { score, ...analysis } = analyzeText(text, entry, query, 2)
      return {
        score,
        result: {
          id: entry.id,
          name: entry.name,
          mimeType: entry.mimeType,
          path: entry.path,
          modifiedTime: entry.modifiedTime,
          readable: text.length > 0,
          ...analysis,
        },
      }
    })
    // Refine the selected page by body relevance; ties keep the overall rank.
    // This intentionally avoids reading every candidate's text on every search.
    scored.sort((a, b) => b.score - a.score)
    const results = scored.map(({ result }) => result)

    return res.json({
      results,
      total: ranked.length,
      capped: [phraseHits, allHits, coreHits, anyHits].some((hits) => hits.length >= MAX_DRIVE_HITS),
      offset,
      hasMore: offset + PAGE_SIZE < ranked.length,
      widened: candidates.size > strictCount,
    })
  } catch (error) {
    console.error('Sample search failed:', error)
    const message = error instanceof Error ? error.message : ''
    if (isQuotaError(error)) return res.status(503).json({ error: QUOTA_MESSAGE })
    return res.status(500).json({
      error: /DRIVE_ROOT_FOLDER_ID/.test(message) ? message : 'Pencarian gagal. Coba lagi sebentar, atau minta admin memeriksa Vercel Logs.',
    })
  }
}
