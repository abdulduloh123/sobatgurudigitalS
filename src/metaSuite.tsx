// @ts-nocheck
// =====================================================================
//  metaSuite.tsx — Meta Pixel + CAPI, Landing Page, Traffic, Leads CRM
//  Sobat Guru Digital ERP. Letakkan sejajar dengan App.tsx (src/).
//  Koleksi Firestore baru (semua di artifacts/{appId}/public/data/):
//    metaConfig/main      -> konfigurasi pixel (TIDAK berisi access token)
//    metaLandingPages/*   -> daftar landing page (slug = doc id)
//    trafficData/{sid}    -> 1 dokumen per sesi pengunjung
//    leadsData/*          -> (existing) + field atribusi & status sinkron Meta
// =====================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { Copy, CheckCircle, XCircle, Zap, Globe, TrendingUp, MessageCircle, ExternalLink, Trash2, PlusCircle, Send, AlertTriangle, Edit } from 'lucide-react';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, arrayUnion, query, orderBy, limit, where } from 'firebase/firestore';

const col = (db, appId, name) => collection(db, 'artifacts', appId, 'public', 'data', name);
const ctx = { db: null, appId: null, cfg: null, sid: null, active: false, last: null };
const WA_NUMBERS = ['+6287781601968', '+6287822186229', '+6285724043082']; // samakan dgn redirectWA di App.tsx

const uid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const cookie = (n) => (document.cookie.split('; ').find(r => r.startsWith(n + '=')) || '').split('=')[1] || null;
const normPhone = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('0') ? '62' + d.slice(1) : d; };
const ss = { // sessionStorage aman untuk iframe/CSP
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { } },
};
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '-');
const classify = (h) => /facebook|fb\.com|fb\.me|messenger/.test(h) ? 'facebook' : /instagram/.test(h) ? 'instagram' : /google/.test(h) ? 'google' : /tiktok/.test(h) ? 'tiktok' : /youtube|youtu\.be/.test(h) ? 'youtube' : /wa\.me|whatsapp/.test(h) ? 'whatsapp' : h;

// ------------------------- ATRIBUSI & TRACKING CORE -------------------------
export function getAttribution() {
    const q = new URLSearchParams(location.search);
    const fbclid = q.get('fbclid');
    const hasNew = fbclid || q.get('utm_source') || q.get('ref') || q.get('lp');
    let saved = null; try { saved = JSON.parse(ss.get('sg_attr')); } catch { }
    if (saved && !hasNew) return saved;
    let host = ''; try { host = document.referrer ? new URL(document.referrer).hostname : ''; } catch { }
    if (host === location.hostname) host = '';
    const a = {
        source: (q.get('utm_source') || (fbclid ? 'facebook' : host ? classify(host) : 'direct')).toLowerCase(),
        medium: (q.get('utm_medium') || (fbclid ? 'paid_social' : host ? 'referral' : 'none')).toLowerCase(),
        campaign: q.get('utm_campaign') || null, content: q.get('utm_content') || null, term: q.get('utm_term') || null,
        fbclid: fbclid || null, ref: q.get('ref') || saved?.ref || null, lp: q.get('lp') || null,
        referrer: host || null, landing: (location.pathname + location.search).slice(0, 300),
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    };
    ss.set('sg_attr', JSON.stringify(a));
    return a;
}
export const metaIds = () => {
    const a = getAttribution();
    return { fbp: cookie('_fbp'), fbc: cookie('_fbc') || (a.fbclid ? `fb.1.${Date.now()}.${a.fbclid}` : null) };
};

export function loadPixel(ids = []) {
    if (!window.fbq) {
        !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    }
    window.__sgInit = window.__sgInit || new Set();
    ids.filter(i => !window.__sgInit.has(i)).forEach(i => { window.fbq('init', i); window.__sgInit.add(i); });
    if (!window.__sgPV && ids.length) { window.fbq('track', 'PageView'); window.__sgPV = true; }
}

function startSession() {
    if (!ctx.db || ctx.sid) return;
    const a = getAttribution();
    let sid = ss.get('sg_sid');
    if (sid) { ctx.sid = sid; return; }
    sid = uid(); ss.set('sg_sid', sid); ctx.sid = sid;
    setDoc(doc(col(ctx.db, ctx.appId, 'trafficData'), sid), { ...a, sid, startedAt: Date.now(), date: new Date().toISOString().slice(0, 10), events: [] }).catch(() => { });
}

// Kirim event: Pixel (browser) + log sesi + opsional CAPI (server). eventId yg sama = dedup otomatis di Meta.
export function track(name, custom = {}, eventId = null, { capi = false } = {}) {
    if (!ctx.active) return null;
    const cfg = ctx.cfg; const id = eventId || `${name}_${uid()}`;
    if (!ctx.sid) startSession();
    const on = cfg?.enabled && cfg.events?.[name] !== false;
    if (on && cfg.pixelIds?.length) { loadPixel(cfg.pixelIds); window.fbq('track', name, custom, { eventID: id }); }
    if (ctx.db && ctx.sid) updateDoc(doc(col(ctx.db, ctx.appId, 'trafficData'), ctx.sid), { events: arrayUnion({ n: name, ts: Date.now(), v: custom?.value || 0 }) }).catch(() => { });
    if (capi && on && cfg.capiUrl) {
        fetch(cfg.capiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ name, eventId: id, url: location.href, ...metaIds(), ua: navigator.userAgent, custom }) }).catch(() => { });
    }
    ctx.last = { name, id, at: Date.now() };
    return id;
}
export const trackWhatsApp = (label) => track('Contact', { content_name: String(label || 'wa_click').slice(0, 80) }, null, { capi: true });

