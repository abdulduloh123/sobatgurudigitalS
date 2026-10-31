import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Auth } from "firebase/auth";
import { LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { buildReport, profit, roas, type AdDay, type Lead, type Row, type Sale } from "./adsReport";

type Status = {
  connected: boolean; pageName?: string | null; pageError?: string | null; expiresAt?: string | null;
  lastSyncAt?: string | null; lastError?: string | null; needsReconnect?: boolean;
};

const rupiah = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const dayString = (date: Date) => date.toLocaleDateString("en-CA");
const daysAgo = (days: number) => dayString(new Date(Date.now() - days * 86_400_000));
const monthStart = () => { const now = new Date(); return dayString(new Date(now.getFullYear(), now.getMonth(), 1)); };
const moneyOr = (value: number | null) => (value === null ? "-" : rupiah(value));
const perUnit = (spend: number, count: number) => (spend && count ? spend / count : null);

export default function AdsPerformance({ auth, sales, leads }: { auth: Auth; sales: Sale[]; leads: Lead[] }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [days, setDays] = useState<AdDay[]>([]);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(daysAgo(0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncCount, setSyncCount] = useState(0);
  const synced = useRef(false);

  const call = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`/api/meta/${path}`, { ...init, headers: { Authorization: `Bearer ${token ?? ""}` } });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || `Gagal menghubungi server (HTTP ${response.status}).`);
    return json;
  }, [auth]);

  const refresh = useCallback(async (force = false) => {
    setBusy(true);
    setError("");
    try {
      let next: Status = await call("status");
      setStatus(next);
      if (next.connected) {
        // The server skips Meta when its copy is recent, so opening this page stays cheap.
        await call(`sync${force ? "?force=1" : ""}`, { method: "POST" });
        next = await call("status");
        setStatus(next);
        setSyncCount((count) => count + 1);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memuat data iklan.");
      void call("status").then(setStatus).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }, [call]);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!status?.connected) return;
    let alive = true;
    call(`report?from=${from}&to=${to}`)
      .then((result) => { if (alive) setDays(result.days); })
      .catch((cause: unknown) => { if (alive) setError(cause instanceof Error ? cause.message : "Gagal memuat data iklan."); });
    return () => { alive = false; };
  }, [status?.connected, call, from, to, syncCount]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === location.origin && event.data === "meta-connected") void refresh(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  async function connect() {
    // Opened before the request so the browser does not treat it as an unwanted popup.
    const popup = window.open("", "_blank");
    try {
      const { url } = await call("connect", { method: "POST" });
      if (popup) popup.location.href = url;
      else location.href = url;
    } catch (cause) {
      popup?.close();
      setError(cause instanceof Error ? cause.message : "Gagal memulai sambungan Meta.");
    }
  }

  const report = useMemo(() => buildReport(days, sales, leads, from, to), [days, sales, leads, from, to]);
  const total = report.sources.reduce<Row>((sum, row) => ({
    ...sum,
    spend: sum.spend + row.spend, chats: sum.chats + row.chats, leads: sum.leads + row.leads, closings: sum.closings + row.closings,
    revenue: sum.revenue + row.revenue, commission: sum.commission + row.commission,
  }), { label: "Total", spend: 0, impressions: 0, clicks: 0, chats: 0, leads: 0, closings: 0, revenue: 0, commission: 0 });
  const unknown = report.sources.find((row) => row.label === "Belum diisi");

  const presets: [string, string, string][] = [["7 hari", daysAgo(6), daysAgo(0)], ["30 hari", daysAgo(29), daysAgo(0)], ["Bulan ini", monthStart(), daysAgo(0)]];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Performa Iklan</h1>
          <p className="text-sm text-gray-500">Biaya iklan Meta digabung dengan lead dan closing. Laporan Finansial tidak berubah.</p>
        </div>
        {status?.connected && !status.needsReconnect && <div className="flex gap-2">
          <button onClick={() => void connect()} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-gray-700">Hubungkan ulang</button>
          <button onClick={() => void refresh(true)} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60">
            <RefreshCw size={16} className={busy ? "animate-spin" : ""} /> Perbarui
          </button>
        </div>}
      </div>

      {error && <Notice>{error}</Notice>}
      {status === null && !error && <p className="flex items-center gap-2 text-sm text-gray-500"><LoaderCircle size={16} className="animate-spin" /> Memuat status Meta…</p>}

      {status && (!status.connected || status.needsReconnect) && <div className="rounded-xl border bg-white p-5">
        <p className="font-bold text-gray-800">{status.needsReconnect ? "Sambungan Meta perlu diperbarui" : "Hubungkan akun Meta"}</p>
        <p className="mt-1 text-sm text-gray-500">Login Facebook sekali, lalu pilih akun iklan dan Halaman Anda. Akses hanya untuk membaca data iklan dan prospek.</p>
        <button onClick={() => void connect()} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">
          {status.needsReconnect ? "Hubungkan ulang" : "Hubungkan Meta"}
        </button>
      </div>}

      {status?.connected && <>
        {status.pageError && <Notice>Prospek belum tersambung: {status.pageError}</Notice>}
        {status.lastError && !status.needsReconnect && <Notice>Sinkronisasi terakhir gagal: {status.lastError}</Notice>}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {presets.map(([label, start, end]) => <button key={label} onClick={() => { setFrom(start); setTo(end); }}
            className={`rounded-full px-3 py-1.5 font-semibold ${from === start && to === end ? "bg-blue-600 text-white" : "border bg-white text-gray-600"}`}>{label}</button>)}
          <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border bg-white px-2 py-1.5" />
          <span className="text-gray-400">sampai</span>
          <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="rounded-lg border bg-white px-2 py-1.5" />
          {status.lastSyncAt && <span className="text-xs text-gray-400">Data Meta: {new Date(status.lastSyncAt).toLocaleString("id-ID")}</span>}
        </div>

        <Table title="Per sumber penjualan" nameHeader="Sumber" rows={report.sources} total={total} />
        <Table title="Per kampanye Meta" nameHeader="Kampanye" rows={report.campaigns} />

        <p className="text-xs text-gray-500">
          Laba = omzet − komisi − biaya iklan. ROAS di baris Total memakai omzet semua sumber, jadi untuk menilai iklan lihat baris Meta.
          {unknown ? ` ${unknown.closings} closing belum punya sumber, sehingga ROAS bisa terlihat lebih rendah dari aslinya.` : ""}
        </p>
      </>}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><TriangleAlert size={18} className="mt-0.5 shrink-0" /><span>{children}</span></div>;
}

