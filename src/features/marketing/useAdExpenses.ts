import { useEffect, useState } from "react";
import type { Auth } from "firebase/auth";
import { adExpenseRows, AD_COST_START, type AdExpense } from "./adsReport";

/** Daily Meta spend from the cutover date on, shaped like expense records so the finance reports can count it. */
export function useAdExpenses(auth: Auth, enabled: boolean) {
  const [adExpenses, setAdExpenses] = useState<AdExpense[]>([]);
  const [adExpensesError, setAdExpensesError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const headers = { Authorization: `Bearer ${token ?? ""}` };
        // A failed refresh still leaves the stored days usable, and the reason shows in Performa Iklan.
        await fetch("/api/meta/sync", { method: "POST", headers }).catch(() => undefined);
        const today = new Date().toLocaleDateString("en-CA");
        const response = await fetch(`/api/meta/report?from=${AD_COST_START}&to=${today > AD_COST_START ? today : AD_COST_START}`, { headers });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || `HTTP ${response.status}`);
        if (alive) { setAdExpenses(adExpenseRows(json.days)); setAdExpensesError(""); }
      } catch (cause) {
        if (alive) setAdExpensesError(cause instanceof Error ? cause.message : "Gagal memuat biaya Meta.");
      }
    })();
    return () => { alive = false; };
  }, [auth, enabled]);

  return { adExpenses, adExpensesError };
}
