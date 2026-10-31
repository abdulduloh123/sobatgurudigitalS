# Integrasi WA Rotator + Meta Pixel ke dashboard Sobat Guru Digital

Stack project: React + TypeScript + Vite + Tailwind (di-deploy ke Vercel).

## 1. Salin file
Salin folder `src/features/marketing/` dan `src/lib/firebase.ts` ke project Anda
(jika sudah punya file inisialisasi Firebase, hapus `src/lib/firebase.ts` dan ubah
import `../../lib/firebase` di 3 file marketing agar menunjuk ke milik Anda).
Salin juga `vercel.json` jika belum ada (agar link `/wa/...` tidak 404).

## 2. Pasang dependensi dan environment
```
npm install firebase
```
Isi `.env` (lihat `.env.example`) dengan nilai dari Firebase Console > Project settings > Web app.
Tambahkan variabel yang sama di Vercel: Project > Settings > Environment Variables, lalu redeploy.

## 3. Sambungkan ke dashboard admin
Tambahkan dua menu di dashboard Anda, masing-masing menampilkan komponen:
```tsx
import WaRotatorAdmin from "./features/marketing/WaRotatorAdmin";
import { MetaPixelSettings } from "./features/marketing/MetaPixel";
// menu "WA Rotator"  -> <WaRotatorAdmin />
// menu "Meta Pixel"  -> <MetaPixelSettings />
```

## 4. Pasang Pixel di seluruh website dan halaman redirect
`src/main.tsx`:
```tsx
import WaRedirect from "./features/marketing/WaRedirect";
import { MetaPixelProvider } from "./features/marketing/MetaPixel";

const root = createRoot(document.getElementById("root")!);
root.render(
  location.pathname.startsWith("/wa/")
    ? <WaRedirect />
    : <MetaPixelProvider><App /></MetaPixelProvider>
);
```
(Jika memakai React Router, cukup buat route `/wa/:slug` yang merender `<WaRedirect />`.)

## 5. Firebase
1. Console > Firestore Database > buat database (lokasi Jakarta).
2. Console > Authentication > aktifkan Email/Password dan buat user admin.
3. Console > Firestore > Rules: tambahkan isi `firestore.rules` (ganti email admin) lalu Publish.
4. Dashboard admin harus login lewat Firebase Auth dengan email tadi agar bisa menyimpan.

## Performa Iklan (Meta di Vercel)
Tidak butuh Firebase Blaze. Semua berjalan lewat `api/meta.ts` di Vercel.

- Variabel Vercel: `META_APP_ID`, `META_APP_SECRET`, `META_AD_ACCOUNT_ID`, `META_VERIFY_TOKEN`.
  Opsional: `META_LOGIN_CONFIG_ID` (kalau Facebook Login for Business memakai konfigurasi), `META_PAGE_ID`, `META_REDIRECT_URI`.
- Admin membuka **Performa Iklan** lalu menekan **Hubungkan Meta**. Biaya iklan diperbarui saat tab dibuka, paling sering tiap 6 jam.
- Webhook prospek: `https://www.mitragurudigitalindonesia.my.id/api/meta/lead-webhook`, objek Page, field `leadgen`.
- Overview Bisnis menampilkan biaya, chat, ROAS, status Pixel, dan peringatan. Biaya Meta di panel ini tidak masuk Total Pengeluaran.
- Token Meta tersimpan di `metaConnection/main`, dan biaya harian di `adsDaily`. Keduanya hanya diakses server.

## 6. Pakai
- Menu **Meta Pixel**: tempel kode pixel dari Events Manager (atau ketik ID), aktifkan, simpan.
- Menu **WA Rotator**: buat link, salin `https://DOMAIN-ANDA/wa/nama-link`, pasang di iklan.
- Event tambahan: beri atribut `data-pixel-event="InitiateCheckout"` pada tombol apa pun,
  atau panggil `track("Purchase", { value: 99000, currency: "IDR" })`.
- Cek dengan Meta Pixel Helper atau Events Manager > Test events.
