import { useEffect, useState } from "react";

type Testimonial = { file: string; name?: string; role?: string };

/**
 * Real customer screenshots. Add the image to public/testimoni/ and list it in public/testimoni/index.json:
 * [{ "file": "rina.jpg", "name": "Bu Rina", "role": "Guru SD" }]
 * With an empty list the section is not shown at all.
 */
export default function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [open, setOpen] = useState<Testimonial | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/testimoni/index.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((json) => { if (alive && Array.isArray(json)) setItems(json.filter((item) => item && typeof item.file === "string")); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  if (items.length === 0) return null;
  const src = (item: Testimonial) => `/testimoni/${encodeURIComponent(item.file)}`;

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-blue-600 font-bold text-sm tracking-widest uppercase bg-blue-100 px-3 py-1 rounded-full">Testimoni</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mt-3">Kata Bapak/Ibu Guru</h2>
          <p className="text-gray-500 text-sm mt-2">Tangkapan layar asli dari pelanggan kami.</p>
        </div>
        <div className="columns-2 md:columns-3 gap-3 md:gap-5 [&>*]:mb-3 md:[&>*]:mb-5">
          {items.map((item) => (
            <button key={item.file} type="button" onClick={() => setOpen(item)} className="block w-full break-inside-avoid bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden text-left cursor-zoom-in p-0 transition hover:shadow-xl">
              <img src={src(item)} alt={item.name ? `Testimoni dari ${item.name}` : "Testimoni pelanggan"} loading="lazy" decoding="async" className="w-full h-auto block" />
              {(item.name || item.role) && (
                <div className="px-3 py-2 text-xs">
                  {item.name && <p className="font-bold text-gray-800">{item.name}</p>}
                  {item.role && <p className="text-gray-500">{item.role}</p>}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80" onClick={() => setOpen(null)}>
          <img src={src(open)} alt={open.name ? `Testimoni dari ${open.name}` : "Testimoni pelanggan"} className="max-h-[90vh] max-w-full rounded-xl shadow-2xl" />
          <button type="button" aria-label="Tutup" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white text-gray-800 text-xl font-bold border-0 cursor-pointer" onClick={() => setOpen(null)}>×</button>
        </div>
      )}
    </section>
  );
}