// Buat lead + atribusi lengkap + event Lead (eventId disimpan agar Cloud Function bisa dedup)
export async function createTrackedLead({ form, db = ctx.db, appId = ctx.appId }) {
    const a = getAttribution(); const ids = metaIds(); const eventId = `Lead_${uid()}`;
    const data = {
        name: form.name, phone: form.phone, phoneNorm: normPhone(form.phone), date: new Date().toISOString(), status: 'belum_dichat',
        source: a.source, medium: a.medium, campaign: a.campaign, content: a.content, ref: a.ref, lp: a.lp, fbclid: a.fbclid,
        fbp: ids.fbp, fbc: ids.fbc, ua: navigator.userAgent, sid: ctx.sid || null, metaEventId: eventId, origin: 'website', url: location.href.slice(0, 500),
    };
    await addDoc(col(db, appId, 'leadsData'), data);
    const v = Number(ctx.cfg?.leadValue) || 0;
    track('Lead', { content_name: a.lp || 'sampel_gratis', ...(v ? { value: v, currency: 'IDR' } : {}) }, eventId);
    return data;
}

// Hook untuk App(): memuat config, LP, dan menyalakan pixel + sesi hanya utk pengunjung publik
export function useMetaTracking({ db, appId, firebaseUser, active }) {
    const [cfg, setCfg] = useState(null);
    const [lps, setLps] = useState([]); const [lpsLoaded, setLpsLoaded] = useState(false);
    ctx.db = db; ctx.appId = appId; ctx.active = !!active;
    useEffect(() => {
        if (!firebaseUser || !db) return;
        const u1 = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'metaConfig', 'main'),
            s => { const c = s.exists() ? s.data() : { enabled: false, pixelIds: [] }; ctx.cfg = c; setCfg(c); }, e => console.error('metaConfig', e));
        const u2 = onSnapshot(col(db, appId, 'metaLandingPages'),
            s => { setLps(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLpsLoaded(true); }, e => console.error('metaLP', e));
        return () => { u1(); u2(); };
    }, [firebaseUser]);
    useEffect(() => {
        if (!active || !cfg || !firebaseUser) return;
        startSession();
        if (cfg.enabled && cfg.pixelIds?.length) loadPixel(cfg.pixelIds);
    }, [active, cfg, firebaseUser]);
    return { cfg, lps, lpsLoaded };
}

// ------------------------- UI HELPERS -------------------------
const inp = 'w-full border px-3 py-2 rounded-xl text-sm bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none';
const Card = ({ title, right, children }) => (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
        <div className="flex justify-between items-center gap-2"><h3 className="font-extrabold text-blue-950 text-sm">{title}</h3>{right}</div>
        {children}
    </div>
);
const copyText = async (t, showAlert) => {
    try { await navigator.clipboard.writeText(t); showAlert('Tersalin ke clipboard!', 'Sukses', 'success'); }
    catch { showAlert(t, 'Salin manual teks ini', 'info'); }
};
const dynParams = 'utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}';
const baseUrl = () => location.origin + location.pathname;
const lpUrl = (slug, extra = '') => `${baseUrl()}?lp=${slug}${extra ? '&' + extra : ''}`;

