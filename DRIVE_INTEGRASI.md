# Panduan pelan-pelan: pasang Katalog Sampel Drive

> Panduan ini menggunakan **Firebase yang sudah dipakai project**. Anda tidak perlu membuat akun Supabase. Ikuti dari langkah 1 sampai 7 secara berurutan. Bagian rahasia seperti private key hanya disimpan di komputer/Vercel; jangan kirimkan ke chat.

## Gambaran sederhananya

- **Firebase Authentication** menyimpan akun login admin dan CS.
- **Firestore** menyimpan daftar sampel dan status persetujuannya.
- **Google Drive** menyimpan file PDF/dokumen aslinya.
- **Vercel** menjalankan server kecil yang menghubungkan Firebase ke Google Drive.

Alamat katalog adalah `https://alamat-website-anda/samples`. Admin menyinkronkan Drive dan menyetujui sampel. CS hanya melihat sampel yang sudah disetujui.

## Yang perlu disiapkan

- Akses ke Firebase Console project `sobatguru-digital`.
- Akses ke folder Google Drive yang akan dipakai.
- Akses ke project website di Vercel.
- Project dibuka di komputer untuk mengisi `.env.local`.

## 1. Aktifkan login email di Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Klik project **sobatguru-digital**.
3. Di menu kiri pilih **Build → Authentication**. Jika diminta, tekan **Get started**.
4. Buka tab **Sign-in method**.
5. Klik **Email/Password**, nyalakan pilihan Email/Password, lalu tekan **Save**.
6. Buka tab **Users**, tekan **Add user**.
7. Buat akun admin. Ulangi untuk setiap staf CS. Catat email dan kata sandinya.

Ini hanya membuat akun login. Setelah itu kita harus memberi tahu aplikasi mana akun admin dan mana akun CS.

## 2. Catat UID dan beri peran

UID adalah kode panjang unik milik akun Firebase. Kita memakai UID ini untuk memberi akses.

1. Masih di **Authentication → Users**, klik akun admin yang baru dibuat.
2. Salin nilai **User UID**. Lakukan juga untuk tiap akun CS.
3. Di menu kiri buka **Build → Firestore Database → Data**. Jika database belum dibuat, tekan **Create database**, pilih Production mode, lalu pilih lokasi yang sesuai.
4. Tekan **Start collection**.
5. Isi Collection ID dengan `sampleUsers`, lalu tekan **Next**.
6. Pada Document ID, tempel UID akun admin.
7. Tambahkan satu field: nama `role`, tipe `string`, nilai `admin`. Simpan dokumen.
8. Untuk setiap staf, tambahkan dokumen baru di collection `sampleUsers`. Document ID = UID staf, field `role` bertipe `string`, nilainya `cs`.

Contoh isi yang diharapkan:

```text
sampleUsers
  ├── UID-admin  → role: "admin"
  └── UID-staf   → role: "cs"
```

Jangan membuat UID sendiri. Salin UID yang ditampilkan Firebase. Jangan buat field bernama `Role` dengan huruf besar; namanya harus tepat `role`.

## 3. Pasang aturan keamanan Firestore

> Langkah ini penting supaya CS tidak bisa menyetujui sampel atau melihat file yang belum disetujui.

1. Buka **Firestore Database → Rules** di Firebase Console.
2. Pada screenshot Anda, ada satu aturan umum `match /{document=**}`. Karena aturan umum itu juga membuka data katalog untuk semua pengguna yang login, ganti dengan aturan yang dibatasi per bagian.
3. Buka file project [firestore.rules](./firestore.rules), salin seluruh isinya, lalu tempel di editor Rules Firebase.
4. Di file itu cari `GANTI_EMAIL_ADMIN@gmail.com`, ganti dengan email akun admin Firebase Anda, lalu tempel versi yang sudah diganti ke Firebase Console.
5. Tekan **Publish**. Ini hanya mengubah aturan akses; data Firestore tidak dihapus.

Jika Firebase Console Anda sudah punya aturan tambahan yang tidak terlihat di screenshot, jangan hapus aturan tambahan itu. Gabungkan aturan tersebut dengan file project. Aturan lain yang penting untuk potongan katalog saja tersedia di [firestore.drive.rules](./firestore.drive.rules).

