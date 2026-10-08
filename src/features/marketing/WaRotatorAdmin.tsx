import { useCallback, useEffect, useState } from "react";
import { listGroups, normPhone, removeGroup, resetStats, saveGroup, slugify, validPhone, type WaGroup, type WaNumber } from "./waRotator";

type Row = WaGroup & { slug: string };
type Form = { mode: WaGroup["mode"]; pixel: string; event: string; msg: string; numbers: WaNumber[] };
const blank = (): Form => ({ mode: "rr", pixel: "", event: "Lead", msg: "", numbers: [{ n: "", on: true }, { n: "", on: true }] });
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
const btn = "rounded-lg px-3 py-1.5 text-sm font-semibold border";

export default function WaRotatorAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [f, setF] = useState<Form>(blank());
  const [msg, setMsg] = useState("");

  const load = useCallback(() => listGroups().then(setRows).catch(() => setMsg("Gagal memuat data. Cek konfigurasi Firebase.")), []);
  useEffect(() => { void load(); }, [load]);

  const reset = () => { setEditing(null); setSlug(""); setF(blank()); };
  const setNum = (i: number, p: Partial<WaNumber>) => setF({ ...f, numbers: f.numbers.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  const save = async () => {
    setMsg("");
    const s = editing ?? slugify(slug);
    const numbers = f.numbers.map((x) => ({ n: normPhone(x.n), on: x.on })).filter((x) => validPhone(x.n));
    if (!s) return setMsg("Isi nama link.");
    if (!editing && rows.some((r) => r.slug === s)) return setMsg("Nama link sudah dipakai.");
    if (!numbers.length) return setMsg("Isi minimal satu nomor yang valid.");
    const data: Partial<WaGroup> = { mode: f.mode, pixel: f.pixel.replace(/\D/g, ""), event: f.event.trim() || "Lead", msg: f.msg.trim(), numbers };
    if (!editing) Object.assign(data, { counter: 0, total: 0, hits: {} });
    try { await saveGroup(s, data); reset(); await load(); setMsg("Tersimpan."); }
    catch { setMsg("Gagal menyimpan. Pastikan Anda login admin Firebase dan rules sudah di-deploy."); }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-bold">WA Rotator</h2>
        {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada link. Buat yang pertama di bawah.</p>}
        <div className="space-y-3">
          {rows.map((r) => {
            const url = `${location.origin}/wa/${r.slug}`;
            return (
              <div key={r.slug} className="flex flex-wrap justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{r.slug} <span className="text-sm font-normal text-slate-500">{r.total || 0} klik{r.pixel ? ` · Pixel ${r.pixel}` : ""}</span></p>
                  <p className="break-all font-mono text-xs text-slate-600">{url}</p>
                  <p className="mt-1 text-xs text-slate-500">{r.numbers.map((x) => `${x.on ? "●" : "○"} +${x.n} (${r.hits?.[x.n] ?? 0})`).join("   ")}</p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <button className={btn} onClick={() => navigator.clipboard.writeText(url).then(() => setMsg("Link disalin."))}>Salin</button>
                  <button className={btn} onClick={() => { setEditing(r.slug); setSlug(r.slug); setF({ mode: r.mode, pixel: r.pixel || "", event: r.event, msg: r.msg, numbers: r.numbers }); }}>Edit</button>
                  <button className={btn} onClick={async () => { if (confirm(`Reset statistik ${r.slug}?`)) { await resetStats(r.slug); await load(); } }}>Reset stat</button>
                  <button className={`${btn} border-red-400 text-red-600`} onClick={async () => { if (confirm(`Hapus ${r.slug}? Iklan yang memakai link ini akan berhenti bekerja.`)) { await removeGroup(r.slug); await load(); } }}>Hapus</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-bold">{editing ? `Edit link: ${editing}` : "Buat link baru"}</h3>
        <label className="block text-sm font-semibold">Nama link
          <input className={`${inp} mt-1`} disabled={!!editing} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="promo-oktober" />
        </label>
        {slug && <p className="text-xs text-slate-500">{location.origin}/wa/{editing ?? slugify(slug)}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Cara pembagian
            <select className={`${inp} mt-1`} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as Form["mode"] })}>
              <option value="rr">Bergilir (1, 2, 3, ulang)</option><option value="rand">Acak</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">Pixel ID khusus link ini (opsional)
            <input className={`${inp} mt-1`} inputMode="numeric" value={f.pixel} onChange={(e) => setF({ ...f, pixel: e.target.value })} placeholder="Kosong = pakai Pixel global" />
          </label>
        </div>
        <label className="block text-sm font-semibold">Event Pixel saat diklik
          <input className={`${inp} mt-1`} list="pxe" value={f.event} onChange={(e) => setF({ ...f, event: e.target.value })} />
          <datalist id="pxe"><option>Lead</option><option>Contact</option><option>InitiateCheckout</option><option>ViewContent</option></datalist>
        </label>
        <label className="block text-sm font-semibold">Pesan otomatis (opsional)
          <input className={`${inp} mt-1`} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} placeholder="Halo kak, saya mau order modul ajar" />
        </label>
        <p className="text-sm font-semibold">Nomor WhatsApp</p>
        {f.numbers.map((x, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={inp} inputMode="tel" placeholder="0812xxxxxxx" value={x.n} onChange={(e) => setNum(i, { n: e.target.value })} />
            <label className="flex items-center gap-1 whitespace-nowrap text-sm"><input type="checkbox" checked={x.on} onChange={(e) => setNum(i, { on: e.target.checked })} />Aktif</label>
            <button className={`${btn} border-red-400 text-red-600`} onClick={() => setF({ ...f, numbers: f.numbers.filter((_, j) => j !== i) })}>Hapus</button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => setF({ ...f, numbers: [...f.numbers, { n: "", on: true }] })}>Tambah nomor</button>
          <button className={`${btn} border-emerald-600 bg-emerald-600 text-white`} onClick={save}>Simpan link</button>
          <button className={btn} onClick={reset}>Batal</button>
        </div>
        {msg && <p className="text-sm" role="alert">{msg}</p>}
      </section>
    </div>
  );
}
