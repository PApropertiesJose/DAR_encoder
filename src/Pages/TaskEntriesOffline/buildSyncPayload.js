import { getDB } from '~/db/index';
import { getDBService } from '~/services/indexedDB';
import { DB_SCHEMA, DB_VERSION } from '~/Constants/schemas';

/**
 * Build the sync payload for DAR.usp_SyncOfflineTaskAssignment from the offline
 * IndexedDB data captured by TaskEntryForm.
 *
 * Sources:
 *   - `sheetRows`         : one admin/worker row  -> one HDR summary
 *   - `taskSheetEntries`  : cellData keyed `sheet-{phaseCode}-{date}`, with cells
 *                           keyed `${rowIdx}-${actIdx}` -> LIN lines
 *
 * The returned object is JSON.stringify-ready and matches
 * server/samples/sync-payload.sample.json.
 *
 * @param {{ phaseCode: string, date: string, username: string }} params
 * @returns {Promise<{ syncBy: string, recUser: string, summaries: object[] }>}
 */
export async function buildSyncPayload({ phaseCode, date, username }) {
  // 1. Load admin rows for this phase/date.
  const db = getDBService('AppOfflineDB', DB_VERSION, DB_SCHEMA);
  let rows;
  try {
    rows = await db.getAllFromIndex('sheetRows', 'byPhaseDate', IDBKeyRange.only([phaseCode, date]));
  } catch {
    const all = await db.getAll('sheetRows');
    rows = all.filter((r) => r.phaseCode === phaseCode && r.date === date);
  }

  // 2. Load the cell grid for this sheet (same key TaskSheet.jsx uses).
  const sheetKey = `sheet-${phaseCode ?? ''}-${date ?? ''}`;
  const cellData = (await getDB().then((d) => d.get('taskSheetEntries', sheetKey))) ?? {};

  // 3. Assemble one HDR summary per admin row, with its activity cells as lines.
  //    The summary Code is generated server-side by the stored proc, so we only
  //    send the components it needs (adminSystem, adminId, noahSystem, phaseCode, date).
  const summaries = rows.map((row, rowIdx) => {
    const lines = Object.entries(cellData)
      .filter(([key]) => parseInt(key.split('-')[0], 10) === rowIdx)
      .map(([, cell]) => mapCellToLine(cell, username))
      // Only push cells that actually carry an activity or a time.
      .filter((line) => line.taskCode || line.dateTimeIn || line.blk)
      // Sort ascending by Time In, then Time Out. Blank/invalid times sink to the end.
      .sort((a, b) =>
        toMinutes(a.dateTimeIn) - toMinutes(b.dateTimeIn) ||
        toMinutes(a.dateTimeOut) - toMinutes(b.dateTimeOut)
      );

    return {
      adminWorker: row.adminName ?? null,
      adminSystem: row.system ?? 'MANUAL',
      adminId: String(row.adminId ?? ''),
      hrisSystem: row.hrisSystem ?? "HRIS",
      noahSystem: row.noahSystem ?? "NOAH_PAAPDC",
      phaseCode,
      dateTimeIn: date,          // yyyy-MM-dd
      status: 0,
      isActive: 1,
      recUser: username,
      lines,
    };
  })
  // Drop admins with no activity lines so we don't sync empty headers.
  .filter((summary) => summary.lines.length > 0);

  return {
    syncBy: username,
    recUser: username,
    summaries,
  };
}

/** Maps a TaskSheet cell to a LIN line. */
function mapCellToLine(cell, username) {
  const endsPastFour = exceedsSixteen(cell?.to);
  return {
    category: cell?.constructionIndex ?? cell?.activityTitle ?? null,
    blk: cell?.block ?? null,
    lot: cell?.lot ?? null,
    taskCode: cell?.activityCode ?? null,
    taskDescription: cell?.activityDescription ?? null,
    dateTimeIn: cell?.ti ?? null,        // HH:mm
    dateTimeOut: cell?.to ?? null,       // HH:mm
    isOT: endsPastFour ? 1 : 0,
    otBatchID: null,
    otCategory: null,
    otTargetIn: null,
    otTargetOut: null,
    isActive: 1,
    recUser: username,
    isNew: 1,
    isEnd: 0,
    projectedTimeOut: null,
    justificationForOt: cell?.justification ?? null,
    uploadedCode: cell?.modelCode ?? null,
    rn: cell?.rn ?? null,   // present => already synced; proc UPDATEs instead of INSERTs
  };
}

/** Mirrors TaskSheet's SIXTEEN rule: activities ending past 16:00. */
function exceedsSixteen(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
  if (!m) return false;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) > 16 * 60;
}

/** "HH:mm" -> minutes since midnight. Blank/invalid returns Infinity so it sorts last. */
function toMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
  if (!m) return Infinity;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
