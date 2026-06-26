import { getDB } from '~/db/index';

/** "HH:mm" -> minutes since midnight, or null when blank/invalid. */
function toMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Detect activities whose time ranges overlap within the same admin row.
 * Mirrors the overlap rule rendered in TaskSheet.jsx so the validation request
 * can be blocked until the user resolves the conflicts.
 *
 * @param {{ phaseCode: string, date: string, sheetRows: object[] }} args
 * @returns {Promise<{ adminName: string, count: number }[]>} One entry per admin
 *          row that has overlapping activities (count = activities involved).
 */
export async function detectActivityOverlaps({ phaseCode, date, sheetRows = [] }) {
  const sheetKey = `sheet-${phaseCode ?? ''}-${date ?? ''}`;
  const cellData = (await getDB().then((d) => d.get('taskSheetEntries', sheetKey))) ?? {};

  // Group intervals by admin row index.
  const intervalsByRow = new Map();
  for (const [key, cell] of Object.entries(cellData)) {
    const [r] = key.split('-').map(Number);
    const start = toMinutes(cell?.ti);
    const end = toMinutes(cell?.to);
    if (start == null || end == null || end <= start) continue;
    if (!intervalsByRow.has(r)) intervalsByRow.set(r, []);
    intervalsByRow.get(r).push({ start, end });
  }

  const conflicts = [];
  for (const [rowIdx, intervals] of intervalsByRow) {
    const overlapping = new Set();
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const A = intervals[i];
        const B = intervals[j];
        if (A.start < B.end && B.start < A.end) {
          overlapping.add(i);
          overlapping.add(j);
        }
      }
    }
    if (overlapping.size > 0) {
      conflicts.push({
        adminName: sheetRows[rowIdx]?.adminName ?? `Row ${rowIdx + 1}`,
        count: overlapping.size,
      });
    }
  }

  return conflicts;
}
