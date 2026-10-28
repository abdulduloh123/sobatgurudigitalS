# Panduan mudah: Samples dari Google Drive

Fitur **Samples** memakai Firebase yang sudah dipakai website, bukan Supabase. Admin dan CS masuk memakai **username dan kata sandi dashboard yang sama**. CS otomatis mendapat peran Samples dari peran **Staff** di dashboard; tidak perlu membuat akun Firebase Authentication atau dokumen `sampleUsers` terpisah.

> Jangan pernah menempelkan private key ke chat, variabel yang diawali `VITE_`, atau GitHub.

## Yang dibutuhkan

- Akun admin dashboard Sobatguru yang masih bisa login.
- Akses ke Google Drive dan folder yang berisi file sampel.
- Akses ke project website di Vercel.
- Service account Firebase Admin yang sudah digunakan backend.

## 1. Siapkan akses Google Drive

1. Pastikan **Google Drive API** aktif di Google Cloud project yang sama dengan Firebase.
2. Bagikan folder utama sampel kepada alamat pada variabel `FIREBASE_CLIENT_EMAIL` dengan akses **Viewer / Pelihat**.
3. Salin ID folder dari alamat Google Drive. Contoh, pada `drive.google.com/drive/folders/ABC123`, ID foldernya adalah `ABC123`.

Folder dan file tetap privat. Berikan akses hanya kepada service account tersebut.

## 2. Pastikan variabel server di Vercel

Di project Vercel, buka **Settings → Environment Variables** dan pastikan variabel backend berikut sudah terisi untuk **Production**:

- `FIREBASE_PROJECT_ID` — ID project Firebase, untuk project ini `sobatguru-digital`.
- `FIREBASE_CLIENT_EMAIL` — alamat service account Firebase Admin.
- `FIREBASE_PRIVATE_KEY` — private key dari service account yang sama. Jika disimpan satu baris, baris baru ditulis sebagai `\n`; jangan menambahkan tanda kutip ekstra di dalam nilainya.
- `DRIVE_ROOT_FOLDER_ID` — ID folder Google Drive dari langkah 1.

Website ini sudah memiliki konfigurasi Firebase browser. Pertahankan variabel `VITE_FIREBASE_*` yang sudah dipakai website; jangan taruh private key di sana. Kode backend memakai `FIREBASE_CLIENT_EMAIL` dan `FIREBASE_PRIVATE_KEY` untuk membaca Drive, jadi variabel `GOOGLE_SERVICE_ACCOUNT_EMAIL` dan `GOOGLE_PRIVATE_KEY` tidak diperlukan oleh kode ini.

Jika mengubah variabel di Vercel, jalankan **Redeploy** sesudah menyimpan. Jika tidak ada perubahan variabel dan deployment terbaru berstatus **Ready**, tidak perlu redeploy manual.

## 3. Admin: sinkronkan dan setujui sampel

1. Buka website dan login memakai akun admin dashboard.
2. Dari dashboard, klik **Samples**. Bisa juga buka `/samples`.
3. Di halaman admin Samples, pilih sinkronisasi Drive.
4. File baru akan tampil sebagai belum disetujui. Pilih file, lengkapi metadata yang diperlukan, lalu setujui agar bisa dipakai CS.

## 4. CS: login dan unduh

1. Admin membuat akun CS dari **Dashboard → Manajemen Staff**. Perannya adalah **Staff**.
2. CS masuk ke dashboard memakai username dan kata sandi akun itu.
3. Klik **Samples** di menu dashboard (atau buka `/samples`). Tidak perlu login Samples kedua kali dan tidak perlu mengisi peran secara manual di Firebase.
4. Cari file yang sudah disetujui admin, lalu tekan **Unduh**.

CS hanya menerima daftar sampel yang disetujui. Server memeriksa izin lagi sebelum mengunduh file dari Drive.

## Jika belum berhasil

- **Login ditolak:** gunakan username dan kata sandi dashboard. Akun harus masih terdaftar dan memiliki peran `admin` atau `staff`.
- **Akun admin bawaan tidak ditemukan:** gunakan akun admin yang sudah tersimpan di Manajemen Staff; akun contoh bawaan sengaja tidak dipakai.
- **Daftar sampel kosong:** sinkronkan Drive, lalu pastikan admin sudah menyetujui file.
- **Folder tidak bisa dibaca:** periksa bahwa folder dibagikan ke `FIREBASE_CLIENT_EMAIL` sebagai Viewer dan `DRIVE_ROOT_FOLDER_ID` benar.
- **Server memberi error 500:** di Vercel buka **Logs** untuk endpoint yang gagal. Periksa `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, dan format `FIREBASE_PRIVATE_KEY`.
- **Perubahan variabel belum terlihat:** tunggu deployment Vercel berstatus **Ready**, kemudian muat ulang website dan login kembali.

## Catatan

- Akun internal lama dimigrasikan server ke penyimpanan kata sandi berbentuk hash saat login berhasil; kata sandi lama dihapus dari dokumen akun.
- Sampel disimpan di Firestore, file aslinya tetap di Google Drive.
- File berukuran sangat besar dapat terkena batas ukuran respons serverless Vercel.
- Aturan Firestore production untuk project Sobatguru sudah membatasi akses browser ke data login. Jangan menimpa aturan Firebase yang sudah aktif dengan file yang masih berisi placeholder email admin.
