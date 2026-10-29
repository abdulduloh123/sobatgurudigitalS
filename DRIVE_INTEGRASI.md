# Panduan mudah: Samples dari Google Drive

**Samples** membantu CS mencari **isi** dokumen Word di folder Google Drive. CS mengetik materi (misalnya *manusia dan kehidupan*), lalu muncul dokumen yang memuat kata itu beserta cuplikan kalimatnya. Tidak ada proses persetujuan: semua dokumen Word di folder sampel langsung bisa dicari.

- Jenis file yang dibaca: **DOCX**, **DOC** (Word lama), dan **Google Docs**. Google Docs diunduh sebagai DOCX.
- Admin dan CS memakai **login dashboard yang sama**. Setelah login dashboard, klik **Samples** di menu; tidak perlu login lagi.

> Jangan pernah menempelkan private key ke chat, variabel yang diawali `VITE_`, atau GitHub.

## 1. Siapkan akses Google Drive

1. Pastikan **Google Drive API** aktif di Google Cloud project yang sama dengan Firebase.
2. Bagikan folder utama sampel kepada alamat pada variabel `FIREBASE_CLIENT_EMAIL` dengan akses **Viewer / Pelihat**.
3. Salin ID folder dari alamat Google Drive. Contoh, pada `drive.google.com/drive/folders/ABC123`, ID foldernya adalah `ABC123`.

Bagikan ke service account **hanya folder sampel ini**. Pencarian memakai semua file yang bisa dibuka service account, lalu server menyaring hanya file di dalam folder sampel.

## 2. Pastikan variabel server di Vercel

Di **Settings → Environment Variables** (Production):

- `FIREBASE_PROJECT_ID` — untuk project ini `sobatguru-digital`.
- `FIREBASE_CLIENT_EMAIL` — alamat service account Firebase Admin.
- `FIREBASE_PRIVATE_KEY` — private key service account yang sama. Jika satu baris, baris baru ditulis `\n`.
- `DRIVE_ROOT_FOLDER_ID` — ID folder Google Drive dari langkah 1.

Setelah mengubah variabel, jalankan **Redeploy**.

## 3. Admin: siapkan pencarian (sekali di awal)

1. Login dashboard sebagai admin, klik **Samples**, lalu buka tab **Kelola pencarian**.
2. Tekan **Siapkan pencarian** dan biarkan halaman terbuka. Sistem akan:
   - membersihkan data persetujuan lama (`driveSamples`),
   - memindai semua folder,
   - membaca isi setiap dokumen Word agar cuplikan muncul cepat,
   - menyusun daftar folder untuk filter.
3. Untuk ribuan file, proses ini bisa memakan waktu beberapa menit. Jika halaman tertutup atau koneksi putus, tekan tombolnya lagi — proses lanjut dari titik terakhir.
4. Jalankan **Perbarui pencarian** setelah menambah atau mengubah banyak file. Hanya file baru atau yang berubah yang dibaca ulang.

File yang baru diunggah tetap bisa dicari sebelum diperbarui (dibaca saat pertama kali muncul di hasil), tetapi filter folder baru ikut setelah diperbarui.

## 4. CS: cari dan unduh

1. Login dashboard, klik **Samples**.
2. Ketik materi yang dicari. Hasil muncul otomatis saat berhenti mengetik.
   - **Frasa persis** tampil paling atas, lalu dokumen yang memuat **semua kata**.
   - Jika hasilnya sedikit, ikut ditampilkan dokumen yang memuat **sebagian kata**.
3. Saring per folder (misalnya SD / SMP) dengan tombol di bawah kotak pencarian, atau klik nama folder pada hasil.
4. **Lihat semua cuplikan** untuk membaca semua bagian yang cocok sebelum mengunduh.
5. Isi **nama guru** (opsional) agar tercatat di log, lalu tekan **Unduh**.

Pintasan: tekan `/` untuk langsung mengetik, `Esc` untuk menghapus. Alamat halaman menyimpan kata pencarian, jadi link hasil bisa dibagikan ke CS lain.

## 5. Admin: log unduhan

Tab **Log unduhan** menampilkan 500 unduhan terakhir (siapa, file apa, untuk guru siapa), file yang paling sering diunduh, dan tombol **Unduh CSV**.

## Jika belum berhasil

- **Hasil kosong padahal file ada:** periksa ejaan; Google Drive butuh beberapa menit untuk mengindeks file yang baru diunggah.
- **Folder tidak bisa dibaca:** pastikan folder dibagikan ke `FIREBASE_CLIENT_EMAIL` sebagai Viewer dan `DRIVE_ROOT_FOLDER_ID` benar.
- **Ada file "gagal dibaca":** biasanya file rusak, dikunci kata sandi, atau lebih dari 40 MB. File tetap bisa ditemukan dan diunduh, hanya tanpa cuplikan. Perbaiki filenya lalu tekan **Coba baca ulang**.
- **Proses persiapan macet atau ID folder diganti:** tekan **Atur ulang proses**, lalu **Siapkan pencarian** lagi.
- **Server memberi error 500:** buka **Vercel → Logs** untuk endpoint yang gagal.

## Catatan teknis

- Pencarian memakai indeks teks lengkap Google Drive (`fullText contains`). Cuplikan dibuat server dari teks dokumen yang disimpan di Firestore (`sampleTexts`), diperbarui otomatis bila file berubah.
- Katalog file ada di `sampleFiles`, ringkasannya di `sampleIndex`. Semua data Samples hanya diakses server.
- File berukuran sangat besar dapat terkena batas ukuran respons serverless Vercel saat diunduh.