// ------------------------- LANDING PAGE PUBLIK (?lp=slug) -------------------------
export function MetaLandingPage({ slug, lps, lpsLoaded, cfg, setView, showAlert }) {
    const lp = lps.find(l => l.slug === slug && l.active !== false);
    const [form, setForm] = useState({ name: '', phone: '' });
    useEffect(() => { if (lp && cfg) track('ViewContent', { content_name: lp.slug, content_type: 'landing_page' }); }, [lp?.id, !!cfg]);

    const openWA = (msg) => {
        const nums = WA_NUMBERS; const n = nums[Math.floor(Math.random() * nums.length)];
        window.open(`https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(msg)}`, '_blank');
    };
    const submit = (e) => {
        e.preventDefault();
        // WA dibuka SINKRON di dalam klik (Safari/iOS memblokir popup setelah await); lead disimpan di belakang layar
        openWA(`${lp.waMessage || 'Halo Admin, saya tertarik dengan modul ajar'}\n\nNama: ${form.name}`);
        createTrackedLead({ form }).catch(() => showAlert('Data gagal tersimpan, tetap lanjutkan chat WhatsApp.', 'Peringatan', 'warning'));
        setForm({ name: '', phone: '' });
    };

    if (!lpsLoaded || !cfg) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Memuat halaman...</div>;
    if (!lp) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center p-6">
            <AlertTriangle size={40} className="text-amber-500" /><h1 className="font-bold text-lg">Halaman tidak ditemukan / nonaktif</h1>
            <button onClick={() => { history.replaceState(null, '', location.pathname); setView('landing'); }} className="text-blue-600 underline text-sm">Ke beranda</button>
        </div>
    );
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-800 flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center text-white space-y-5">
                <span className="inline-block bg-yellow-500 text-blue-900 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide">Sobat Guru Digital 2026</span>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{lp.headline}</h1>
                {lp.sub && <p className="text-blue-100">{lp.sub}</p>}
                {lp.bullets?.length > 0 && (
                    <ul className="bg-white/10 border border-white/20 rounded-2xl p-4 text-left text-sm space-y-2">
                        {lp.bullets.map((b, i) => <li key={i} className="flex gap-2"><CheckCircle size={16} className="text-yellow-400 shrink-0 mt-0.5" />{b}</li>)}
                    </ul>
                )}
                {lp.mode === 'wa' ? (
                    <button onClick={() => { trackWhatsApp(lp.slug); openWA(lp.waMessage || 'Halo Admin, saya tertarik dengan modul ajar'); }}
                        className="cta-pulse w-full bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold py-4 rounded-full text-lg flex items-center justify-center gap-2 border-0 cursor-pointer">
                        <MessageCircle size={22} /> {lp.cta || 'Chat WhatsApp Sekarang'}
                    </button>
                ) : (
                    <form onSubmit={submit} className="bg-white text-gray-800 rounded-2xl p-5 space-y-3 text-left shadow-2xl">
                        <input required placeholder="Nama Bapak/Ibu Guru" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} />
                        <input required type="tel" placeholder="Nomor WhatsApp aktif" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inp} />
                        <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl border-0 cursor-pointer">{lp.cta || 'Kirim & Lanjut ke WhatsApp'}</button>
                    </form>
                )}
                <p className="text-[11px] text-blue-200">Data Anda hanya dipakai untuk menghubungi terkait produk.</p>
            </div>
        </div>
    );
}

// ------------------------- ADMIN: META ADS & PIXEL -------------------------
const EVENTS = [['PageView', 'Kunjungan halaman'], ['ViewContent', 'Buka landing page'], ['Lead', 'Isi form sampel'], ['Contact', 'Klik WhatsApp'], ['Purchase', 'Closing (dari CRM)']];

