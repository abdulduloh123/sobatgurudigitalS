import { createHmac, timingSafeEqual } from 'node:crypto'
import { firestore } from './clients.js'

const GRAPH = 'https://graph.facebook.com/v23.0'
const REDIRECT_URI = process.env.META_REDIRECT_URI?.trim() || 'https://www.mitragurudigitalindonesia.my.id/api/meta/callback'
const PAGE_ID = process.env.META_PAGE_ID?.trim() || '729393246922816'
const SCOPES = 'ads_read,leads_retrieval,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management'
const STATE_MS = 15 * 60_000
// A connected account refreshes when an admin opens the report, at most this often.
const FRESH_MS = 6 * 60 * 60_000
const FIRST_SYNC_DAYS = 90
const LATER_SYNC_DAYS = 7
// Raising this refills the stored days once, for when a new field is added to them.
const SYNC_VERSION = 2
const CHAT_ACTION = 'onsite_conversion.messaging_conversation_started_7d'

export const connectionRef = () => firestore.doc('metaConnection/main')
export const campaignNames = () => firestore.doc('metaConnection/campaigns')
export const adsDaily = () => firestore.collection('adsDaily')
const leadsCollection = () => firestore.collection(`artifacts/${process.env.FIREBASE_PROJECT_ID || 'sobatguru-digital'}/public/data/leadsData`)

export type AdCampaign = { id: string; name: string; spend: number; impressions: number; clicks: number; chats: number }
export type Connection = {
  userToken: string
  pageToken: string | null
  pageId: string | null
  pageName: string | null
  pageError: string | null
  connectedBy: string
  connectedAt: string
  expiresAt: string | null
  lastSyncAt: string | null
  syncVersion?: number
  syncAccounts?: string
  lastError: string | null
  needsReconnect: boolean
}

function env(name: 'META_APP_ID' | 'META_APP_SECRET' | 'META_AD_ACCOUNT_ID') {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} belum diisi di Vercel.`)
  return value
}

export const appSecret = () => env('META_APP_SECRET')
// Several ids may be listed with commas, for a business that moved to a new ad account.
const adAccounts = () => env('META_AD_ACCOUNT_ID').split(',').map((id) => `act_${id.trim().replace(/^act_/, '')}`).filter((id) => id !== 'act_')

/** Errors from Meta, kept apart so an expired token can ask the admin to reconnect. */
export class MetaError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message)
  }
  get expired() {
    return this.code === 190 || this.code === 102
  }
}

async function graph<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const json = await response.json().catch(() => ({})) as T & { error?: { message?: string; code?: number } }
  if (!response.ok || json.error) throw new MetaError(json.error?.message || `Meta menolak permintaan (HTTP ${response.status}).`, json.error?.code)
  return json
}

const sign = (value: string) => createHmac('sha256', appSecret()).update(value).digest('base64url')

function sameText(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Facebook Login for Business apps pick permissions through a saved configuration instead of a scope list. */
export function loginUrl(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, expires: Date.now() + STATE_MS })).toString('base64url')
  const params = new URLSearchParams({
    client_id: env('META_APP_ID'),
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state: `${payload}.${sign(payload)}`,
  })
  const configId = process.env.META_LOGIN_CONFIG_ID?.trim()
  if (configId) params.set('config_id', configId)
  else params.set('scope', SCOPES)
  return `https://www.facebook.com/v23.0/dialog/oauth?${params}`
}

export function readState(state: string) {
  const [payload = '', signature = ''] = state.split('.')
  if (!payload || !sameText(signature, sign(payload))) return null
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { userId: string; expires: number }
  return value.expires > Date.now() ? value : null
}

