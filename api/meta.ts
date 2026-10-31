import type { IncomingMessage, ServerResponse } from 'node:http'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { QUOTA_MESSAGE, isQuotaError, requireUser } from './_lib/clients.js'
import {
  MetaError, connect, getConnection, loginUrl, readAds, readState, saveLeads, syncAds, validSignature, verifyToken,
} from './_lib/meta.js'

// Lead notifications are signed over the exact bytes Meta sent, so the runtime must not parse the body first.
export const config = { helpers: false }

const MAX_REPORT_DAYS = 400
const DATE = /^\d{4}-\d{2}-\d{2}$/

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array))
  return Buffer.concat(chunks)
}

function closeWindow(res: ServerResponse, title: string, detail: string) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font-family:system-ui;max-width:420px;margin:15vh auto;padding:0 16px;text-align:center"><h1 style="font-size:20px">${title}</h1><p>${detail}</p>
<script>if(window.opener){window.opener.postMessage('meta-connected',location.origin);setTimeout(function(){window.close()},1500)}</script></body></html>`)
}

async function callback(res: ServerResponse, url: URL) {
  const state = readState(url.searchParams.get('state') ?? '')
  const code = url.searchParams.get('code')
  if (!state || !code) {
    res.statusCode = 400
    return closeWindow(res, 'Gagal menghubungkan', 'Izin dibatalkan atau tautan kedaluwarsa. Tutup halaman ini, lalu coba lagi dari dashboard.')
  }
  try {
    await connect(code, state.userId)
    closeWindow(res, 'Meta terhubung', 'Halaman ini bisa ditutup. Kembali ke dashboard.')
  } catch (error) {
    console.error('Meta connect failed:', error)
    res.statusCode = 500
    closeWindow(res, 'Gagal menghubungkan', 'Meta menolak sambungan. Coba lagi, atau minta admin memeriksa Vercel Logs.')
  }
}

async function webhook(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === 'GET') {
    const token = verifyToken()
    const allowed = token && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === token
    res.statusCode = allowed ? 200 : 403
    return res.end(allowed ? url.searchParams.get('hub.challenge') ?? '' : 'Forbidden')
  }
  const body = await readBody(req)
  const signature = req.headers['x-hub-signature-256']
  if (typeof signature !== 'string' || !validSignature(body, signature)) {
    res.statusCode = 401
    return res.end('Invalid signature')
  }
  await saveLeads(JSON.parse(body.toString()))
  res.end('OK')
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', 'https://internal')
  const action = url.searchParams.get('action') ?? url.pathname.split('/').pop()

  try {
    if (action === 'callback') return await callback(response, url)
    if (action === 'lead-webhook') return await webhook(request, response, url)

    // requireUser answers through the helpers that are turned off above.
    const res = response as VercelResponse
    res.status = (code: number) => { response.statusCode = code; return res }
    res.json = (value: unknown) => {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify(value))
      return res
    }
    const user = await requireUser(request as VercelRequest, res, ['admin'])
    if (!user) return

    if (action === 'connect' && request.method === 'POST') return res.json({ url: loginUrl(user.id) })

    if (action === 'status' && request.method === 'GET') {
      const connection = await getConnection()
      return res.json(connection ? {
        connected: true,
        pageName: connection.pageName,
        pageError: connection.pageError,
        expiresAt: connection.expiresAt,
        lastSyncAt: connection.lastSyncAt,
        lastError: connection.lastError,
        needsReconnect: connection.needsReconnect,
      } : { connected: false })
    }

    if (action === 'sync' && request.method === 'POST') {
      const connection = await getConnection()
      if (!connection) return res.status(400).json({ error: 'Meta belum dihubungkan.' })
      return res.json(await syncAds(connection, url.searchParams.get('force') === '1'))
    }

    if (action === 'report' && request.method === 'GET') {
      const from = url.searchParams.get('from') ?? ''
      const to = url.searchParams.get('to') ?? ''
      if (!DATE.test(from) || !DATE.test(to) || from > to) return res.status(400).json({ error: 'Rentang tanggal tidak valid.' })
      if (new Date(to).getTime() - new Date(from).getTime() > MAX_REPORT_DAYS * 86_400_000) return res.status(400).json({ error: `Rentang maksimal ${MAX_REPORT_DAYS} hari.` })
      return res.json({ days: await readAds(from, to) })
    }

    return res.status(404).json({ error: 'Perintah tidak dikenal.' })
  } catch (error) {
    console.error('Meta request failed:', action, error)
    response.statusCode = isQuotaError(error) ? 503 : error instanceof MetaError ? 502 : 500
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: isQuotaError(error) ? QUOTA_MESSAGE : error instanceof Error ? error.message.slice(0, 300) : 'Gagal menghubungi Meta.' }))
  }
}
