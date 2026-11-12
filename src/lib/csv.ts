type Cell = string | number | null | undefined;

const escapeCell = (value: Cell) => {
    const text = value == null ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Downloads rows as a CSV that Excel opens correctly (UTF-8 with BOM, ';' friendly via quoting). */
export function downloadCsv(filename: string, rows: Cell[][]) {
    const body = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/** Same day-of-month `count` months later, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsIso(isoDate: string, count: number) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const target = new Date(Date.UTC(year, month - 1 + count, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
}
