// =====================================================================
//  Firebase Cloud Functions (v2) — jembatan server ke Meta
//  Deploy:  firebase functions:secrets:set META_ACCESS_TOKEN   (System User token: ads_management + leads_retrieval + pages_show_list)
//           firebase functions:secrets:set META_VERIFY_TOKEN   (bebas, dipakai saat setup webhook)
//           firebase functions:secrets:set META_APP_SECRET
//           firebase deploy --only functions
//  package.json: "firebase-admin", "firebase-functions" (Node 20)
//  Access token HANYA hidup di Secret Manager — jangan simpan di Firestore/klien.
// =====================================================================
const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

// PENTING: samakan dengan lokasi database Firestore Anda (Firebase Console > Firestore > Location), mis. 'asia-southeast2' (Jakarta)
const REGION = 'asia-southeast2';
setGlobalOptions({ region: REGION });
admin.initializeApp();
const db = admin.firestore();
const TOKEN = defineSecret('META_ACCESS_TOKEN');
const VERIFY = defineSecret('META_VERIFY_TOKEN');
const APP_SECRET = defineSecret('META_APP_SECRET');

const APP_ID = 'sobatguru-digital';
const GRAPH = 'https://graph.facebook.com/v23.0'; // sesuaikan dengan versi Graph API terbaru
const BASE = `artifacts/${APP_ID}/public/data`;
const CLIENT_EVENTS = ['PageView', 'ViewContent', 'Contact', 'InitiateCheckout']; // event yang boleh dikirim dari browser

const sha = (v) => crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
const phone62 = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('0') ? '62' + d.slice(1) : d; };
const getCfg = async () => (await db.doc(`${BASE}/metaConfig/main`).get()).data() || {};

