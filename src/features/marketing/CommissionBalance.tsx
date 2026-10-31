import { useMemo, useState } from "react";
import { COMMISSION_START, staffLedger, staffNames } from "./commissionLedger";

type Sale = Parameters<typeof staffLedger>[1][number];
type Payout = Parameters<typeof staffLedger>[2][number];

const rupiah = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;

export function LedgerList({ ledger }: { ledger: ReturnType<typeof staffLedger> }) {
  return (
    <ul className="divide-y text-sm">
      {ledger.entries.slice(0, 30).map((entry, index) => <li key={index} className="flex justify-between gap-3 py-2">
        <span className="text-gray-600">{entry.date} · {entry.label}</span>
        <span className="whitespace-nowrap"><b className={entry.amount >= 0 ? "text-green-600" : "text-rose-600"}>{entry.amount >= 0 ? "+" : "−"}{rupiah(Math.abs(entry.amount))}</b> <span className="text-xs text-gray-400">saldo {rupiah(entry.balance)}</span></span>
      </li>)}
      <li className="flex justify-between gap-3 py-2"><span className="text-gray-600">Saldo awal per {COMMISSION_START}</span><b className="text-gray-800">{rupiah(ledger.opening)}</b></li>
    </ul>
  );
}

export default function CommissionBalance({ sales, payouts, onPay }: { sales: Sale[]; payouts: Payout[]; onPay: (staffName: string, amount: number, note: string) => Promise<void> }) {
  const [open, setOpen] = useState("");
  const [paying, setPaying] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => staffNames(sales).map((name) => ({ name, ledger: staffLedger(name, sales, payouts) })), [sales, payouts]);
  const total = rows.reduce((sum, row) => sum + row.ledger.balance, 0);

  async function submit(name: string) {
    const value = Number(amount);
    if (!(value > 0)) return;
    setBusy(true);
    try {
      await onPay(name, value, note.trim());
      setPaying("");
      setAmount("");
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Saldo Komisi</h2>
          <p className="text-xs text-gray-500">Cair kapan saja dan boleh dicicil. Saldo awal dihitung dari komisi yang belum dibayar sebelum {COMMISSION_START}.</p>
        </div>
        <p className="text-sm text-gray-500">Total harus disiapkan: <b className="text-gray-800">{rupiah(total)}</b></p>
      </div>
      <ul className="divide-y">
        {rows.map(({ name, ledger }) => <li key={name} className="px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setOpen(open === name ? "" : name)} className="font-semibold text-gray-800 hover:text-blue-700">{name}</button>
            <div className="flex items-center gap-3">
              <b className={ledger.balance >= 0 ? "text-gray-800" : "text-rose-600"}>{rupiah(ledger.balance)}</b>
              <button onClick={() => { setPaying(name); setAmount(String(Math.max(0, Math.round(ledger.balance)))); }} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white">Cairkan</button>
            </div>
          </div>
          {paying === name && <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Nominal pencairan" className="w-40 rounded-lg border px-3 py-1.5 text-sm" />
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Catatan, misal transfer BCA" className="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm" />
            <button onClick={() => void submit(name)} disabled={busy} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60">Simpan</button>
            <button onClick={() => setPaying("")} className="text-sm text-gray-500">Batal</button>
          </div>}
          {open === name && <div className="mt-2"><LedgerList ledger={ledger} /></div>}
        </li>)}
        {!rows.length && <li className="px-5 py-8 text-center text-sm text-gray-400">Belum ada data penjualan.</li>}
      </ul>
    </section>
  );
}
