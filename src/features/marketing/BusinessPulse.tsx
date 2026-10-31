import { useEffect, useMemo, useState } from "react";
import type { Auth } from "firebase/auth";
import { Activity, TriangleAlert } from "lucide-react";
import { buildReport, roas, type AdDay, type Lead, type Row, type Sale } from "./adsReport";

type Status = { connected: boolean; lastSyncAt?: string | null; needsReconnect?: boolean; lastError?: string | null };
type Pixel = { id: string; name: string; last_fired_time?: string };

const rupiah = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const DAY = 86_400_000;
const STALE_PIXEL_MS = 2 * DAY;
const shift = (date: string, days: number) => new Date(new Date(date).getTime() + days * DAY).toISOString().slice(0, 10);

function change(now: number, before: number) {
  if (!before) return null;
  return (now - before) / before;
}

function Delta({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  if (value === null) return <span className="text-[11px] text-gray-400">belum ada pembanding</span>;
  const good = value >= 0 === goodWhenUp;
  return <span className={`text-[11px] font-bold ${good ? "text-green-600" : "text-rose-600"}`}>{value >= 0 ? "+" : ""}{(value * 100).toFixed(0)}% dari periode lalu</span>;
}

const sum = (rows: Row[], pick: (row: Row) => number) => rows.reduce((total, row) => total + pick(row), 0);

export default function BusinessPulse({ auth, sales, leads, from, to }: { auth: Auth; sales: Sale[]; leads: Lead[]; from: string; to: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [days, setDays] = useState<AdDay[]>([]);
  const [pixels, setPixels] = useState<Pixel[] | null>(null);
  const [checkedAt, setCheckedAt] = useState(0);
  const [error, setError] = useState("");

  const length = Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY) + 1;
  const prevFrom = shift(from, -length);
  const prevTo = shift(from, -1);

  useEffect(() => {
    let alive = true;
    const call = async (path: string, init: RequestInit = {}) => {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/meta/${path}`, { ...init, headers: { Authorization: `Bearer ${token ?? ""}` } });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || `Gagal memuat data iklan (HTTP ${response.status}).`);
      return json;
    };
    void (async () => {
      try {
        const first: Status = await call("status");
        if (first.connected && !first.needsReconnect) await call("sync", { method: "POST" });
        const next: Status = first.connected ? await call("status") : first;
        const report = first.connected ? await call(`report?from=${prevFrom}&to=${to}`) : { days: [] };
        const found = first.connected ? await call("pixels").catch(() => ({ pixels: null })) : { pixels: null };
        if (!alive) return;
        setStatus(next);
        setDays(report.days);
        setPixels(found.pixels);
        setCheckedAt(Date.now());
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : "Gagal memuat data iklan.");
      }
    })();
    return () => { alive = false; };
  }, [auth, prevFrom, to]);

  const now = useMemo(() => buildReport(days.filter((day) => day.date >= from && day.date <= to), sales, leads, from, to), [days, sales, leads, from, to]);
  const before = useMemo(() => buildReport(days.filter((day) => day.date >= prevFrom && day.date <= prevTo), sales, leads, prevFrom, prevTo), [days, sales, leads, prevFrom, prevTo]);

  const meta = now.sources.find((row) => row.label === "Meta");
  const metaBefore = before.sources.find((row) => row.label === "Meta");
  const unknown = now.sources.find((row) => row.label === "Belum diisi");
  const revenue = sum(now.sources, (row) => row.revenue);
  const revenueBefore = sum(before.sources, (row) => row.revenue);
  const spend = meta?.spend ?? 0;
  const chats = meta?.chats ?? 0;
  const costPerChat = chats ? spend / chats : 0;
  const costPerChatBefore = metaBefore?.chats ? metaBefore.spend / metaBefore.chats : 0;
  const value = meta ? roas(meta) : null;
  const valueBefore = metaBefore ? roas(metaBefore) : null;

  const firedAt = pixels?.map((pixel) => pixel.last_fired_time).filter(Boolean).sort().pop();
  const pixelAlive = Boolean(firedAt) && checkedAt - new Date(firedAt as string).getTime() < STALE_PIXEL_MS;

  const alerts: string[] = [];
  const chatChange = change(costPerChat, costPerChatBefore);
  if (chatChange !== null && chatChange >= 0.3) alerts.push(`Biaya per chat naik ${(chatChange * 100).toFixed(0)}% dibanding periode lalu.`);
  if (unknown?.closings) alerts.push(`${unknown.closings} closing belum punya sumber, jadi ROAS bisa terlihat lebih rendah.`);
  if (status?.needsReconnect) alerts.push("Sambungan Meta perlu diperbarui di tab Performa Iklan.");
  if (status?.lastError && !status.needsReconnect) alerts.push(`Sinkronisasi Meta terakhir gagal: ${status.lastError}`);
  if (pixels && !pixelAlive) alerts.push("Pixel tidak terlihat aktif dalam 2 hari terakhir.");

  const funnel: [string, number | null][] = [["Biaya iklan", null], ["Chat", chats], ["Closing", meta?.closings ?? 0]];

  if (status && !status.connected) return null;

  return (
    <section className="space-y-4">
      {error && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><TriangleAlert size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Biaya iklan Meta" value={rupiah(spend)}><Delta value={change(spend, metaBefore?.spend ?? 0)} goodWhenUp={false} /></Card>
        <Card label="ROAS Meta" value={value === null ? "-" : `${value.toFixed(1)}×`}><Delta value={value !== null && valueBefore ? change(value, valueBefore) : null} /></Card>
        <Card label="Chat dari iklan" value={chats.toLocaleString("id-ID")}><Delta value={change(chats, metaBefore?.chats ?? 0)} /></Card>
        <Card label="Biaya per chat" value={chats ? rupiah(costPerChat) : "-"}><Delta value={chatChange} goodWhenUp={false} /></Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 font-bold text-gray-800">Corong Meta</h3>
          <ol className="space-y-2 text-sm">
            {funnel.map(([label, count]) => <li key={label} className="flex justify-between gap-3"><span className="text-gray-500">{label}</span><b className="text-gray-800">{count === null ? rupiah(spend) : count.toLocaleString("id-ID")}</b></li>)}
            <li className="flex justify-between gap-3 border-t pt-2"><span className="text-gray-500">Omzet</span><b className="text-green-600">{rupiah(meta?.revenue ?? 0)}</b></li>
          </ol>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 font-bold text-gray-800">Sumber penjualan</h3>
          <div className="space-y-2.5">
            {now.sources.filter((row) => row.revenue > 0).map((row) => {
              const share = revenue ? (row.revenue / revenue) * 100 : 0;
              return <div key={row.label}>
                <div className="flex justify-between gap-3 text-sm"><span className="text-gray-600">{row.label}</span><b className="text-gray-800">{rupiah(row.revenue)}</b></div>
                <div className="mt-1 h-1.5 rounded bg-gray-100"><div className="h-1.5 rounded bg-blue-600" style={{ width: `${share}%` }} /></div>
              </div>;
            })}
            {!revenue && <p className="text-sm text-gray-400">Belum ada penjualan pada periode ini.</p>}
          </div>
          <div className="mt-3 border-t pt-2"><Delta value={change(revenue, revenueBefore)} /></div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-800"><Activity size={16} /> Status sambungan</h3>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex justify-between gap-3"><span>Meta Ads</span><b className={status?.needsReconnect ? "text-rose-600" : "text-green-600"}>{status === null ? "Memuat…" : status.needsReconnect ? "Perlu diperbarui" : "Terhubung"}</b></li>
            <li className="flex justify-between gap-3"><span>Terakhir sinkron</span><span>{status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-"}</span></li>
            <li className="flex justify-between gap-3"><span>Pixel</span><b className={pixels === null ? "text-gray-400" : pixelAlive ? "text-green-600" : "text-rose-600"}>{pixels === null ? "Tidak terbaca" : pixelAlive ? "Aktif" : "Tidak aktif"}</b></li>
          </ul>
          {alerts.length > 0 && <div className="mt-3 border-t pt-2">
            <p className="mb-1 text-xs font-bold text-amber-700">Perlu perhatian</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">{alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul>
          </div>}
        </div>
      </div>

      <p className="text-xs text-gray-500">Biaya Meta di panel ini belum masuk Total Pengeluaran di bawah. Pengeluaran iklan tetap dicatat manual sebagai Marketing.</p>
    </section>
  );
}

function Card({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return <div className="rounded-xl border bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p><p className="mt-1 text-xl font-black text-gray-800">{value}</p>{children}</div>;
}
