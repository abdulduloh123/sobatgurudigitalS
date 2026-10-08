import { useEffect, useState } from "react";
import { getMetaSettings, initPixel, pageView, track } from "./MetaPixel";
import { pickNumber, waLink } from "./waRotator";

/** Halaman publik: /wa/nama-link */
export default function WaRedirect({ slug }: { slug?: string }) {
  const [st, setSt] = useState<{ text: string; url?: string }>({ text: "Membuka WhatsApp…" });

  useEffect(() => {
    const s = slug ?? decodeURIComponent(location.pathname.split("/")[2] ?? "");
    let timer: number | undefined;
    (async () => {
      if (!s) return setSt({ text: "Link tidak valid." });
      try {
        const [r, meta] = await Promise.all([pickNumber(s), getMetaSettings()]);
        if (!r) return setSt({ text: "Link tidak ditemukan atau belum ada nomor aktif." });
        const ids = [r.group.pixel, meta.enabled ? meta.pixelId : ""].filter(Boolean);
        ids.forEach(initPixel);
        const t1 = Date.now();
        if (ids.length) { pageView(); track(r.group.event || "Lead", { content_name: s }); }
        const url = waLink(r.number, r.group.msg);
        setSt({ text: "Membuka WhatsApp…", url });
        timer = window.setTimeout(() => location.replace(url), ids.length ? Math.max(0, 900 - (Date.now() - t1)) : 0);
      } catch { setSt({ text: "Terjadi kesalahan. Coba muat ulang." }); }
    })();
    return () => window.clearTimeout(timer);
  }, [slug]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div>
        <p className="text-slate-700">{st.text}</p>
        {st.url && <a href={st.url} className="mt-3 inline-block rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white">Buka WhatsApp</a>}
      </div>
    </div>
  );
}
