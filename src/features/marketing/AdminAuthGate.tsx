import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { auth } from "../../lib/firebase";

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

/** Menyimpan data WA Rotator / Meta Pixel butuh login Firebase Auth (email admin di firestore.rules). */
export default function AdminAuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const login = async () => {
    setErr(""); setBusy(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), pass); setPass(""); }
    catch { setErr("Login gagal. Periksa email dan password admin Firebase."); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    await signOut(auth);
    try { await signInAnonymously(auth); } catch { /* abaikan */ }
  };

  if (user && !user.isAnonymous) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span>Login Firebase: {user.email}</span>
          <button className="font-semibold underline" onClick={logout}>Keluar dari Firebase</button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold">Login admin Firebase</h3>
      <p className="text-xs text-slate-500">Diperlukan agar pengaturan bisa disimpan. Gunakan email admin yang sama dengan di <code>firestore.rules</code>.</p>
      <input className={inp} type="email" placeholder="Email admin" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={inp} type="password" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void login(); }} />
      <button disabled={busy} onClick={login} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Masuk…" : "Masuk"}</button>
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
    </div>
  );
}