## 4. Buat akses Google Drive untuk server

> Server harus mendapat akses membaca folder Drive. Akun Google pribadi Anda tidak perlu dibuat publik.

1. Buka **Firebase Console → ikon roda gigi → Project settings → Service accounts**.
2. Pastikan project yang terpilih adalah `sobatguru-digital`.
3. Tekan **Generate new private key**, lalu konfirmasi unduhan. Anda akan mendapat file `.json`. Simpan di tempat aman; jangan masukkan file JSON itu ke folder website atau Git.
4. Buka [Google Cloud Console](https://console.cloud.google.com/), pilih project yang sama.
5. Buka **APIs & Services → Library**, cari **Google Drive API**, lalu tekan **Enable**. Jika tombolnya bertuliskan Manage, API sudah aktif.
6. Buka file JSON yang tadi diunduh menggunakan Notepad. Cari dua nilai berikut:
   - `client_email`: alamat email service account.
   - `private_key`: teks panjang yang dimulai `-----BEGIN PRIVATE KEY-----`.
7. Buka folder Google Drive yang akan menjadi folder sampel. Tekan **Share**, tempel `client_email`, beri akses **Viewer**, lalu tekan **Send/Share**.

Drive API dan Firebase Admin memakai email serta private key service account yang sama. Folder Drive tetap hanya dibagikan kepada service account tersebut.

## 5. Ambil ID folder Drive

Misalnya alamat folder di browser:

```text
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv
```

ID foldernya adalah bagian setelah `/folders/`:

```text
1AbCdEfGhIjKlMnOpQrStUv
```

Contoh susunan folder yang disarankan:

```text
Folder Sampel/
  SMP/
    7/
      IPA/
        Bab 1 Sistem Organisasi Kehidupan.pdf
```

Nama folder `SMP`, `7`, dan `IPA` akan mengisi otomatis jenjang, kelas, dan mapel. Nama folder boleh berbeda, tetapi tiga tingkat folder itu yang dipakai untuk isian otomatis.

## 6. Isi `.env.local` di komputer

1. Buka folder project Sobatguru di File Explorer.
2. Buat salinan file `.env.example` di folder yang sama, lalu beri nama **`.env.local`**. Jika Windows menyembunyikan ekstensi file, gunakan VS Code atau Notepad → Save As → nama file `.env.local` dan tipe **All files**.
3. Buka `.env.local` dengan Notepad.
4. Isi bagian backend seperti contoh berikut. Ganti teks contoh dengan data milik Anda:

```dotenv
FIREBASE_PROJECT_ID=sobatguru-digital
FIREBASE_CLIENT_EMAIL=EMAIL_AKUN_LAYANAN_DARI_JSON
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTEMPEL_PRIVATE_KEY_DARI_JSON\n-----END PRIVATE KEY-----\n"
DRIVE_ROOT_FOLDER_ID=ID_FOLDER_DRIVE
```

Cara mengisinya:

- `FIREBASE_PROJECT_ID`: ID project Firebase, biasanya terlihat di **Project settings → General**. Untuk project ini kemungkinan `sobatguru-digital`.
- `FIREBASE_CLIENT_EMAIL`: salin `client_email` dari JSON.
- `FIREBASE_PRIVATE_KEY`: salin seluruh nilai `private_key` dari JSON, termasuk baris BEGIN/END. Biarkan tanda kutip di luar dan gunakan `\n` untuk jeda baris.
- Google Drive otomatis memakai `FIREBASE_CLIENT_EMAIL` dan `FIREBASE_PRIVATE_KEY` yang sama. Jadi, **tidak perlu mengisi** `GOOGLE_SERVICE_ACCOUNT_EMAIL` atau `GOOGLE_PRIVATE_KEY`. Jika variabel itu sudah ada di Vercel, boleh dibiarkan; versi kode ini mengabaikannya.
- `DRIVE_ROOT_FOLDER_ID`: isi ID folder dari langkah 5 tanpa URL.

> **Satu langkah izin Drive:** bagikan folder utama ke email `FIREBASE_CLIENT_EMAIL` dengan akses **Viewer / Pelihat**. Jangan bagikan private key.

> Jangan mengisi private key ke variabel yang diawali `VITE_`. Jangan kirim private key ke saya. `.env.local` sudah diabaikan Git, jadi jangan menghapus aturan itu dari `.gitignore`.

## 7. Isi variabel di Vercel dan deploy

Vercel perlu nilai yang sama agar fitur berfungsi setelah website online.

1. Buka [Vercel Dashboard](https://vercel.com/dashboard), pilih project website Sobatguru.
2. Buka **Settings → Environment Variables**.
3. Pastikan empat variabel berikut ada (variabel `VITE_FIREBASE_*` yang sudah dipakai situs tetap diperlukan):
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `DRIVE_ROOT_FOLDER_ID`
   Variabel `GOOGLE_SERVICE_ACCOUNT_EMAIL` dan `GOOGLE_PRIVATE_KEY` tidak diperlukan.
4. Pilih **Production**. Jika Anda juga memakai alamat Preview, centang **Preview**.
5. Tekan **Save** setiap variabel.
6. Buka tab **Deployments**, pilih deployment terbaru, tekan menu `…`, lalu pilih **Redeploy**.

## 8. Coba katalog

1. Setelah deploy selesai, buka `https://alamat-website-anda/samples`.
2. Login menggunakan akun admin yang dibuat di langkah 1.
3. Jika muncul pesan akun belum punya akses, periksa lagi dokumen `sampleUsers/{UID}` di langkah 2.
4. Pilih **Kelola Drive**, lalu tekan **Sinkronkan dari Drive**.
5. File Drive muncul sebagai **Belum disetujui**. Klik satu file dan lengkapi **Jenjang, Kelas, Mapel, dan Jenis dokumen**.
6. Centang persetujuan untuk CS, lalu tekan **Simpan perubahan**.
7. Untuk mencoba sisi CS, buka jendela browser privat/incognito, buka `/samples`, dan login memakai akun CS.
8. Cari file yang baru disetujui. File draft seharusnya tidak terlihat bagi akun CS.

## Jalankan di komputer (opsional)

`npm run dev` menjalankan halaman website saja. Endpoint `/api/...` untuk sinkronisasi dan unduhan dijalankan oleh Vercel CLI.

1. Buka Terminal di folder project.
2. Jalankan `npx vercel dev`.
3. Jika diminta login atau menghubungkan project Vercel, ikuti petunjuk di layar.
4. Buka alamat lokal yang ditampilkan, lalu tambahkan `/samples`.

Untuk penggunaan pertama, lebih mudah mencoba sesudah deploy ke Vercel, karena environment variable server sudah diisi di sana.

## Kalau ada pesan error

- **“Akun ini belum memiliki akses”**: UID dokumen `sampleUsers` tidak cocok, atau nilai `role` bukan `admin` / `cs`.
- **“Silakan login” terus kembali ke halaman login**: pastikan Email/Password sudah aktif dan email/sandi benar.
- **Akun server belum bisa membuka folder Drive**: bagikan folder utama ke email `FIREBASE_CLIENT_EMAIL` sebagai Viewer dan pastikan `DRIVE_ROOT_FOLDER_ID` benar.
- **Kunci Firebase server tidak terbaca**: periksa `FIREBASE_CLIENT_EMAIL` dan `FIREBASE_PRIVATE_KEY` di Vercel.
- **Sinkronisasi berhasil tetapi 0 file**: periksa apakah folder yang dituju benar dan akun tersebut bisa melihat file di dalamnya.
- **CS tidak melihat file**: admin harus mengisi metadata dan menyetujui file terlebih dahulu.
- **Unduhan file sangat besar gagal**: ada batas ukuran respons serverless Vercel; simpan file besar di layanan penyimpanan file khusus bila diperlukan.

## Catatan keamanan

CS menerima daftar sampel yang sudah disetujui melalui backend. Backend tidak mengirim ID asli file Google Drive ke browser dan memeriksa izin lagi sebelum setiap unduhan. Private key hanya disimpan di `.env.local` dan Vercel, bukan di browser.