async function sendToMeta(cfg, event, token) {
    const ids = cfg.pixelIds || [];
    if (!cfg.enabled || !ids.length) return { skipped: 'tracking nonaktif / pixel kosong' };
    const out = [];
    for (const id of ids) {
        const body = { data: [event], ...(cfg.testEventCode ? { test_event_code: cfg.testEventCode } : {}) };
        const r = await fetch(`${GRAPH}/${id}/events?access_token=${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        out.push({ pixel: id, status: r.status, res: await r.json() });
    }
    return out;
}

const userData = (l) => ({
    ...(l.phone && { ph: [sha(phone62(l.phone))] }),
    ...(l.email && { em: [sha(l.email)] }),
    ...(l.name && { fn: [sha(String(l.name).split(' ')[0])] }),
    ...(l.fbp && { fbp: l.fbp }), ...(l.fbc && { fbc: l.fbc }),
    ...(l.ua && { client_user_agent: l.ua }),
    ...(l.metaLeadId && { lead_id: Number(l.metaLeadId) }),
});

// 1) Event dari browser (Contact klik WA, ViewContent, dst) — dedup dgn Pixel lewat event_id yang sama
exports.metaEvent = onRequest({ cors: true, secrets: [TOKEN] }, async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('POST only');
    const b = req.body || {};
    const cfg = await getCfg();
    if (!b.test && !CLIENT_EVENTS.includes(b.name)) return res.status(400).json({ error: 'event tidak diizinkan' });
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    const event = {
        event_name: b.name, event_time: Math.floor(Date.now() / 1000), event_id: b.eventId, action_source: 'website', event_source_url: b.url,
        user_data: { client_ip_address: ip, client_user_agent: b.ua, ...(b.fbp && { fbp: b.fbp }), ...(b.fbc && { fbc: b.fbc }) },
        custom_data: b.custom || {},
    };
    const cfgUse = b.test ? { ...cfg, enabled: true } : cfg;
    res.json(await sendToMeta(cfgUse, event, TOKEN.value()));
});

// 2) Lead baru dari website -> event Lead (server) dengan event_id sama dengan Pixel (dedup)
exports.onLeadCreated = onDocumentCreated({ document: `${BASE}/leadsData/{id}`, secrets: [TOKEN] }, async (e) => {
    const l = e.data.data();
    if (l.origin !== 'website') return; // Lead dari Meta Lead Ads sudah tercatat di Meta
    const r = await sendToMeta(await getCfg(), {
        event_name: 'Lead', event_time: Math.floor(Date.now() / 1000), event_id: l.metaEventId, action_source: 'website', event_source_url: l.url || 'https://sobatguru-digital.web.app',
        user_data: userData(l), custom_data: { content_name: l.lp || 'sampel_gratis' },
    }, TOKEN.value());
    await e.data.ref.update({ 'metaSent.Lead': true, metaLog: JSON.stringify(r).slice(0, 500) });
});

// 3) Status CRM berubah -> Purchase (umpan balik ke Meta agar iklan optimasi ke pembeli nyata)
exports.onLeadStatus = onDocumentUpdated({ document: `${BASE}/leadsData/{id}`, secrets: [TOKEN] }, async (e) => {
    const a = e.data.before.data(), l = e.data.after.data();
    if (a.status === l.status || l.status !== 'konversi' || l.metaSent?.Purchase) return;
    const isLeadAd = l.origin === 'meta_lead_ads';
    const r = await sendToMeta(await getCfg(), {
        event_name: 'Purchase', event_time: Math.floor(Date.now() / 1000), event_id: `Purchase_${e.params.id}`,
        action_source: isLeadAd ? 'system_generated' : 'chat', user_data: userData(l),
        custom_data: { value: Number(l.saleAmount) || 0, currency: 'IDR', ...(isLeadAd && { event_source: 'crm', lead_event_source: 'SobatGuruCRM' }) },
    }, TOKEN.value());
    await e.data.after.ref.update({ 'metaSent.Purchase': true, metaLog: JSON.stringify(r).slice(0, 500) });
});

// 4) Webhook Meta Lead Ads (Instant Form) -> masuk Pusat Leads
exports.metaLeadWebhook = onRequest({ secrets: [TOKEN, VERIFY, APP_SECRET] }, async (req, res) => {
    if (req.method === 'GET') {
        return req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY.value()
            ? res.status(200).send(req.query['hub.challenge']) : res.sendStatus(403);
    }
    const sig = (req.headers['x-hub-signature-256'] || '').toString().replace('sha256=', '');
    const expect = crypto.createHmac('sha256', APP_SECRET.value()).update(req.rawBody).digest('hex');
    if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return res.sendStatus(401);

    for (const entry of req.body.entry || []) for (const ch of entry.changes || []) {
        if (ch.field !== 'leadgen') continue;
        const v = ch.value; const t = TOKEN.value();
        try {
            const lead = await (await fetch(`${GRAPH}/${v.leadgen_id}?access_token=${t}`)).json();
            const f = {}; (lead.field_data || []).forEach(x => { f[x.name] = (x.values || [])[0]; });
            let campaign = null;
            try { const ad = await (await fetch(`${GRAPH}/${v.ad_id}?fields=name,campaign{name}&access_token=${t}`)).json(); campaign = ad.campaign?.name || ad.name || null; } catch { }
            await db.doc(`${BASE}/leadsData/meta_${v.leadgen_id}`).set({
                name: f.full_name || f.first_name || 'Tanpa Nama', phone: f.phone_number || '', phoneNorm: phone62(f.phone_number), email: f.email || null,
                date: new Date((v.created_time || Date.now() / 1000) * 1000).toISOString(), status: 'belum_dichat',
                source: 'facebook', medium: 'lead_ads', campaign, content: v.ad_id || null, origin: 'meta_lead_ads',
                metaLeadId: v.leadgen_id, formId: v.form_id || null, pageId: v.page_id || null, ref: null,
            }, { merge: true }); // id tetap -> anti duplikat bila webhook dikirim ulang
        } catch (err) { console.error('leadgen error', err); }
    }
    res.sendStatus(200);
});