/** Trades the login code for a long-lived token and subscribes the Page to lead notifications. */
export async function connect(code: string, userId: string) {
  const base = { client_id: env('META_APP_ID'), client_secret: appSecret() }
  const short = await graph<{ access_token: string }>(`${GRAPH}/oauth/access_token?${new URLSearchParams({ ...base, redirect_uri: REDIRECT_URI, code })}`)
  const long = await graph<{ access_token: string; expires_in?: number }>(`${GRAPH}/oauth/access_token?${new URLSearchParams({ ...base, grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token })}`)

  let pageToken: string | null = null
  let pageName: string | null = null
  let pageError: string | null = null
  try {
    const pages = await graph<{ data?: { id: string; name: string; access_token: string }[] }>(`${GRAPH}/me/accounts?${new URLSearchParams({ fields: 'id,name,access_token', limit: '100', access_token: long.access_token })}`)
    const page = pages.data?.find((item) => item.id === PAGE_ID)
    if (!page) throw new Error('Halaman Facebook tidak ikut dipilih saat login.')
    pageToken = page.access_token
    pageName = page.name
    await graph(`${GRAPH}/${PAGE_ID}/subscribed_apps`, {
      method: 'POST',
      body: new URLSearchParams({ subscribed_fields: 'leadgen', access_token: page.access_token }),
    })
  } catch (error) {
    pageError = error instanceof Error ? error.message.slice(0, 300) : 'Halaman gagal dihubungkan.'
  }

  const connection: Connection = {
    userToken: long.access_token,
    pageToken,
    pageId: pageToken ? PAGE_ID : null,
    pageName,
    pageError,
    connectedBy: userId,
    connectedAt: new Date().toISOString(),
    expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null,
    lastSyncAt: null,
    lastError: null,
    needsReconnect: false,
  }
  await connectionRef().set(connection)
}

export async function getConnection() {
  const snapshot = await connectionRef().get()
  return snapshot.exists ? snapshot.data() as Connection : null
}

const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10)

type InsightRow = { date_start: string; campaign_id: string; campaign_name: string; spend?: string; impressions?: string; clicks?: string; actions?: { action_type: string; value: string }[] }

async function fetchInsights(token: string, account: string, since: string, until: string) {
  const rows: InsightRow[] = []
  let url: string | undefined = `${GRAPH}/${account}/insights?${new URLSearchParams({
    level: 'campaign',
    time_increment: '1',
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions',
    time_range: JSON.stringify({ since, until }),
    limit: '500',
    access_token: token,
  })}`
  while (url) {
    const page: { data?: InsightRow[]; paging?: { next?: string } } = await graph(url)
    rows.push(...page.data ?? [])
    url = page.paging?.next
  }
  return rows
}

/** Stores spend per day, one document a day, so a month of report costs about 30 reads. */
export async function syncAds(connection: Connection, force = false) {
  const accounts = adAccounts()
  const accountKey = accounts.join(',')
  // Adding an account or a stored field refills the earlier days once.
  const current = connection.syncVersion === SYNC_VERSION && connection.syncAccounts === accountKey
  const last = connection.lastSyncAt && current ? new Date(connection.lastSyncAt).getTime() : 0
  if (!force && Date.now() - last < FRESH_MS) return { synced: false, lastSyncAt: connection.lastSyncAt }

  const days = last ? LATER_SYNC_DAYS : FIRST_SYNC_DAYS
  const dates = Array.from({ length: days }, (_, index) => isoDay(Date.now() - index * 86_400_000))
  try {
    const results = await Promise.allSettled(accounts.map((account) => fetchInsights(connection.userToken, account, dates[dates.length - 1], dates[0])))
    const failed = results.flatMap((result, index) => result.status === 'rejected' ? [{ account: accounts[index], reason: result.reason as unknown }] : [])
    const rows = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    // One unreadable old account should not hide the current one, but the report must say so.
    const expired = failed.find((item) => item.reason instanceof MetaError && item.reason.expired)
    if (expired || failed.length === accounts.length) throw (expired ?? failed[0]).reason
    const partialError = failed.length ? `Akun iklan ${failed.map((item) => item.account.replace('act_', '')).join(', ')} tidak bisa dibaca, jadi biayanya belum masuk.` : null
    const byDate = new Map<string, AdCampaign[]>(dates.map((date) => [date, []]))
    for (const row of rows) {
      byDate.get(row.date_start)?.push({
        id: row.campaign_id,
        name: row.campaign_name,
        spend: Number(row.spend) || 0,
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        chats: Number(row.actions?.find((action) => action.action_type === CHAT_ACTION)?.value) || 0,
      })
    }
    const lastSyncAt = new Date().toISOString()
    const batch = firestore.batch()
    for (const [date, campaigns] of byDate) batch.set(adsDaily().doc(date), { date, campaigns })
    // Newest first, so CS sees the campaigns running now at the top of the closing form.
    const names = [...new Set(dates.flatMap((date) => (byDate.get(date) ?? []).filter((item) => item.spend > 0).map((item) => item.name)))]
    batch.set(campaignNames(), { names })
    batch.update(connectionRef(), { lastSyncAt, syncVersion: SYNC_VERSION, syncAccounts: accountKey, lastError: partialError, needsReconnect: false })
    await batch.commit()
    return { synced: true, lastSyncAt }
  } catch (error) {
    const expired = error instanceof MetaError && error.expired
    const lastError = error instanceof Error ? error.message.slice(0, 300) : 'Gagal mengambil data iklan.'
    await connectionRef().update({ lastError, needsReconnect: expired })
    throw error
  }
}

