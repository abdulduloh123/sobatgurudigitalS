import { collection, deleteDoc, doc, getDoc, getDocs, increment, runTransaction, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export interface WaNumber { n: string; on: boolean }
export interface WaGroup {
  mode: "rr" | "rand"; pixel: string; event: string; msg: string;
  numbers: WaNumber[]; counter: number; total: number; hits: Record<string, number>;
}

export const normPhone = (s: string) => {
  let d = s.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
};
export const validPhone = (d: string) => d.length >= 10 && d.length <= 15;
export const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
export const waLink = (n: string, msg: string) => `https://wa.me/${n}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

const ref = (slug: string) => doc(db, "waGroups", slug);

export async function listGroups() {
  const s = await getDocs(collection(db, "waGroups"));
  return s.docs.map((d) => ({ slug: d.id, ...(d.data() as WaGroup) }));
}
export const saveGroup = (slug: string, data: Partial<WaGroup>) => setDoc(ref(slug), data, { merge: true });
export const removeGroup = (slug: string) => deleteDoc(ref(slug));
export const resetStats = (slug: string) => updateDoc(ref(slug), { counter: 0, total: 0, hits: {} });

/** Memilih nomor (bergilir/acak) sekaligus mencatat klik. */
export async function pickNumber(slug: string) {
  const s = await getDoc(ref(slug));
  if (!s.exists()) return null;
  const group = s.data() as WaGroup;
  const act = (group.numbers ?? []).filter((x) => x.on);
  if (!act.length) return null;
  const rand = () => act[Math.floor(Math.random() * act.length)].n;
  let number: string;
  if (group.mode === "rr") {
    try {
      number = await runTransaction(db, async (tx) => {
        const d = (await tx.get(ref(slug))).data() as WaGroup;
        const a = d.numbers.filter((x) => x.on);
        const c = d.counter || 0;
        const p = a[c % a.length].n;
        tx.update(ref(slug), { counter: c + 1, total: increment(1), [`hits.${p}`]: increment(1) });
        return p;
      });
    } catch { number = rand(); }
  } else {
    number = rand();
    updateDoc(ref(slug), { total: increment(1), [`hits.${number}`]: increment(1) }).catch(() => {});
  }
  return { group, number };
}
