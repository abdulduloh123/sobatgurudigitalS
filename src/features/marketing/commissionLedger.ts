export const COMMISSION_START = '2026-11-01';

type Sale = { date: string; amount: number; staffName?: string; paymentStatus?: string };
type Payout = { staffName?: string; amount: number; payoutDate?: string; note?: string; ledger?: boolean };

export type LedgerEntry = { date: string; label: string; amount: number; balance: number };

function dayBonus(total: number) {
    return total >= 1000000 ? 50000 * Math.floor(total / 1000000) : 0;
}

function commissionByDay(sales: Sale[]) {
    const days = new Map<string, number>();
    for (const sale of sales) days.set(sale.date, (days.get(sale.date) ?? 0) + sale.amount);
    return [...days].map(([date, total]) => ({ date, amount: total * 0.1 + dayBonus(total) }));
}

/** Balance = what was unpaid before the start date, plus commission earned since, minus balance payouts. Nothing is stored. */
export function staffLedger(staffName: string, allSales: Sale[], allPayouts: Payout[]) {
    const sales = allSales.filter((sale) => sale.staffName === staffName);
    const before = sales.filter((sale) => sale.date < COMMISSION_START && sale.paymentStatus !== 'paid');
    const opening = commissionByDay(before).reduce((total, day) => total + day.amount, 0);
    const days = commissionByDay(sales.filter((sale) => sale.date >= COMMISSION_START));
    const payouts = allPayouts.filter((payout) => payout.ledger && payout.staffName === staffName);

    const items = [
        ...days.map((day) => ({ date: day.date, label: 'Komisi dan bonus', amount: day.amount })),
        ...payouts.map((payout) => ({ date: payout.payoutDate ?? '', label: payout.note ? `Pencairan: ${payout.note}` : 'Pencairan', amount: -payout.amount })),
    ].sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);

    let balance = opening;
    const entries: LedgerEntry[] = items.map((item) => {
        balance += item.amount;
        return { ...item, balance };
    });
    return {
        opening,
        earned: days.reduce((total, day) => total + day.amount, 0),
        paid: payouts.reduce((total, payout) => total + payout.amount, 0),
        balance,
        entries: entries.reverse(),
    };
}

export function staffNames(sales: Sale[]) {
    return [...new Set(sales.map((sale) => sale.staffName).filter((name): name is string => Boolean(name)))].sort();
}
