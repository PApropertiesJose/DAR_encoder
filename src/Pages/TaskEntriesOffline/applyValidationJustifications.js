import { getDB } from '~/db/index';

/**
 * Apply the validation result from the modal back onto the TaskSheet cell grid
 * stored in IndexedDB ('taskSheetEntries' keyed by sheetKey).
 *
 * Each validation row is matched to a sheet cell by admin + blk + lot + taskCode
 * + timeIn + timeOut. For every match we persist:
 *   - `rn`            : the database row number, so the cell is remembered as
 *                       already synced on later loads.
 *   - `justification` : the (over-budget) justification text, when present.
 *
 * @param {object}   args
 * @param {object[]} args.rows       Validation rows (with `rn`/`justification`) from the modal.
 * @param {object[]} args.sheetRows  Admin rows; index maps to the cell key row index.
 * @param {string}   args.phaseCode
 * @param {string}   args.date
 * @returns {Promise<number>} Count of cells updated.
 */
export async function applyValidationJustifications({ rows, sheetRows, phaseCode, date }) {
  const sheetKey = `sheet-${phaseCode ?? ''}-${date ?? ''}`;
  const db = await getDB();
  const cellData = (await db.get('taskSheetEntries', sheetKey)) ?? {};

  // adminId -> row index in the sheet (cell keys are `${rowIdx}-${actIdx}`).
  const adminIdToRowIdx = new Map(
    sheetRows.map((r, idx) => [String(r.adminId ?? ''), idx])
  );

  let applied = 0;
  const next = { ...cellData };

  for (const row of rows) {
    const rowIdx = adminIdToRowIdx.get(String(row.adminWorker ?? ''));
    if (rowIdx == null) continue;

    // Find the activity cell on this admin's row that matches the validation line.
    const matchKey = Object.keys(next).find((key) => {
      const [r] = key.split('-').map(Number);
      if (r !== rowIdx) return false;
      const cell = next[key];
      return (
        (cell.block ?? null) === (row.blk ?? null) &&
        (cell.lot ?? null) === (row.lot ?? null) &&
        (cell.activityCode ?? null) === (row.taskCode ?? null) &&
        (cell.ti ?? null) === (row.timeIn ?? null) &&
        (cell.to ?? null) === (row.timeOut ?? null)
      );
    });

    if (!matchKey) continue;

    // Collect the fields to persist on this cell.
    // An `rn` of 0 (or null) means not yet synced — don't store it.
    const update = {};
    if (row.rn != null && Number(row.rn) !== 0) update.rn = row.rn;
    const justification = (row.justification ?? '').trim();
    if (justification) update.justification = justification;

    if (Object.keys(update).length === 0) continue;
    next[matchKey] = { ...next[matchKey], ...update };
    applied++;
  }

  await db.put('taskSheetEntries', next, sheetKey);
  return applied;
}
