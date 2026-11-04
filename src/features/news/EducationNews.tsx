import { useEffect, useState } from 'react'
import { ExternalLink, Newspaper } from 'lucide-react'

interface NewsItem {
  title: string
  link: string
  source: string
  publishedAt: string | null
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function EducationNews() {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/news')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => { if (active) setItems(data.items ?? []) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])

  // Kalau sumber RSS sedang bermasalah, bagian ini disembunyikan saja.
  if (failed || (items && items.length === 0)) return null

  return (
    <section className="py-16 px-4 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <Newspaper className="text-blue-600" size={28} /> Berita Pendidikan Terbaru
          </h2>
          <div className="h-1 w-20 bg-yellow-500 mx-auto mt-2 rounded"></div>
          <p className="text-sm text-gray-500 mt-3">Info terkini seputar guru dan dunia pendidikan Indonesia</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items === null
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
              ))
            : items.map((item) => (
                <a
                  key={item.link}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group flex flex-col justify-between bg-gray-50 hover:bg-blue-50 p-5 rounded-xl border border-gray-100 hover:border-blue-200 shadow-sm transition"
                >
                  <h3 className="font-bold text-sm text-gray-800 group-hover:text-blue-700 line-clamp-3">{item.title}</h3>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate">{item.source}{item.publishedAt ? ` · ${timeAgo(item.publishedAt)}` : ''}</span>
                    <ExternalLink size={14} className="shrink-0 ml-2 text-gray-400 group-hover:text-blue-600" />
                  </div>
                </a>
              ))}
        </div>
      </div>
    </section>
  )
}
