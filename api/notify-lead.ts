import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { firestore } from './_lib/clients'

const MAX_AGE_MS = 10 * 60_000
const leads = () => firestore.collection(`artifacts/${process.env.FIREBASE_PROJECT_ID || 'sobatguru-digital'}/public/data/leadsData`)
const clean = (value: unknown, max = 120) => String(value ?? '').replace(/[\r\n]+/g, ' ').slice(0, max)

/**
 * Tells the admin on Telegram that a new lead arrived. The browser only sends the lead id: the server
 * reads the lead itself, accepts only fresh ones and notifies each lead once, so the URL cannot be
 * used to send arbitrary text or to spam the chat.
 * Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID; without them it does nothing.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return response.status(200).json({ sent: false, reason: 'not-configured' })

  const leadId = typeof request.body?.leadId === 'string' ? request.body.leadId : ''
  if (!/^[A-Za-z0-9]{10,40}$/.test(leadId)) return response.status(400).json({ error: 'Lead tidak valid.' })

  try {
    const ref = leads().doc(leadId)
    const lead = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref)
      const data = snapshot.data()
      if (!data || data.notifiedAt) return null
      if (Date.now() - new Date(data.date).getTime() > MAX_AGE_MS) return null
      transaction.update(ref, { notifiedAt: FieldValue.serverTimestamp() })
      return data
    })
    if (!lead) return response.status(200).json({ sent: false })

    const source = lead.source ? `${clean(lead.source, 40)}${lead.campaign ? ` / ${clean(lead.campaign, 60)}` : ''}` : 'langsung'
    const text = ['Lead baru!', `Nama: ${clean(lead.name)}`, `WA: ${clean(lead.phone, 30)}`, `Sumber: ${source}`].join('\n')
    const result = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!result.ok) {
      // Let a later retry notify this lead again.
      await ref.update({ notifiedAt: FieldValue.delete() }).catch(() => undefined)
      return response.status(502).json({ sent: false })
    }
    return response.status(200).json({ sent: true })
  } catch (error) {
    console.error('Notify lead failed', error)
    return response.status(500).json({ sent: false })
  }
}