export function MetaPixelSettings({ db, appId, cfg, lps, showAlert, showConfirm }) {
    const [tab, setTab] = useState('pixel');
    const [f, setF] = useState({ enabled: false, pixelIds: [], testEventCode: '', capiUrl: '', webhookUrl: '', events: {}, leadValue: 0 });
    const [newId, setNewId] = useState(''); const [out, setOut] = useState('');
    useEffect(() => { if (cfg) setF(p => ({ ...p, ...cfg })); }, [cfg]);
    const validId = /^\d{15,16}$/.test(newId.trim());

    const save = async () => {
        try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'metaConfig', 'main'), { ...f, leadValue: Number(f.leadValue) || 0, updatedAt: new Date().toISOString() }, { merge: true }); showAlert('Konfigurasi Meta tersimpan & langsung aktif di landing page.', 'Sukses', 'success'); }
        catch { showAlert('Gagal menyimpan konfigurasi.', 'Error', 'error'); }
    };
    const addId = () => { const id = newId.trim(); if (!validId || f.pixelIds.includes(id)) return; setF({ ...f, pixelIds: [...f.pixelIds, id] }); setNewId(''); };
    const testBrowser = () => {
        if (!f.pixelIds.length) return showAlert('Tambahkan Pixel ID dulu.', 'Peringatan', 'warning');
        loadPixel(f.pixelIds); window.fbq('track', 'PageView', {}, { eventID: 'test_' + uid() });
        showAlert('PageView dikirim dari browser ini. Buka Events Manager → Test Events untuk memastikan masuk.', 'Test Terkirim', 'success');
    };
    const testCapi = async () => {
        if (!f.capiUrl) return showAlert('Isi URL Cloud Function CAPI dulu.', 'Peringatan', 'warning');
        setOut('Menghubungi server...');
        try {
            const r = await fetch(f.capiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'PageView', eventId: 'test_' + uid(), test: true, url: location.origin, ua: navigator.userAgent }) });
            setOut(`HTTP ${r.status}\n` + await r.text());
        } catch (e) { setOut('GAGAL: ' + e.message + '\nPeriksa URL & CORS Cloud Function.'); }
    };
    const health = [
        ['Pixel ID valid terpasang', f.pixelIds.length > 0], ['Tracking diaktifkan', !!f.enabled],
        ['Server-side (CAPI) terhubung', !!f.capiUrl], ['Ada landing page aktif', lps.some(l => l.active !== false)],
        ['Lead Ads webhook diisi', !!f.webhookUrl],
    ];
    const snippet = `<!-- Meta Pixel (dipasang otomatis oleh sistem, tidak perlu ditempel manual) -->\nfbq('init', '${f.pixelIds[0] || 'PIXEL_ID'}');\nfbq('track', 'PageView');`;

    return (
        <div className="max-w-3xl space-y-5 animate-in fade-in">
            <div><h2 className="text-2xl font-bold text-blue-950">Meta Ads & Pixel</h2><p className="text-gray-500 text-sm">Pasang Pixel cukup dengan memasukkan ID. Sistem memuat script, mengirim event, dan menyinkronkan CRM ke Meta.</p></div>
            <div className="flex gap-2 overflow-x-auto">
                {[['pixel', 'Pixel & Event'], ['capi', 'Server (CAPI) & Lead Ads'], ['lp', 'Landing Page']].map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${tab === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>))}
            </div>

            {tab !== 'lp' && (
                <Card title="Status Kesiapan">
                    <div className="grid sm:grid-cols-2 gap-2">
                        {health.map(([l, ok]) => <div key={l} className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg ${ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}{l}</div>)}
                    </div>
                </Card>
            )}

            {tab === 'pixel' && (<>
                <Card title="Pixel ID" right={
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="checkbox" checked={!!f.enabled} onChange={e => setF({ ...f, enabled: e.target.checked })} /> Aktifkan tracking</label>}>
                    <div className="flex gap-2">
                        <input value={newId} onChange={e => setNewId(e.target.value.replace(/\D/g, ''))} placeholder="15–16 digit, contoh 123456789012345" className={inp + ' font-mono'} />
                        <button onClick={addId} disabled={!validId} className="bg-blue-600 disabled:bg-gray-300 text-white px-4 rounded-xl text-sm font-bold border-0 cursor-pointer">Tambah</button>
                    </div>
                    {newId && !validId && <p className="text-[11px] text-red-500">Pixel ID harus 15–16 digit angka (Events Manager → Data Sources → Pixel).</p>}
                    <div className="flex flex-wrap gap-2">
                        {f.pixelIds.map(id => <span key={id} className="bg-blue-50 text-blue-800 font-mono text-xs px-3 py-1.5 rounded-full flex items-center gap-2">{id}<button onClick={() => setF({ ...f, pixelIds: f.pixelIds.filter(x => x !== id) })} className="text-red-500 border-0 bg-transparent cursor-pointer"><XCircle size={14} /></button></span>)}
                        {f.pixelIds.length === 0 && <span className="text-xs text-gray-400">Belum ada Pixel. Mendukung lebih dari satu Pixel.</span>}
                    </div>
                </Card>
                <Card title="Event yang Dikirim">
                    <div className="grid sm:grid-cols-2 gap-2">
                        {EVENTS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg cursor-pointer"><input type="checkbox" checked={f.events?.[k] !== false} onChange={e => setF({ ...f, events: { ...f.events, [k]: e.target.checked } })} /><b>{k}</b><span className="text-gray-500 text-xs">— {l}</span></label>)}
                    </div>
                    <div><label className="text-xs font-bold text-gray-600">Nilai per Lead (Rp, opsional — membantu optimasi)</label><input type="number" value={f.leadValue || 0} onChange={e => setF({ ...f, leadValue: e.target.value })} className={inp} /></div>
                </Card>
                <Card title="Uji Pixel">
                    <pre className="bg-gray-900 text-green-300 text-[11px] p-3 rounded-xl overflow-x-auto">{snippet}</pre>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={testBrowser} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl border-0 cursor-pointer flex items-center gap-1"><Zap size={14} /> Kirim Test PageView</button>
                        <button onClick={() => copyText(snippet, showAlert)} className="bg-gray-100 text-xs font-bold px-4 py-2 rounded-xl border-0 cursor-pointer flex items-center gap-1"><Copy size={14} /> Salin</button>
                    </div>
                </Card>
            </>)}

            {tab === 'capi' && (<>
                <Card title="Conversions API (server-side)">
                    <p className="text-xs text-gray-500">Pixel browser sering terblokir iOS/adblock. CAPI mengirim event yang sama dari server (dedup otomatis lewat event_id). Access Token <b>tidak</b> disimpan di sini — hanya di Secret Cloud Function (lihat functions/index.js).</p>
                    <div><label className="text-xs font-bold text-gray-600">URL Cloud Function <code>metaEvent</code></label><input value={f.capiUrl || ''} onChange={e => setF({ ...f, capiUrl: e.target.value.trim() })} placeholder="https://us-central1-sobatguru-digital.cloudfunctions.net/metaEvent" className={inp + ' font-mono text-xs'} /></div>
                    <div><label className="text-xs font-bold text-gray-600">Test Event Code (Events Manager → Test Events)</label><input value={f.testEventCode || ''} onChange={e => setF({ ...f, testEventCode: e.target.value.trim() })} placeholder="TEST12345" className={inp + ' font-mono'} /></div>
                    <button onClick={testCapi} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl border-0 cursor-pointer flex items-center gap-1"><Send size={14} /> Tes Koneksi CAPI</button>
                    {out && <pre className="bg-gray-900 text-green-300 text-[11px] p-3 rounded-xl overflow-x-auto whitespace-pre-wrap">{out}</pre>}
                </Card>
                <Card title="Meta Lead Ads (Instant Form) → Pusat Leads">
                    <ol className="text-xs text-gray-600 list-decimal pl-4 space-y-1">
                        <li>Deploy fungsi <code>metaLeadWebhook</code>, salin URL-nya ke kolom di bawah.</li>
                        <li>Meta for Developers → App → Webhooks → objek <b>Page</b> → field <b>leadgen</b> → Callback URL = URL fungsi, Verify Token = secret <code>META_VERIFY_TOKEN</code>.</li>
                        <li>Subscribe Page ke App, beri izin <code>leads_retrieval</code> & <code>pages_manage_metadata</code>.</li>
                        <li>Lead dari form Meta otomatis muncul di Pusat Leads dengan sumber “facebook / lead_ads”.</li>
                    </ol>
                    <input value={f.webhookUrl || ''} onChange={e => setF({ ...f, webhookUrl: e.target.value.trim() })} placeholder="https://...cloudfunctions.net/metaLeadWebhook" className={inp + ' font-mono text-xs'} />
                </Card>
            </>)}

            {tab !== 'lp' && <button onClick={save} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl border-0 cursor-pointer">Simpan Konfigurasi Meta</button>}
            {tab === 'lp' && <LandingManager db={db} appId={appId} lps={lps} showAlert={showAlert} showConfirm={showConfirm} />}
        </div>
    );
}