function Table({ title, nameHeader, rows, total }: { title: string; nameHeader: string; rows: Row[]; total?: Row }) {
  const cells = (row: Row) => {
    const value = roas(row);
    return <>
      <td className="px-4 py-3 text-right">{row.spend ? rupiah(row.spend) : "-"}</td>
      <td className="px-4 py-3 text-right">{row.chats}</td>
      <td className="px-4 py-3 text-right">{moneyOr(perUnit(row.spend, row.chats))}</td>
      <td className="px-4 py-3 text-right">{row.leads}</td>
      <td className="px-4 py-3 text-right">{row.closings}</td>
      <td className="px-4 py-3 text-right">{moneyOr(perUnit(row.spend, row.closings))}</td>
      <td className="px-4 py-3 text-right">{rupiah(row.revenue)}</td>
      <td className="px-4 py-3 text-right">{value === null ? "-" : `${value.toFixed(1)}×`}</td>
      <td className={`px-4 py-3 text-right font-bold ${profit(row) >= 0 ? "text-green-600" : "text-rose-600"}`}>{rupiah(profit(row))}</td>
    </>;
  };
  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <h2 className="border-b px-4 py-3 font-bold text-gray-800">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm text-gray-700">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2.5 text-left">{nameHeader}</th>
              {["Biaya iklan", "Chat", "Biaya/chat", "Lead", "Closing", "Biaya/closing", "Omzet", "ROAS", "Laba"].map((label) => <th key={label} className="px-4 py-2.5 text-right">{label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => <tr key={row.label}><td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>{cells(row)}</tr>)}
            {!rows.length && <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Belum ada data pada periode ini.</td></tr>}
            {total && rows.length > 0 && <tr className="bg-gray-50 font-bold"><td className="px-4 py-3">{total.label}</td>{cells(total)}</tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
