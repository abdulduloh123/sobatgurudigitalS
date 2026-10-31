export type Sale = { id: string; date: string; amount: number; staffName?: string; leadId?: string | null; source?: string | null; campaign?: string | null };
export type Lead = { id: string; date?: string; source?: string | null; campaign?: string | null };
export type AdDay = { date: string; campaigns: { id: string; name: string; spend: number; impressions: number; clicks: number; chats?: number }[] };

export const SALE_SOURCES = ['Meta', 'TikTok', 'WA langsung', 'Referensi', 'Pelanggan lama', 'Lainnya'];
const UNKNOWN = 'Belum diisi';
const NO_CAMPAIGN = 'Kampanye tidak diketahui';

export type Row = { label: string; spend: number; impressions: number; clicks: number; chats: number; leads: number; closings: number; revenue: number; commission: number };

const blank = (label: string): Row => ({ label, spend: 0, impressions: 0, clicks: 0, chats: 0, leads: 0, closings: 0, revenue: 0, commission: 0 });

const leadSource = (source?: string | null) => {
    const value = (source ?? '').toLowerCase();
    if (value === 'facebook' || value === 'instagram') return 'Meta';
    if (value === 'tiktok') return 'TikTok';
    if (value === 'whatsapp') return 'WA langsung';
    return value && value !== 'direct' ? value : 'Lainnya';
};

/** Same rule as the finance report: 10% per sale, plus Rp50.000 per full Rp1 juta a staff sells in a day. */
export function saleCommissions(sales: Sale[]) {
    const perDay = new Map<string, number>();
    const key = (sale: Sale) => `${sale.staffName}_${sale.date}`;
    for (const sale of sales) perDay.set(key(sale), (perDay.get(key(sale)) ?? 0) + sale.amount);
    return new Map(sales.map((sale) => {
        const total = perDay.get(key(sale)) ?? 0;
        const bonus = total >= 1000000 ? 50000 * Math.floor(total / 1000000) : 0;
        return [sale.id, sale.amount * 0.1 + (total ? bonus * (sale.amount / total) : 0)];
    }));
}

const localDay = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-CA');
};

const norm = (value: string) => value.trim().toLowerCase();

export function buildReport(days: AdDay[], allSales: Sale[], allLeads: Lead[], from: string, to: string) {
    const inRange = (day: string) => day >= from && day <= to;
    const sales = allSales.filter((sale) => inRange(sale.date));
    const commissions = saleCommissions(allSales);
    const leadsById = new Map(allLeads.map((lead) => [lead.id, lead]));

    const sources = new Map<string, Row>();
    const campaigns = new Map<string, Row>();
    const row = (map: Map<string, Row>, label: string, key = label) => {
        if (!map.has(key)) map.set(key, blank(label));
        return map.get(key)!;
    };

    for (const day of days) {
        for (const campaign of day.campaigns) {
            for (const target of [row(sources, 'Meta'), row(campaigns, campaign.name, norm(campaign.name))]) {
                target.spend += campaign.spend;
                target.impressions += campaign.impressions;
                target.clicks += campaign.clicks;
                target.chats += campaign.chats ?? 0;
            }
        }
    }

    for (const lead of allLeads) {
        if (!inRange(localDay(lead.date))) continue;
        const source = leadSource(lead.source);
        row(sources, source).leads++;
        if (source === 'Meta' && lead.campaign) row(campaigns, lead.campaign, norm(lead.campaign)).leads++;
    }

    for (const sale of sales) {
        const lead = sale.leadId ? leadsById.get(sale.leadId) : undefined;
        const source = lead ? leadSource(lead.source) : sale.source || UNKNOWN;
        const targets = [row(sources, source)];
        const campaign = lead?.campaign || sale.campaign;
        if (source === 'Meta') targets.push(campaign ? row(campaigns, campaign, norm(campaign)) : row(campaigns, NO_CAMPAIGN, '\0'));
        for (const target of targets) {
            target.closings++;
            target.revenue += sale.amount;
            target.commission += commissions.get(sale.id) ?? 0;
        }
    }

    const byRevenue = (a: Row, b: Row) => b.spend - a.spend || b.revenue - a.revenue;
    return { sources: [...sources.values()].sort(byRevenue), campaigns: [...campaigns.values()].sort(byRevenue) };
}

export const profit = (row: Row) => row.revenue - row.commission - row.spend;
export const roas = (row: Row) => (row.spend ? row.revenue / row.spend : null);
