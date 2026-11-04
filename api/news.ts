import type { VercelRequest, VercelResponse } from '@vercel/node'

// Sumber berita pendidikan (RSS). Hanya judul + link yang ditampilkan;
// pembaca diarahkan ke situs aslinya.
const FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=(guru+OR+kurikulum+OR+kemendikdasmen+OR+%22modul+ajar%22)+pendidikan+when:7d&hl=id&gl=ID&ceid=ID:id',
    fallbackSource: 'Google News',
  },
  { url: 'https://www.republika.co.id/rss/pendidikan', fallbackSource: 'Republika' },
]

const MAX_ITEMS = 9
const MAX_PER_FEED = 5

export interface NewsItem {
  title: string
  link: string
  source: string
  publishedAt: string | null
}

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .trim()
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? decode(match[1]) : ''
}

function parseFeed(xml: string, fallbackSource: string): NewsItem[] {
  const items: NewsItem[] = []
  for (const [, block] of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)) {
    let title = tag(block, 'title')
    const link = tag(block, 'link')
    const source = tag(block, 'source') || fallbackSource
    // Google News menambahkan " - Nama Media" di akhir judul.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3))
    const date = new Date(tag(block, 'pubDate'))
    if (!title || !/^https?:\/\//.test(link)) continue
    items.push({ title, link, source, publishedAt: isNaN(date.getTime()) ? null : date.toISOString() })
  }
  return items
}

async function fetchFeed(url: string, fallbackSource: string): Promise<NewsItem[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SobatGuruDigital/1.0)' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    // Ambil beberapa yang terbaru per sumber agar campuran berita seimbang.
    return parseFeed(await response.text(), fallbackSource)
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, MAX_PER_FEED)
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan GET.' })

  const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed.url, feed.fallbackSource)))
  results.forEach((result, i) => {
    if (result.status === 'rejected') console.error(`RSS gagal: ${FEEDS[i].url}`, result.reason)
  })

  const seen = new Set<string>()
  const items = results
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .filter((item) => {
      const key = item.title.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, MAX_ITEMS)

  if (!items.length) return res.status(502).json({ error: 'Berita belum bisa dimuat.', items: [] })

  // Disimpan di cache Vercel 30 menit agar situs sumber tidak dipanggil tiap kunjungan.
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
  return res.json({ items, updatedAt: new Date().toISOString() })
}
