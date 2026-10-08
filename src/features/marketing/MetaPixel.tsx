import { useEffect, useState, type ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

type Fbq = ((...a: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; callMethod?: (...a: unknown[]) => void; push?: unknown; version?: string };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

const STD = ["Lead", "Contact", "ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo", "CompleteRegistration", "Purchase", "Subscribe", "Schedule", "Search"];
const inited = new Set<string>();

function ensure(): Fbq {
  if (window.fbq) return window.fbq;
  const n = ((...a: unknown[]) => { if (n.callMethod) n.callMethod(...a); else n.queue!.push(a); }) as Fbq;
  window.fbq = n; window._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  const s = document.createElement("script");
  s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  return n;
}

export function initPixel(id: string) {
  if (!id || inited.has(id)) return;
  ensure()("init", id);
  inited.add(id);
}
export const pageView = () => { if (inited.size) window.fbq?.("track", "PageView"); };
/** Pakai di mana saja: track("Purchase", { value: 99000, currency: "IDR" }) */
export function track(ev: string, data?: Record<string, unknown>) {
  if (!inited.size) return;
  window.fbq?.(STD.includes(ev) ? "track" : "trackCustom", ev, data);
}

export interface MetaSettings { enabled: boolean; pixelId: string }
export async function getMetaSettings(): Promise<MetaSettings> {
  try {
    const s = await getDoc(doc(db, "settings", "meta"));
    if (s.exists()) return s.data() as MetaSettings;
  } catch { /* abaikan */ }
  return { enabled: false, pixelId: "" };
}
/** Mengambil Pixel ID dari kode base Meta yang ditempel (atau angka biasa). */
export function extractPixelId(src: string): string {
  const m = src.match(/fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})/) ?? src.match(/\b(\d{15,16})\b/);
  return m ? m[1] : "";
}

const SKIP = /^\/(wa|admin|dashboard)/;

/** Bungkus <App /> dengan komponen ini: Pixel terpasang di seluruh website. */
export function MetaPixelProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let off = false;
    const fire = () => { if (!SKIP.test(location.pathname)) pageView(); };
    getMetaSettings().then((s) => {
      if (off || !s.enabled || !s.pixelId) return;
      initPixel(s.pixelId); fire();
    });
    const orig = history.pushState;
    history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
      orig.apply(this, args); setTimeout(fire, 0);
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-pixel-event], a[href*='wa.me']");
      if (!el) return;
      track(el.dataset.pixelEvent ?? "Contact");
    };
    window.addEventListener("popstate", fire);
    document.addEventListener("click", onClick);
    return () => {
      off = true; history.pushState = orig;
      window.removeEventListener("popstate", fire);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return <>{children}</>;
}

/** Halaman admin: pasang / ubah Meta Pixel. */
export function MetaPixelSettings() {
  const [src, setSrc] = useState("");
  const [id, setId] = useState("");
  const [on, setOn] = useState(true);
  const [note, setNote] = useState("");
  useEffect(() => { getMetaSettings().then((s) => { setId(s.pixelId); setOn(s.enabled); }); }, []);

  const paste = (v: string) => {
    setSrc(v);
    const f = extractPixelId(v);
    if (f) { setId(f); setNote(`Pixel ID terdeteksi: ${f}`); } else setNote("");
  };
  const save = async () => {
    const clean = id.replace(/\D/g, "");
    if (on && clean.length < 8) return setNote("Pixel ID tidak valid.");
    try {
      await setDoc(doc(db, "settings", "meta"), { enabled: on, pixelId: clean });
      setNote("Tersimpan. Pixel aktif di seluruh website dan link WA rotator.");
    } catch { setNote("Gagal menyimpan. Pastikan login admin Firebase dan rules sudah di-deploy."); }
  };
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-bold">Meta Pixel (Facebook Ads)</h2>
      <label className="block text-sm font-semibold">Tempel kode Pixel dari Meta (opsional)
        <textarea className={`${inp} mt-1 h-28 font-mono`} value={src} onChange={(e) => paste(e.target.value)}
          placeholder={"<!-- Meta Pixel Code -->\n<script> ... fbq('init', '1234567890') ... </script>"} />
      </label>
      <label className="block text-sm font-semibold">Pixel ID
        <input className={`${inp} mt-1`} inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} placeholder="1234567890123456" />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />Aktifkan Pixel</label>
      <p className="text-xs text-slate-500">Yang dipakai hanya Pixel ID dari kode yang Anda tempel. Script dari kotak di atas tidak dijalankan, demi keamanan. Pixel otomatis mengirim PageView di semua halaman, serta event <b>Contact</b> saat tombol/link wa.me diklik. Tambahkan <code>data-pixel-event="InitiateCheckout"</code> pada tombol apa pun untuk event lain.</p>
      <button onClick={save} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Simpan Pixel</button>
      {note && <p className="text-sm">{note}</p>}
    </div>
  );
}