function LandingManager({ db, appId, lps, showAlert, showConfirm }) {
    const empty = { title: '', slug: '', headline: '', sub: '', bullets: '', cta: 'Kirim & Lanjut ke WhatsApp', mode: 'form', waMessage: 'Halo Admin, saya tertarik dengan Modul Ajar Deeplearning', active: true };
    const [f, setF] = useState(empty);
    const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const save = async (e) => {
        e.preventDefault();
        const slug = slugify(f.slug || f.title); if (!slug) return;
        try {
            await setDoc(doc(col(db, appId, 'metaLandingPages'), slug), { ...f, slug, bullets: String(f.bullets).split('\n').map(s => s.trim()).filter(Boolean), updatedAt: new Date().toISOString() });
            showAlert('Landing page tersimpan.', 'Sukses', 'success'); setF(empty);
        } catch { showAlert('Gagal menyimpan landing page.', 'Error', 'error'); }
    };
    const del = (lp) => showConfirm(`Hapus landing page "${lp.title}"? Iklan yang mengarah ke sini akan 404.`, async () => { await deleteDoc(doc(col(db, appId, 'metaLandingPages'), lp.id)); });
    return (
        <div className="space-y-4">
            <Card title="Buat / Edit Landing Page Meta Ads">
                <form onSubmit={save} className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <input required placeholder="Nama internal (mis. Promo SD September)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className={inp} />
                        <input placeholder="slug-url (otomatis)" value={f.slug} onChange={e => setF({ ...f, slug: e.target.value })} className={inp + ' font-mono'} />
                    </div>
                    <input required placeholder="Headline utama" value={f.headline} onChange={e => setF({ ...f, headline: e.target.value })} className={inp} />
                    <input placeholder="Sub-headline" value={f.sub} onChange={e => setF({ ...f, sub: e.target.value })} className={inp} />
                    <textarea rows={3} placeholder={'Poin keunggulan (satu per baris)'} value={Array.isArray(f.bullets) ? f.bullets.join('\n') : f.bullets} onChange={e => setF({ ...f, bullets: e.target.value })} className={inp} />
                    <div className="grid sm:grid-cols-2 gap-3">
                        <select value={f.mode} onChange={e => setF({ ...f, mode: e.target.value })} className={inp}><option value="form">Form Lead → lalu WhatsApp (event Lead)</option><option value="wa">Langsung WhatsApp (event Contact)</option></select>
                        <input placeholder="Teks tombol" value={f.cta} onChange={e => setF({ ...f, cta: e.target.value })} className={inp} />
                    </div>
                    <textarea rows={2} placeholder="Pesan WhatsApp awal" value={f.waMessage} onChange={e => setF({ ...f, waMessage: e.target.value })} className={inp} />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active !== false} onChange={e => setF({ ...f, active: e.target.checked })} /> Aktif</label>
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl border-0 cursor-pointer flex items-center justify-center gap-2"><PlusCircle size={16} /> Simpan Landing Page</button>
                </form>
            </Card>
            {lps.map(lp => (
                <Card key={lp.id} title={`${lp.title} ${lp.active === false ? '(nonaktif)' : ''}`} right={<div className="flex gap-1">
                    <button onClick={() => setF({ ...empty, ...lp })} className="p-1.5 text-blue-600 border-0 bg-transparent cursor-pointer"><Edit size={16} /></button>
                    <a href={lpUrl(lp.slug)} target="_blank" rel="noreferrer" className="p-1.5 text-gray-500"><ExternalLink size={16} /></a>
                    <button onClick={() => del(lp)} className="p-1.5 text-red-500 border-0 bg-transparent cursor-pointer"><Trash2 size={16} /></button></div>}>
                    <label className="text-[11px] font-bold text-gray-500">URL untuk kolom “Website URL” di Meta Ads (sudah termasuk parameter dinamis)</label>
                    <div className="flex gap-2"><input readOnly value={lpUrl(lp.slug, dynParams)} className={inp + ' font-mono text-[11px]'} onFocus={e => e.target.select()} />
                        <button onClick={() => copyText(lpUrl(lp.slug, dynParams), showAlert)} className="bg-blue-600 text-white px-3 rounded-xl border-0 cursor-pointer"><Copy size={14} /></button></div>
                    <p className="text-[10px] text-gray-400">Tempel apa adanya. Meta mengganti {'{{campaign.name}}'}, {'{{ad.name}}'}, {'{{adset.name}}'} secara otomatis, sehingga Traffic & Leads tercatat per kampanye.</p>
                </Card>
            ))}
        </div>
    );
}