export async function readAds(from: string, to: string) {
  const snapshot = await adsDaily().where('date', '>=', from).where('date', '<=', to).get()
  return snapshot.docs.map((doc) => doc.data() as { date: string; campaigns: AdCampaign[] })
}

export async function readCampaignNames() {
  return ((await campaignNames().get()).data()?.names ?? []) as string[]
}

export async function readPixels(connection: Connection) {
  const result = await graph<{ data?: { id: string; name: string; last_fired_time?: string }[] }>(`${GRAPH}/${adAccounts()[0]}/adspixels?${new URLSearchParams({ fields: 'id,name,last_fired_time', access_token: connection.userToken })}`)
  return result.data ?? []
}

export function validSignature(rawBody: Buffer, header: string) {
  const expected = createHmac('sha256', appSecret()).update(rawBody).digest('hex')
  return sameText(header.replace('sha256=', ''), expected)
}

export const verifyToken = () => process.env.META_VERIFY_TOKEN?.trim() ?? ''

const phone62 = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

type LeadChange = { leadgen_id: string; ad_id?: string; form_id?: string; page_id?: string; created_time?: number }
type LeadPayload = { entry?: { changes?: { field?: string; value?: LeadChange }[] }[] }

/** Saves each new Instant Form lead to the CRM. The fixed id keeps a repeated notification from duplicating it. */
export async function saveLeads(payload: LeadPayload) {
  const connection = await getConnection()
  if (!connection?.pageToken) throw new Error('Meta belum dihubungkan, atau Halaman belum tersambung.')
  const token = connection.pageToken
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (change.field !== 'leadgen' || !value?.leadgen_id) continue
      try {
        const lead = await graph<{ field_data?: { name: string; values?: string[] }[] }>(`${GRAPH}/${value.leadgen_id}?${new URLSearchParams({ access_token: token })}`)
        const fields = Object.fromEntries((lead.field_data ?? []).map((item) => [item.name, item.values?.[0]]))
        const ad = value.ad_id
          ? await graph<{ name?: string; campaign?: { name?: string } }>(`${GRAPH}/${value.ad_id}?${new URLSearchParams({ fields: 'name,campaign{name}', access_token: connection.userToken })}`).catch(() => null)
          : null
        await leadsCollection().doc(`meta_${value.leadgen_id}`).set({
          name: fields.full_name || fields.first_name || 'Tanpa Nama',
          phone: fields.phone_number || '',
          phoneNorm: phone62(fields.phone_number),
          email: fields.email || null,
          date: new Date((value.created_time || Date.now() / 1000) * 1000).toISOString(),
          status: 'belum_dichat',
          source: 'facebook',
          medium: 'lead_ads',
          campaign: ad?.campaign?.name || ad?.name || null,
          content: value.ad_id || null,
          origin: 'meta_lead_ads',
          metaLeadId: value.leadgen_id,
          formId: value.form_id || null,
          pageId: value.page_id || null,
          ref: null,
        }, { merge: true })
      } catch (error) {
        console.error('Meta lead failed:', value.leadgen_id, error)
      }
    }
  }
}
