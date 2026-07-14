// Exports the Task Sheet to an Excel-compatible file without any external
// dependency. We emit an HTML table with Excel's `application/vnd.ms-excel`
// MIME type (`.xls`) — Excel and LibreOffice open this natively, honour the
// merged header cells (colspan/rowspan) and cell styling.

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const HEADER_BG = '#00595c';

/**
 * Build the Task Sheet as an Excel-compatible HTML document.
 *
 * @param {Object[]} rows         Admin rows (adminName, adminPosition …).
 * @param {Object}   cellData     Map of `${rowIdx}-${actIdx}` → activity cell.
 * @param {number}   activityCount Number of activity (planned) columns.
 */
const buildHtml = (rows, cellData, activityCount) => {
  const acts = Array.from({ length: activityCount });

  const topHeader = acts
    .map((_, i) => `<th colspan="5" style="background:${HEADER_BG};color:#fff;">Activity ${i + 1}</th>`)
    .join('');

  const subHeader = acts
    .map(
      () =>
        `<th style="background:${HEADER_BG};color:#fff;">Blk &amp; Lot</th>` +
        `<th style="background:${HEADER_BG};color:#fff;">TimeIn</th>` +
        `<th style="background:${HEADER_BG};color:#fff;">TimeOut</th>` +
        `<th style="background:${HEADER_BG};color:#fff;">Activity</th>` +
        `<th style="background:${HEADER_BG};color:#fff;">Justification</th>`
    )
    .join('');

  const body = rows
    .map((row, rowIdx) => {
      const cells = acts
        .map((_, actIdx) => {
          const e = cellData[`${rowIdx}-${actIdx}`] ?? {};
          const blkLot = e.block ? `${e.block} / ${e.lot}${e.rn ? ` (#${e.rn})` : ''}` : '';
          return (
            `<td>${esc(blkLot)}</td>` +
            `<td>${esc(e.ti)}</td>` +
            `<td>${esc(e.to)}</td>` +
            `<td>${esc(e.activityCode)}</td>` +
            `<td>${esc(e.justification)}</td>`
          );
        })
        .join('');
      return (
        `<tr>` +
        `<td>${rowIdx + 1}</td>` +
        `<td>${esc(row.adminPosition)}</td>` +
        `<td>${esc(row.adminName)}</td>` +
        cells +
        `</tr>`
      );
    })
    .join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="utf-8" />
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11px; }
  th, td { border: 1px solid #888; padding: 4px 8px; text-align: center; white-space: nowrap; }
  th { font-weight: bold; }
</style>
</head>
<body>
<table border="1">
  <thead>
    <tr>
      <th rowspan="2" style="background:${HEADER_BG};color:#fff;">NO</th>
      <th rowspan="2" style="background:${HEADER_BG};color:#fff;">SKILLS</th>
      <th rowspan="2" style="background:${HEADER_BG};color:#fff;">NAME</th>
      ${topHeader}
    </tr>
    <tr>${subHeader}</tr>
  </thead>
  <tbody>${body}</tbody>
</table>
</body>
</html>`;
};

const sanitize = (s) => String(s ?? '').replace(/[^a-z0-9_-]+/gi, '_');

/**
 * Generate and download the Task Sheet as an .xls file.
 */
export function exportTaskSheetToExcel({ rows = [], cellData = {}, activityCount = 0, params = {} }) {
  const html = buildHtml(rows, cellData, activityCount);
  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel;charset=utf-8' });

  const fileName = `TaskSheet_${sanitize(params.phaseCode) || 'phase'}_${sanitize(params.date) || 'date'}.xls`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
}
