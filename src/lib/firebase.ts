// Jika project Anda SUDAH punya inisialisasi Firebase, hapus file ini dan
// arahkan import `db` di folder marketing ke file milik Anda.
//
// Catatan integrasi: nilai dibaca dari .env (VITE_FIREBASE_*). Jika belum diisi,
// otomatis memakai konfigurasi Firebase yang sudah dipakai App.tsx, sehingga
// website tetap berjalan normal tanpa .env.
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDoPPfpC_2Ftry_czzchHCSBabhuBbFwVY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sobatguru-digital.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sobatguru-digital",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1070589838471:web:238f0eac698a0454096422",
};

export const app = getApps()[0] ?? initializeApp(cfg);
export const db = getFirestore(app);
export const auth = getAuth(app);