// ------------------------- TRAFFIC & SUMBER TRAFFIC (ADMIN + STAFF) -------------------------
export function TrafficDashboard({ db, appId, user, leadsData, lps = [], showAlert }) {
    const isAdmin = user.role === 'admin';
    const [range, setRange] = useState(30); const [rows, setRows] = useState([]);
    useEffect(() => {
        const c = col(db, appId, 'trafficData');
        const q = isAdmin ? query(c, orderBy('startedAt', 'desc'), limit(5000)) : query(c, where('ref', '==', user.username), limit(5000));
        return onSnapshot(q, s => setRows(s.docs.map(d => d.data())), e => console.error('traffic', e));
    }, []);
    const since = Date.now() - range * 864e5;
    const sess = useMemo(() => rows.filter(r => r.startedAt >= since), [rows, range]);
    const leads = useMemo(() => leadsData.filter(l => new Date(l.date).getTime() >= since && (isAdmin || l.ref === user.username)), [leadsData, range]);

    const group = (fn) => {
        const m = {};
        const get = (k) => (m[k] ||= { k, s: 0, wa: 0, lead: 0, deal: 0 });
        sess.forEach(s => { const r = get(fn(s) || '(tidak ada)'); r.s++; if (s.events?.some(e => e.n === 'Contact')) r.wa++; });
        leads.forEach(l => { const r = get(fn(l) || '(tidak tercatat)'); r.lead++; if (l.status === 'konversi') r.deal++; });
        return Object.values(m).sort((a, b) => b.s + b.lead - (a.s + a.lead));
    };
    const bySource = group(x => x.source ? `${x.source} / ${x.medium || '-'}` : null);
    const byCampaign = group(x => x.campaign);
    const byRef = group(x => x.ref);
    const total = { s: sess.length, wa: sess.filter(s => s.events?.some(e => e.n === 'Contact')).length, lead: leads.length, deal: leads.filter(l => l.status === 'konversi').length };
    const meta = { s: sess.filter(s => s.source === 'facebook' || s.source === 'instagram').length, lead: leads.filter(l => l.source === 'facebook' || l.source === 'instagram').length };
    const days = Array.from({ length: Math.min(range, 30) }, (_, i) => new Date(Date.now() - (Math.min(range, 30) - 1 - i) * 864e5).toISOString().slice(0, 10));
    const perDay = days.map(d => sess.filter(s => s.date === d).length); const maxDay = Math.max(1, ...perDay);
    const dev = { mobile: sess.filter(s => s.device === 'mobile').length, desktop: sess.filter(s => s.device === 'desktop').length };

    const Table = ({ title, data }) => (
        <Card title={title}><div className="overflow-x-auto"><table className="w-full text-xs text-left">
            <thead className="text-gray-500 uppercase"><tr><th className="py-2">Nama</th><th>Sesi</th><th>Klik WA</th><th>Lead</th><th>Closing</th><th>Lead/Sesi</th></tr></thead>
            <tbody>{data.slice(0, 15).map(r => <tr key={r.k} className="border-t"><td className="py-2 font-bold text-gray-800 max-w-[200px] truncate">{r.k}</td><td>{r.s}</td><td>{r.wa}</td><td>{r.lead}</td><td>{r.deal}</td><td>{pct(r.lead, r.s)}</td></tr>)}
                {data.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-400">Belum ada data.</td></tr>}</tbody></table></div></Card>
    );
    const funnel = [['Sesi kunjungan', total.s], ['Klik WhatsApp', total.wa], ['Lead masuk', total.lead], ['Closing', total.deal]];

    return (
        <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-wrap justify-between gap-3 items-end">
                <div><h2 className="text-2xl font-bold text-blue-950">Traffic & Sumber Traffic {isAdmin ? '' : '(Link Saya)'}</h2>
                    <p className="text-gray-500 text-sm">{isAdmin ? 'Semua pengunjung landing page, per sumber, kampanye, dan staff.' : 'Hanya pengunjung & lead yang datang dari link referral Anda.'}</p></div>
                <div className="flex gap-2">{[7, 30, 90].map(d => <button key={d} onClick={() => setRange(d)} className={`px-3 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer ${range === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{d} hari</button>)}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[['Sesi', total.s, <Globe size={16} />], ['Dari Meta', `${meta.s} sesi / ${meta.lead} lead`, <TrendingUp size={16} />], ['Konversi Lead', pct(total.lead, total.s), <CheckCircle size={16} />], ['Closing', total.deal, <MessageCircle size={16} />]].map(([l, v, i]) =>
                    <div key={l} className="bg-white border rounded-2xl p-4 shadow-sm"><div className="text-xs text-gray-500 flex items-center gap-1">{i}{l}</div><div className="text-xl font-black text-blue-950 mt-1">{v}</div></div>)}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <Card title="Sesi per Hari"><div className="flex items-end gap-[2px] h-28">{perDay.map((n, i) => <div key={i} title={`${days[i]}: ${n}`} className="flex-1 bg-blue-500 rounded-t" style={{ height: `${(n / maxDay) * 100}%`, minHeight: 2 }} />)}</div>
                    <p className="text-[11px] text-gray-400">Perangkat: {dev.mobile} mobile · {dev.desktop} desktop</p></Card>
                <Card title="Funnel">{funnel.map(([l, n], i) => <div key={l}><div className="flex justify-between text-xs font-semibold"><span>{l}</span><span>{n} {i > 0 && <span className="text-gray-400">({pct(n, funnel[i - 1][1])})</span>}</span></div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-green-500 rounded" style={{ width: `${funnel[0][1] ? Math.min(100, (n / funnel[0][1]) * 100) : 0}%` }} /></div></div>)}</Card>
            </div>
            <Table title="Sumber Traffic (source / medium)" data={bySource} />
            <Table title="Kampanye (utm_campaign)" data={byCampaign} />
            {isAdmin && <Table title="Performa per Staff (link referral)" data={byRef} />}
            {!isAdmin && (
                <Card title="Link Referral Saya">
                    <p className="text-xs text-gray-500">Bagikan link ini. Setiap kunjungan & lead otomatis diatribusikan ke Anda.</p>
                    {[['Beranda', `${baseUrl()}?ref=${user.username}`], ...lps.filter(l => l.active !== false).map(l => [l.title, lpUrl(l.slug, `ref=${user.username}&utm_source=whatsapp&utm_medium=staff`)])].map(([l, u]) =>
                        <div key={l}><label className="text-[11px] font-bold text-gray-500">{l}</label><div className="flex gap-2"><input readOnly value={u} onFocus={e => e.target.select()} className={inp + ' font-mono text-[11px]'} /><button onClick={() => copyText(u, showAlert)} className="bg-blue-600 text-white px-3 rounded-xl border-0 cursor-pointer"><Copy size={14} /></button></div></div>)}
                </Card>
            )}
        </div>
    );
}

// ------------------------- PUSAT LEADS (CRM) TERINTEGRASI META -------------------------
// Pengganti ManageLeadsDashboard lama (props sama + user & appSettings).
// Perubahan status ke "konversi" -> Cloud Function otomatis kirim event Purchase ke Meta (CAPI).
export function ManageLeadsDashboard({ leadsData, showAlert, db, appId, user, appSettings }) {
    const isAdmin = user?.role === 'admin';
    const [page, setPage] = useState(1); const [srcFilter, setSrcFilter] = useState('all'); const [scope, setScope] = useState(isAdmin ? 'all' : 'mine');
    const [deal, setDeal] = useState(null); const [amount, setAmount] = useState('');
    const per = 25;
    const base = leadsData.filter(l => scope === 'all' || !l.ref || l.ref === user?.username);
    const rows = base.filter(l => srcFilter === 'all' || (srcFilter === 'meta' ? ['facebook', 'instagram'].includes(l.source) : l.source === srcFilter));
    const pages = Math.ceil(rows.length / per); const view = rows.slice((page - 1) * per, page * per);
    const stat = { all: base.length, meta: base.filter(l => ['facebook', 'instagram'].includes(l.source)).length, deal: base.filter(l => l.status === 'konversi').length };
    useEffect(() => setPage(1), [srcFilter, scope]);

    const patch = async (id, data, msg = 'Status leads diperbarui!') => {
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leadsData', id), data); showAlert(msg, 'Sukses', 'success'); }
        catch { showAlert('Gagal menyimpan ke database', 'Error', 'error'); }
    };
    const changeStatus = (lead, s) => {
        if (s === 'konversi') { setDeal(lead); setAmount(String(lead.saleAmount || appSettings?.priceLengkap || '')); return; }
        patch(lead.id, { status: s, statusAt: new Date().toISOString() });
    };
    const confirmDeal = () => {
        if (!(Number(amount) > 0)) return showAlert('Isi nilai closing (Rp) — dibutuhkan Meta untuk event Purchase.', 'Peringatan', 'warning');
        patch(deal.id, { status: 'konversi', saleAmount: Number(amount), convertedAt: new Date().toISOString(), convertedBy: user?.username || null }, 'Closing dicatat & dikirim ke Meta.');
        setDeal(null);
    };
    const chat = (lead) => {
        const t = `Halo Bpk/Ibu ${lead.name}, saya melihat Anda mengunduh contoh Perangkat Administrasi Modul Deeplearning di Sobat Guru Digital. Apakah ada materi jenjang tertentu yang sedang dibutuhkan saat ini?`;
        window.open(`https://api.whatsapp.com/send?phone=${normPhone(lead.phone)}&text=${encodeURIComponent(t)}`, '_blank');
        if (!lead.status || lead.status === 'belum_dichat') patch(lead.id, { status: 'sudah_dichat', statusAt: new Date().toISOString(), handledBy: user?.username || null }, `Menghubungi ${lead.name} via WhatsApp`);
    };
    const metaBadge = (l) => l.metaSent?.Purchase ? ['✓ Purchase terkirim', 'bg-green-100 text-green-700'] : l.metaSent?.Lead ? ['✓ Lead terkirim', 'bg-blue-100 text-blue-700'] : l.source === 'facebook' && l.medium === 'lead_ads' ? ['Meta Lead Ads', 'bg-indigo-100 text-indigo-700'] : null;

    return (
        <div className="space-y-5 animate-in fade-in">
            <div><h2 className="text-2xl font-bold text-blue-950">Pusat Data Leads (CRM) × Meta</h2>
                <p className="text-gray-500 text-sm">Lead dari landing page & Meta Lead Ads. Status “Konversi” dikirim balik ke Meta sebagai Purchase agar iklan belajar mencari pembeli, bukan sekadar pengisi form.</p></div>
            <div className="flex flex-wrap gap-2 items-center">
                {[['all', `Semua (${stat.all})`], ['meta', `Meta (${stat.meta})`], ['whatsapp', 'WhatsApp'], ['direct', 'Direct']].map(([k, l]) => <button key={k} onClick={() => setSrcFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer ${srcFilter === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>)}
                {!isAdmin && <button onClick={() => setScope(scope === 'mine' ? 'all' : 'mine')} className="ml-auto text-xs font-bold text-blue-600 border-0 bg-transparent cursor-pointer">{scope === 'mine' ? 'Tampilkan milik saya + belum ditugaskan ✓' : 'Tampilkan semua'}</button>}
                <span className="ml-auto text-xs text-gray-500">Konversi: <b>{pct(stat.deal, stat.all)}</b></span>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 border-b text-xs font-bold uppercase text-gray-700"><tr>
                        {['Tanggal', 'Nama', 'WhatsApp', 'Sumber / Kampanye', 'Sinkron Meta', 'Status', 'Aksi'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                    <tbody>
                        {view.map(l => { const b = metaBadge(l); return (
                            <tr key={l.id} className="border-b hover:bg-gray-50/50">
                                <td className="px-4 py-3 text-xs whitespace-nowrap">{l.date?.slice(0, 10) || '-'}</td>
                                <td className="px-4 py-3 font-bold text-gray-900">{l.name}{l.email && <div className="text-[10px] font-normal text-gray-400">{l.email}</div>}</td>
                                <td className="px-4 py-3 font-mono text-xs">{l.phone}</td>
                                <td className="px-4 py-3 text-xs"><b>{l.source ? `${l.source}/${l.medium || '-'}` : '-'}</b><div className="text-gray-400 max-w-[160px] truncate">{l.campaign || l.lp || ''}{l.ref ? ` · ref:${l.ref}` : ''}</div></td>
                                <td className="px-4 py-3">{b ? <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${b[1]}`}>{b[0]}</span> : <span className="text-[10px] text-gray-300">-</span>}</td>
                                <td className="px-4 py-3">
                                    <select value={l.status || 'belum_dichat'} onChange={e => changeStatus(l, e.target.value)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${l.status === 'konversi' ? 'bg-green-100 text-green-700 border-green-300' : l.status === 'sudah_dichat' ? 'bg-blue-100 text-blue-700 border-blue-300' : l.status === 'gagal' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                                        <option value="belum_dichat">⏳ Belum di-chat</option><option value="sudah_dichat">💬 Sudah di-chat</option><option value="konversi">🎉 Konversi (Deal)</option><option value="gagal">❌ Gagal / Tolak</option></select>
                                    {l.status === 'konversi' && l.saleAmount && <div className="text-[10px] text-green-600 font-bold mt-1">Rp {Number(l.saleAmount).toLocaleString('id-ID')}</div>}
                                </td>
                                <td className="px-4 py-3"><button onClick={() => chat(l)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-3 rounded-xl text-xs border-0 cursor-pointer">Chat WA</button></td>
                            </tr>); })}
                        {view.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada data leads.</td></tr>}
                    </tbody>
                </table>
            </div>
            {pages > 1 && <div className="flex justify-center gap-2 text-xs">{Array.from({ length: pages }, (_, i) => i + 1).map(p => <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg border-0 cursor-pointer ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{p}</button>)}</div>}
            {deal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60" onClick={() => setDeal(null)} />
                    <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
                        <h3 className="font-bold">Closing: {deal.name}</h3>
                        <label className="text-xs font-bold text-gray-600">Nilai transaksi (Rp)</label>
                        <input type="number" autoFocus value={amount} onChange={e => setAmount(e.target.value)} className={inp} />
                        <p className="text-[11px] text-gray-500">Akan dikirim ke Meta sebagai event Purchase (IDR) via server.</p>
                        <div className="flex gap-2"><button onClick={() => setDeal(null)} className="flex-1 bg-gray-100 py-2 rounded-xl font-bold border-0 cursor-pointer">Batal</button><button onClick={confirmDeal} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold border-0 cursor-pointer">Simpan Closing</button></div>
                    </div></div>)}
        </div>
    );
}
