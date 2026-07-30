import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { getDB } from '~/db/index';
import { ActionIcon, Button, Container, Group, Paper, Table, Text, useMantineColorScheme, Box, TextInput, ThemeIcon, Tooltip, Stack } from '@mantine/core';
import BlkLotModal from './BlkLotModal';
import ActivityModal from './ActivityModal';
import TimePickerModal from './TimePickerModal';
import JustificationModal from './JustificationModal';
import { ClipboardPasteIcon, CopyIcon, InfoIcon, Sheet, SquareDashedMousePointerIcon, Trash2Icon, XIcon } from 'lucide-react'
import { notifications } from '@mantine/notifications';
import { exportTaskSheetToExcel } from './exportTaskSheetToExcel';
import './TaskSheet.css';

const thStyle = { textAlign: 'center' };
const BG = '#00595c';

// Long-press-to-delete on a Blk & Lot cell. A press shorter than TAP_MS is a
// tap and opens the editor; past that the progress ring appears and the gesture
// is a hold, which either completes at LONG_PRESS_MS or aborts on release.
const TAP_MS = 200;
const LONG_PRESS_MS = 800;
// Ring fills over the time that's actually left once it becomes visible.
const RING_MS = LONG_PRESS_MS - TAP_MS;
// How long after a hold ends a click stays swallowed — long enough to cover the
// pointerup -> click gap, short enough to expire before any later interaction.
const CLICK_GRACE_MS = 400;

// 16:00 in minutes — activities ending past this require a justification.
const SIXTEEN = 16 * 60;

const isLandDevt = (constructionIndex) =>
  (constructionIndex ?? '').toLowerCase().includes('land devt');

const toMinutes = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

// Columns are flattened: each activity contributes these 5, in this order.
// `read` pulls the copyable payload out of a cell, `keys` are the entry fields
// a paste overwrites, and `text` is the plain-text form written to the system
// clipboard. `rn` is deliberately never copied — it identifies an already-synced
// server line and must stay with the cell it was issued for.
const FIELDS = [
  {
    label: 'Blk & Lot',
    keys: ['block', 'lot', 'modelCode'],
    read: (e) => (e?.block ? { block: e.block, lot: e.lot ?? null, modelCode: e.modelCode ?? null } : null),
    text: (e) => (e?.block ? `${e.block} / ${e.lot ?? ''}` : ''),
  },
  {
    label: 'Time In',
    keys: ['ti'],
    read: (e) => (e?.ti ? { ti: e.ti } : null),
    text: (e) => e?.ti ?? '',
  },
  {
    label: 'Time Out',
    keys: ['to'],
    read: (e) => (e?.to ? { to: e.to } : null),
    text: (e) => e?.to ?? '',
  },
  {
    label: 'Activity',
    keys: ['activityCode', 'activityDescription', 'activityTitle', 'activityModel', 'constructionIndex'],
    read: (e) => (e?.activityCode ? {
      activityCode: e.activityCode,
      activityDescription: e.activityDescription ?? null,
      activityTitle: e.activityTitle ?? null,
      activityModel: e.activityModel ?? null,
      constructionIndex: e.constructionIndex ?? null,
    } : null),
    text: (e) => e?.activityCode ?? '',
  },
  {
    label: 'Justification',
    keys: ['justification'],
    read: (e) => (e?.justification?.trim() ? { justification: e.justification } : null),
    text: (e) => e?.justification ?? '',
  },
];

const COLS_PER_ACT = FIELDS.length;

/** Overwrites one field group on a cell. A null value clears it. */
const applyField = (entry, kind, value) => {
  const next = { ...entry };
  for (const k of FIELDS[kind].keys) delete next[k];
  return value ? { ...next, ...value } : next;
};

/** Re-applies the sheet's invariants after a paste has merged fields in. */
const normalizeEntry = (entry, before) => {
  const next = { ...entry };
  if (isLandDevt(next.constructionIndex)) {
    next.block = '000';
    next.lot = '0000';
    next.modelCode = null;
  }
  // Same rule as picking a new activity by hand: a different task means the
  // synced line no longer applies.
  if (next.activityCode !== before?.activityCode) delete next.rn;
  return next;
};

const isEmptyEntry = (entry) => FIELDS.every((f) => f.read(entry) == null);

const TaskSheet = memo(({ params, rows = [], onDeleteRow, validateNonce = 0, reloadNonce = 0 }) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  const [activityCount, setActivityCount] = useState(0);

  // Blk & Lot modal
  const [blkLotOpen, setBlkLotOpen] = useState(false);
  const [activeBlkLot, setActiveBlkLot] = useState(null);
  const [cellData, setCellData] = useState({});

  const sheetKey = params ? `sheet-${params.phaseCode ?? ''}-${params.date ?? ''}` : 'sheet';

  // Load persisted cell data on mount and restore activity column count
  useEffect(() => {
    getDB().then((db) => db.get('taskSheetEntries', sheetKey)).then((saved) => {
      if (!saved) return;
      setCellData(saved);
      const maxActIdx = Object.keys(saved).reduce((max, key) => {
        const actIdx = parseInt(key.split('-')[1], 10);
        return isNaN(actIdx) ? max : Math.max(max, actIdx);
      }, -1);
      if (maxActIdx >= 0) setActivityCount(maxActIdx + 1);
    });
  }, [sheetKey]);

  // Reload cell data after the validation modal writes justifications to IndexedDB.
  useEffect(() => {
    if (!reloadNonce) return; // skip initial mount
    getDB().then((db) => db.get('taskSheetEntries', sheetKey)).then((saved) => {
      setCellData(saved ?? {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadNonce]);

  const persistCellData = (next) => {
    getDB().then((db) =>
      Object.keys(next).length === 0
        ? db.delete('taskSheetEntries', sheetKey)
        : db.put('taskSheetEntries', next, sheetKey)
    );
  };

  // Activity modal
  const [activityOpen, setActivityOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState(null); // { rowIdx, actIdx }

  // Time modal
  const [timeOpen, setTimeOpen] = useState(false);
  const [activeTime, setActiveTime] = useState(null); // { rowIdx, actIdx, field: 'ti'|'to' }

  const handleBlkLotClick = (rowIdx, actIdx) => {
    setActiveBlkLot({ rowIdx, actIdx });
    setBlkLotOpen(true);
  };

  const deleteActivity = (actIdx) => {
    setCellData((prev) => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        const [r, a] = k.split('-').map(Number);
        if (a === actIdx) continue;
        const newKey = a > actIdx ? `${r}-${a - 1}` : k;
        next[newKey] = v;
      }
      persistCellData(next);
      return next;
    });
    setActivityCount((c) => c - 1);
    setClipboard(null); // its origin marker points at columns that just shifted
  };

  const deleteAdminRow = (rowIdx) => {
    setCellData((prev) => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        const [r, a] = k.split('-').map(Number);
        if (r === rowIdx) continue;
        const newKey = r > rowIdx ? `${r - 1}-${a}` : k;
        next[newKey] = v;
      }
      persistCellData(next);
      return next;
    });
    setClipboard(null); // its origin marker points at rows that just shifted
    onDeleteRow?.(rows[rowIdx]);
    notifications.show({ title: 'Admin removed from sheet', color: 'red', position: 'top-right' });
  };

  const deleteAdminTask = (rowIdx, actIdx) => {
    const key = `${rowIdx}-${actIdx}`;
    setCellData((prev) => {
      const next = { ...prev };
      delete next[key];
      persistCellData(next);
      return next;
    });
    notifications.show({
      title: 'Removed an activity',
      position: 'top-right'
    });
  };

  const ringTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const pressStartRef = useRef(0);
  // Clicks arriving before this timestamp are swallowed. A timestamp rather
  // than a flag so an abort that never produces a click (pointer dragged off
  // the cell) can't leave the next tap permanently blocked.
  const suppressClickUntilRef = useRef(0);
  // Cell currently being held down, so only that one draws a progress ring.
  const [pressedKey, setPressedKey] = useState(null);

  const clearPressTimers = () => {
    clearTimeout(ringTimerRef.current);
    clearTimeout(longPressTimerRef.current);
  };

  const handleBlkLotPointerDown = (rowIdx, actIdx) => {
    pressStartRef.current = 0;
    // While picking cells, a lingering finger must never delete one.
    if (selectMode) return;
    // Nothing to delete on an empty cell — don't promise an action that
    // won't happen. A tap still opens the editor.
    if (!cellData[`${rowIdx}-${actIdx}`]) return;
    pressStartRef.current = Date.now();
    // The ring waits out the tap window, so a quick tap opens the editor with
    // no flash of red — and anything that shows a ring is a hold, not a tap.
    ringTimerRef.current = setTimeout(() => setPressedKey(`${rowIdx}-${actIdx}`), TAP_MS);
    longPressTimerRef.current = setTimeout(() => {
      pressStartRef.current = 0;
      suppressClickUntilRef.current = Date.now() + CLICK_GRACE_MS;
      setPressedKey(null);
      deleteAdminTask(rowIdx, actIdx);
    }, LONG_PRESS_MS);
  };

  const handleBlkLotPointerUp = () => {
    clearPressTimers();
    // Released after the ring appeared: the user aborted a delete, so don't
    // fall through to opening the editor.
    if (pressStartRef.current && Date.now() - pressStartRef.current >= TAP_MS) {
      suppressClickUntilRef.current = Date.now() + CLICK_GRACE_MS;
    }
    pressStartRef.current = 0;
    setPressedKey(null);
  };

  // Don't let a press that outlives the sheet fire a delete.
  useEffect(() => clearPressTimers, []);

  const handleBlkLotClickGuarded = (rowIdx, actIdx) => {
    if (Date.now() < suppressClickUntilRef.current) return;
    const entry = cellData[`${rowIdx}-${actIdx}`];
    if (isLandDevt(entry?.constructionIndex)) {
      notifications.show({
        title: 'Land Devt activity',
        message: 'Block & Lot is fixed at 000 / 0000 for Land Devt activities.',
        color: 'blue',
        position: 'top-right',
      });
      return;
    }
    handleBlkLotClick(rowIdx, actIdx);
  };

  const handleBlkLotConfirm = ({ block, lot, modelCode }) => {
    const key = `${activeBlkLot.rowIdx}-${activeBlkLot.actIdx}`;
    setCellData((prev) => {
      const next = { ...prev, [key]: { ...prev[key], block, lot, modelCode } };
      persistCellData(next);
      return next;
    });
    setBlkLotOpen(false);
    setActiveBlkLot(null);
  };

  const handleActivityClick = (rowIdx, actIdx) => {
    setActiveActivity({ rowIdx, actIdx });
    setActivityOpen(true);
  };

  const handleActivityConfirm = (activity) => {
    const key = `${activeActivity.rowIdx}-${activeActivity.actIdx}`;
    setCellData((prev) => {
      const existing = prev[key] ?? {};
      const activityChanged = existing.activityCode !== activity.activityCode;
      const merged = { ...existing, ...activity };
      if (activityChanged) delete merged.rn;
      if (isLandDevt(activity.constructionIndex)) {
        merged.block = '000';
        merged.lot = '0000';
        merged.modelCode = null;
      }
      const next = { ...prev, [key]: merged };
      persistCellData(next);
      return next;
    });
    setActivityOpen(false);
    setActiveActivity(null);
    notifications.show({ title: 'Activity saved', color: 'teal', position: 'top-right' });
  };

  const handleTimeClick = (rowIdx, actIdx, field) => {
    setActiveTime({ rowIdx, actIdx, field });
    setTimeOpen(true);
  };

  const handleTimeConfirm = (time) => {
    const { rowIdx, actIdx, field } = activeTime;
    const key = `${rowIdx}-${actIdx}`;
    setCellData((prev) => {
      const next = { ...prev, [key]: { ...prev[key], [field]: time } };
      persistCellData(next);
      return next;
    });
    setTimeOpen(false);
    setActiveTime(null);
  };

  // Justification modal
  const [justOpen, setJustOpen] = useState(false);
  const [activeJust, setActiveJust] = useState(null); // { rowIdx, actIdx }

  const handleJustificationClick = (rowIdx, actIdx) => {
    setActiveJust({ rowIdx, actIdx });
    setJustOpen(true);
  };

  const handleJustificationConfirm = (text) => {
    const key = `${activeJust.rowIdx}-${activeJust.actIdx}`;
    setCellData((prev) => {
      const next = { ...prev, [key]: { ...prev[key], justification: text } };
      persistCellData(next);
      return next;
    });
    setJustOpen(false);
    setActiveJust(null);
  };

  // Overlap detection — for each admin row, flag activities whose time
  // ranges overlap each other (e.g. 7:00–8:00 vs 7:30–10:00).
  const overlapKeys = useMemo(() => {
    const set = new Set();
    for (let r = 0; r < rows.length; r++) {
      const intervals = [];
      for (let a = 0; a < activityCount; a++) {
        const e = cellData[`${r}-${a}`];
        const start = toMinutes(e?.ti);
        const end = toMinutes(e?.to);
        if (start != null && end != null && end > start) intervals.push({ a, start, end });
      }
      for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
          const A = intervals[i];
          const B = intervals[j];
          if (A.start < B.end && B.start < A.end) {
            set.add(`${r}-${A.a}`);
            set.add(`${r}-${B.a}`);
          }
        }
      }
    }
    return set;
  }, [cellData, rows.length, activityCount]);

  // Summarise issues when the user clicks "Validate Entries" in the parent.
  useEffect(() => {
    if (!validateNonce) return; // skip initial mount
    let missingJust = 0;
    for (let r = 0; r < rows.length; r++) {
      for (let a = 0; a < activityCount; a++) {
        const e = cellData[`${r}-${a}`];
        const end = toMinutes(e?.to);
        if (end != null && end > SIXTEEN && !(e?.justification?.trim())) missingJust++;
      }
    }
    const overlaps = overlapKeys.size;
    if (overlaps === 0 && missingJust === 0) {
      notifications.show({ title: 'Validation passed', message: 'No overlapping activities.', color: 'teal', position: 'top-right' });
    } else {
      notifications.show({
        title: 'Validation issues found',
        message: `${overlaps} overlapping activity cell(s) highlighted in red. ${missingJust} activity(ies) past 16:00 still need a justification.`,
        color: 'red',
        position: 'top-right',
        autoClose: 6000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateNonce]);

  // Stripe colors — theme-aware
  const stripeEven = dark ? '#1a1b1e' : '#f8f9fa';
  const stripeOdd = dark ? '#25262b' : '#ffffff';

  // Blk & Lot cell colors — theme-aware
  const blkLotSet = dark ? '#1b3a2a' : '#e8f5e9';
  const blkLotEmpty = dark ? '#3a3010' : '#fff9c4';

  // Time cell colors — theme-aware
  const timeSet = dark ? '#1a2a3a' : '#e3f2fd';
  const timeEmpty = dark ? '#25262b' : '#ffffff';

  // Overlap highlight — theme-aware red
  const overlapBg = dark ? '#5c1a1a' : '#ffc9c9';
  const overlapText = dark ? '#ffa8a8' : '#c92a2a';

  // Justification cell colors
  const justFilledBg = '#D51C39'; // solid red once a justification is entered
  const justRequiredBg = dark ? '#3a2a10' : '#fff3bf'; // amber prompt: needs input

  const stickyBg = (rowIdx) => (rowIdx % 2 === 0 ? stripeEven : stripeOdd);

  const [hoveredKey, setHoveredKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const rowRefs = useRef({});
  const scrollContainerRef = useRef(null);

  // Keyboard cell navigation. Columns are flattened: each activity has 5
  // columns (Blk&Lot, TimeIn, TimeOut, Activity, Justification).
  const [selectedCell, setSelectedCell] = useState(null); // anchor { row, col }
  const [selectionEnd, setSelectionEnd] = useState(null); // opposite corner, null = single cell
  const [clipboard, setClipboard] = useState(null);       // { kind, cells, origin }
  const [selectMode, setSelectMode] = useState(false);    // touch: tap selects instead of editing
  const cellRefs = useRef({});

  // The selected block, normalised to top-left / bottom-right.
  const selectionRect = () => {
    if (!selectedCell) return null;
    const end = selectionEnd ?? selectedCell;
    return {
      row0: Math.min(selectedCell.row, end.row),
      row1: Math.max(selectedCell.row, end.row),
      col0: Math.min(selectedCell.col, end.col),
      col1: Math.max(selectedCell.col, end.col),
    };
  };

  const inRect = (rect, row, col) =>
    !!rect && row >= rect.row0 && row <= rect.row1 && col >= rect.col0 && col <= rect.col1;

  const focusSheet = () => scrollContainerRef.current?.focus({ preventScroll: true });

  const copySelection = () => {
    const rect = selectionRect();
    if (!rect) {
      notifications.show({ title: 'Nothing selected', message: 'Click a cell first, then copy.', color: 'yellow', position: 'top-right' });
      return;
    }
    const cells = [];
    const lines = [];
    for (let row = rect.row0; row <= rect.row1; row++) {
      const values = [];
      const texts = [];
      for (let col = rect.col0; col <= rect.col1; col++) {
        const entry = cellData[`${row}-${Math.floor(col / COLS_PER_ACT)}`];
        const field = FIELDS[col % COLS_PER_ACT];
        values.push(field.read(entry));
        texts.push(field.text(entry));
      }
      cells.push(values);
      lines.push(texts.join('\t'));
    }
    setClipboard({ kind: rect.col0 % COLS_PER_ACT, cells, origin: rect });
    // Mirror to the OS clipboard so the same selection can be pasted into Excel.
    // Unavailable over plain http — the in-sheet clipboard above still works.
    navigator.clipboard?.writeText(lines.join('\n'))?.catch(() => { });
    // In Select mode a tap extends the block, so release it — otherwise the
    // tap on the paste target would stretch the copied range instead.
    if (selectMode) clearSelection();
    const count = cells.length * cells[0].length;
    notifications.show({
      title: `Copied ${count} cell${count > 1 ? 's' : ''}`,
      message: selectMode
        ? 'Tap the target cell (same column type), then Paste.'
        : 'Select a target cell in the same column type, then paste.',
      color: 'teal',
      position: 'top-right',
    });
  };

  const pasteToSelection = () => {
    if (!clipboard) {
      notifications.show({ title: 'Clipboard is empty', message: 'Copy a cell first.', color: 'yellow', position: 'top-right' });
      return;
    }
    const rect = selectionRect();
    if (!rect) {
      notifications.show({ title: 'Nothing selected', message: 'Click the cell you want to paste into.', color: 'yellow', position: 'top-right' });
      return;
    }
    const sourceLabel = FIELDS[clipboard.kind].label;
    if (rect.col0 % COLS_PER_ACT !== clipboard.kind) {
      notifications.show({
        title: 'Column mismatch',
        message: `You copied a ${sourceLabel} cell — paste into a ${sourceLabel} column.`,
        color: 'yellow',
        position: 'top-right',
      });
      return;
    }

    // Repeat the copied block to fill the selection when it divides evenly
    // (copy one cell, select ten rows, fill them all); otherwise paste once.
    const clipH = clipboard.cells.length;
    const clipW = clipboard.cells[0].length;
    const selH = rect.row1 - rect.row0 + 1;
    const selW = rect.col1 - rect.col0 + 1;
    const spanH = selH > clipH && selH % clipH === 0 ? selH : clipH;
    const spanW = selW > clipW && selW % clipW === 0 ? selW : clipW;

    // Collect per-cell field updates first so each entry is merged once.
    const totalCols = activityCount * COLS_PER_ACT;
    const updates = new Map();
    for (let r = 0; r < spanH; r++) {
      const row = rect.row0 + r;
      if (row >= rows.length) break;
      for (let c = 0; c < spanW; c++) {
        const col = rect.col0 + c;
        if (col >= totalCols) break;
        const key = `${row}-${Math.floor(col / COLS_PER_ACT)}`;
        if (!updates.has(key)) updates.set(key, {});
        updates.get(key)[col % COLS_PER_ACT] = clipboard.cells[r % clipH][c % clipW];
      }
    }

    const next = { ...cellData };
    let pasted = 0;
    let lockedBlkLot = 0;
    for (const [key, fields] of updates) {
      const before = cellData[key];
      let entry = { ...(before ?? {}) };
      for (const [kind, value] of Object.entries(fields)) {
        const k = Number(kind);
        // Land Devt cells hold a fixed 000 / 0000 — leave them alone unless the
        // same paste is also replacing the activity.
        if (k === 0 && fields[3] === undefined && isLandDevt(entry.constructionIndex)) {
          lockedBlkLot++;
          continue;
        }
        entry = applyField(entry, k, value);
        pasted++;
      }
      entry = normalizeEntry(entry, before);
      if (isEmptyEntry(entry)) delete next[key];
      else next[key] = entry;
    }

    setCellData(next);
    persistCellData(next);
    // Same reason as after a copy: leave the next tap free to pick a new target.
    if (selectMode) clearSelection();
    notifications.show({
      title: pasted > 0 ? `Pasted ${pasted} cell${pasted > 1 ? 's' : ''}` : 'Nothing pasted',
      message: lockedBlkLot > 0
        ? `${lockedBlkLot} Land Devt cell(s) kept their fixed 000 / 0000.`
        : undefined,
      color: pasted > 0 ? 'teal' : 'yellow',
      position: 'top-right',
    });
  };

  const activateCell = ({ row, col }) => {
    const actIdx = Math.floor(col / COLS_PER_ACT);
    const field = col % COLS_PER_ACT;
    if (field === 0) handleBlkLotClickGuarded(row, actIdx);
    else if (field === 1) handleTimeClick(row, actIdx, 'ti');
    else if (field === 2) handleTimeClick(row, actIdx, 'to');
    else if (field === 3) handleActivityClick(row, actIdx);
    else if (field === 4) handleJustificationClick(row, actIdx);
  };

  const handleSheetKeyDown = (e) => {
    const totalCols = activityCount * COLS_PER_ACT;
    if (totalCols === 0 || rows.length === 0) return;

    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        copySelection();
      } else if (key === 'v') {
        e.preventDefault();
        pasteToSelection();
      }
      return;
    }

    // Collapse the block and drop the copy marker, but keep what was copied so
    // it can still be pasted.
    if (e.key === 'Escape') {
      setSelectionEnd(null);
      setClipboard((prev) => (prev ? { ...prev, origin: null } : null));
      return;
    }

    if (e.key === 'Enter') {
      if (selectedCell) {
        e.preventDefault();
        activateCell(selectedCell);
      }
      return;
    }

    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();

    const move = ({ row, col }) => {
      if (e.key === 'ArrowUp') return { row: Math.max(0, row - 1), col };
      if (e.key === 'ArrowDown') return { row: Math.min(rows.length - 1, row + 1), col };
      if (e.key === 'ArrowLeft') return { row, col: Math.max(0, col - 1) };
      return { row, col: Math.min(totalCols - 1, col + 1) };
    };

    // Shift + arrows grow the block from the anchor; plain arrows collapse it.
    if (e.shiftKey) {
      if (!selectedCell) {
        setSelectedCell({ row: 0, col: 0 });
        return;
      }
      setSelectionEnd((prev) => move(prev ?? selectedCell));
      return;
    }

    setSelectionEnd(null);
    setSelectedCell((prev) => (prev ? move(prev) : { row: 0, col: 0 }));
  };

  // Keep selection within bounds when rows/activities change
  useEffect(() => {
    const totalCols = activityCount * COLS_PER_ACT;
    const clamp = (prev) => {
      if (!prev) return prev;
      if (totalCols === 0 || rows.length === 0) return null;
      return {
        row: Math.min(prev.row, rows.length - 1),
        col: Math.min(prev.col, totalCols - 1),
      };
    };
    setSelectedCell(clamp);
    setSelectionEnd(clamp);
  }, [activityCount, rows.length]);

  // Scroll the moving edge of the selection into view within the scroll container
  useEffect(() => {
    const edge = selectionEnd ?? selectedCell;
    if (!edge) return;
    const el = cellRefs.current[`${edge.row}-${edge.col}`];
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedCell, selectionEnd]);

  const isSelected = (row, col) => selectedCell?.row === row && selectedCell?.col === col;

  const activeRect = selectionRect();

  // Anchor gets a solid outline, the rest of the block a tint, and the cells a
  // copy was taken from a dashed marker until the next copy or Escape.
  const cellChrome = (row, col) => {
    const style = {};
    if (inRect(activeRect, row, col)) {
      style.boxShadow = 'inset 0 0 0 9999px rgba(0, 170, 255, 0.14)';
    }
    if (inRect(clipboard?.origin, row, col)) {
      style.outline = '2px dashed #7048e8';
      style.outlineOffset = '-2px';
    }
    if (isSelected(row, col)) {
      style.outline = '2px solid #00aaff';
      style.outlineOffset = '-2px';
    }
    return style;
  };

  // Selecting a cell also opens its editor, so shift-click extends the block
  // instead of triggering the modal. Touch has no Shift and no way to tap a
  // cell without opening its editor, so Select mode turns taps into pure
  // selection: the first sets the anchor, each one after extends the block.
  const selectCell = (e, row, col, openEditor) => {
    if (selectMode) {
      if (selectedCell) setSelectionEnd({ row, col });
      else setSelectedCell({ row, col });
      return;
    }
    if (e.shiftKey && selectedCell) {
      setSelectionEnd({ row, col });
      return;
    }
    setSelectedCell({ row, col });
    setSelectionEnd(null);
    openEditor();
  };

  const clearSelection = () => {
    setSelectedCell(null);
    setSelectionEnd(null);
  };

  const toggleSelectMode = () => {
    // Always start from a clean slate so the first tap is unambiguously the
    // anchor, not an extension of something selected minutes ago.
    clearSelection();
    setSelectMode((on) => !on);
  };

  const selectionSize = activeRect
    ? { rows: activeRect.row1 - activeRect.row0 + 1, cols: activeRect.col1 - activeRect.col0 + 1 }
    : null;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const matchedIndices = debouncedQuery.trim()
    ? rows.reduce((acc, row, idx) => {
      if ((row.adminName ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())) acc.push(idx);
      return acc;
    }, [])
    : [];

  useEffect(() => {
    if (matchedIndices.length === 0 || !debouncedQuery.trim()) return;
    const firstIdx = matchedIndices[0];
    const el = rowRefs.current[firstIdx];
    if (el && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const rowTop = el.offsetTop;
      container.scrollTo({ top: rowTop - 80, behavior: 'smooth' });
    }
  }, [debouncedQuery]);

  const handleExportExcel = () => {
    if (rows.length === 0 || activityCount === 0) {
      notifications.show({
        title: 'Nothing to export',
        message: 'Add at least one admin and one planned activity first.',
        color: 'yellow',
        position: 'top-right',
      });
      return;
    }
    const fileName = exportTaskSheetToExcel({ rows, cellData, activityCount, params });
    notifications.show({
      title: 'Excel exported',
      message: `Downloaded ${fileName}`,
      color: 'teal',
      position: 'top-right',
    });
  };

  const activeTimeKey = activeTime ? `${activeTime.rowIdx}-${activeTime.actIdx}` : null;
  const currentTimeValue = activeTimeKey ? cellData[activeTimeKey]?.[activeTime.field] : null;

  const activeJustKey = activeJust ? `${activeJust.rowIdx}-${activeJust.actIdx}` : null;
  const activeJustEntry = activeJustKey ? cellData[activeJustKey] : null;

  return (
    <Container component={Paper} fluid p={0} m={0}>
      <BlkLotModal
        opened={blkLotOpen}
        onClose={() => { setBlkLotOpen(false); setActiveBlkLot(null); }}
        onConfirm={handleBlkLotConfirm}
        params={params}
      />
      <ActivityModal
        opened={activityOpen}
        onClose={() => { setActivityOpen(false); setActiveActivity(null); }}
        onConfirm={handleActivityConfirm}
        params={params}
      />
      <TimePickerModal
        opened={timeOpen}
        onClose={() => { setTimeOpen(false); setActiveTime(null); }}
        onConfirm={handleTimeConfirm}
        label={activeTime?.field === 'ti' ? 'Select Time In' : 'Select Time Out'}
        initialTime={currentTimeValue}
      />
      <JustificationModal
        opened={justOpen}
        onClose={() => { setJustOpen(false); setActiveJust(null); }}
        onConfirm={handleJustificationConfirm}
        initialValue={activeJustEntry?.justification ?? ''}
        timeOut={activeJustEntry?.to}
      />

      <Group justify="space-between" mb={10} wrap="wrap">
        <Box w={{ md: "40%", base: '100%' }}>
          <TextInput
            label="Search Admins"
            placeholder='Search name of an admin'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <Group gap={0}>
            <ThemeIcon variant="transparent" c="blue">
              <InfoIcon size={16} />
            </ThemeIcon>
            <Text fw={700} c="dimmed" size="xs">
              {selectMode
                ? 'Select mode: tap a cell to start a block, tap another to extend it. Taps won\'t open editors. Then use Copy / Paste.'
                : 'Long press BLK & LOT cell to remove an activity · Click a cell, then use arrow keys to move and Enter to edit · Shift + arrows or shift-click to select a block, Ctrl+C / Ctrl+V to copy and paste · On a tablet, use Select'}
            </Text>
          </Group>
        </Box>
        <Group gap="xs" wrap="wrap" justify="flex-end" w={{ base: '100%', md: 'auto' }}>
          {selectionSize && (
            <Group gap={4} wrap="nowrap">
              <Text size="xs" c="dimmed" fw={600}>
                {selectionSize.rows === 1 && selectionSize.cols === 1
                  ? `${FIELDS[activeRect.col0 % COLS_PER_ACT].label} selected`
                  : `${selectionSize.rows} × ${selectionSize.cols} cells`}
              </Text>
              <Tooltip label="Clear selection" withArrow>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={clearSelection}>
                  <XIcon size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
          {/* Touch copy/paste trio kept adjacent so they wrap together as a unit. */}
          <Tooltip
            label={selectMode ? 'Tap when you\'ve finished picking cells' : 'Pick cells by tapping — for touch screens'}
            withArrow
          >
            <Button
              size="xs"
              variant={selectMode ? 'filled' : 'light'}
              color="blue"
              leftSection={<SquareDashedMousePointerIcon size={14} />}
              onClick={toggleSelectMode}
            >
              {selectMode ? 'Selecting…' : 'Select'}
            </Button>
          </Tooltip>
          <Tooltip label="Copy the selected cell(s) — Ctrl+C" withArrow>
            <Button
              size="xs"
              variant="light"
              leftSection={<CopyIcon size={14} />}
              onClick={() => { copySelection(); focusSheet(); }}
            >
              Copy
            </Button>
          </Tooltip>
          <Tooltip
            label={clipboard ? `Paste ${FIELDS[clipboard.kind].label} into the selection — Ctrl+V` : 'Copy a cell first, then paste — Ctrl+V'}
            withArrow
          >
            <Button
              size="xs"
              variant="light"
              color="violet"
              leftSection={<ClipboardPasteIcon size={14} />}
              onClick={() => { pasteToSelection(); focusSheet(); }}
            >
              Paste
            </Button>
          </Tooltip>
          <Button
            size="xs"
            leftSection={<Sheet size={14}/>}
            onClick={handleExportExcel}
          >
            Export to Excel
          </Button>
          <Button size="xs" variant="light" color="teal" onClick={() => setActivityCount((c) => c + 1)}>
            + Add Planned Activity
          </Button>
        </Group>
      </Group>

      <div
        ref={scrollContainerRef}
        tabIndex={0}
        onKeyDown={handleSheetKeyDown}
        style={{ overflowX: 'auto', overflowY: 'auto', height: 'max(260px, calc(100vh - 490px))', position: 'relative', outline: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <Table
          withRowBorders
          withTableBorder
          withColumnBorders
          style={{
            fontSize: 11,
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <Table.Thead>
            <Table.Tr bg={BG}>
              <Table.Th rowSpan={2} style={{ ...thStyle, position: 'sticky', top: 0, left: 0, background: BG, zIndex: 5 }}>NO</Table.Th>
              <Table.Th rowSpan={2} style={{ ...thStyle, minWidth: 100, position: 'sticky', top: 0, left: 40, background: BG, zIndex: 5 }}>SKILLS</Table.Th>
              <Table.Th rowSpan={2} style={{ ...thStyle, minWidth: 200, position: 'sticky', top: 0, left: 0, background: BG, zIndex: 5 }}>NAME</Table.Th>
              {Array(activityCount).fill().map((_, i) => (
                <Table.Th key={i} colSpan={5} style={{ ...thStyle, position: 'sticky', top: 0, background: BG, zIndex: 3 }}>
                  Activity {i + 1}
                </Table.Th>
              ))}
            </Table.Tr>
            <Table.Tr bg={BG}>
              {Array(activityCount).fill().map((_, i) => (
                <>
                  <Table.Th key={`bl-${i}`} style={{ ...thStyle, minWidth: 100, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>Blk &amp; Lot</Table.Th>
                  <Table.Th key={`ti-${i}`} style={{ ...thStyle, minWidth: 80, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>TimeIn</Table.Th>
                  <Table.Th key={`to-${i}`} style={{ ...thStyle, minWidth: 80, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>TimeOut</Table.Th>
                  <Table.Th key={`ac-${i}`} style={{ ...thStyle, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>Activity</Table.Th>
                  <Table.Th key={`ju-${i}`} style={{ ...thStyle, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>Justification</Table.Th>
                </>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row, rowIdx) => {
              const isMatch = matchedIndices.includes(rowIdx);
              const bg = isMatch
                ? (dark ? '#1a3a1f' : '#c8f5c8')
                : stickyBg(rowIdx);
              return (
                <Table.Tr
                  key={row.id ?? rowIdx}
                  ref={(el) => { rowRefs.current[rowIdx] = el; }}
                  style={{ background: bg, outline: isMatch ? `2px solid #2e7d32` : undefined }}
                >
                  <Table.Td style={{ position: 'sticky', left: 0, background: bg, zIndex: 1, transition: 'background 0.2s' }}>{rowIdx + 1}</Table.Td>
                  <Table.Td style={{ position: 'sticky', left: 0, background: bg, zIndex: 2, transition: 'background 0.2s' }}>{row.adminPosition ?? '—'}</Table.Td>
                  <Table.Td style={{ position: 'sticky', left: 0, minWidth: 200, background: bg, zIndex: 3, transition: 'background 0.2s' }}>
                    <Group justify="space-between" wrap="nowrap" gap={4}>
                      <Text size="xs">{row.adminName ?? '—'}</Text>
                      <ActionIcon size="xs" variant="subtle" color="red" onClick={() => deleteAdminRow(rowIdx)}>
                        <Trash2Icon size={12} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                  {Array(activityCount).fill().map((_, actIdx) => {
                    const key = `${rowIdx}-${actIdx}`;
                    const entry = cellData[key];
                    const hoverBg = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,89,92,0.08)';
                    const hover = (cellId) => ({
                      onMouseEnter: () => setHoveredKey(cellId),
                      onMouseLeave: () => setHoveredKey(null),
                    });
                    const isHovered = (cellId) => hoveredKey === cellId;

                    const blCol = actIdx * COLS_PER_ACT + 0;
                    const tiCol = actIdx * COLS_PER_ACT + 1;
                    const toCol = actIdx * COLS_PER_ACT + 2;
                    const acCol = actIdx * COLS_PER_ACT + 3;
                    const juCol = actIdx * COLS_PER_ACT + 4;

                    const isOverlap = overlapKeys.has(key);
                    const endMinutes = toMinutes(entry?.to);
                    const exceeds16 = endMinutes != null && endMinutes > SIXTEEN;
                    const hasJustification = !!entry?.justification?.trim();
                    const needsJustification = exceeds16 && !hasJustification;

                    return (
                      <>
                        {/* Blk & Lot */}
                        <Table.Td
                          key={`bl-${key}`}
                          ref={(el) => { cellRefs.current[`${rowIdx}-${blCol}`] = el; }}
                          onClick={(e) => selectCell(e, rowIdx, blCol, () => handleBlkLotClickGuarded(rowIdx, actIdx))}
                          onPointerDown={() => handleBlkLotPointerDown(rowIdx, actIdx)}
                          onPointerUp={handleBlkLotPointerUp}
                          onPointerLeave={handleBlkLotPointerUp}
                          onPointerCancel={handleBlkLotPointerUp}
                          onContextMenu={(e) => e.preventDefault()}
                          {...hover(`bl-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 100,
                            textAlign: 'center',
                            position: 'relative',
                            WebkitTouchCallout: 'none',
                            background: isHovered(`bl-${key}`) ? hoverBg : entry?.block ? blkLotSet : blkLotEmpty,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                            ...cellChrome(rowIdx, blCol),
                          }}
                        >
                          {entry?.block ? (
                            <Text size="xs" fw={500}>{entry.block} / {entry.lot}</Text>
                          ) : (
                            <Text size="xs" c="dimmed">— set —</Text>
                          )}
                          {entry?.rn != null && Number(entry.rn) !== 0 && (
                            <Text size="xs" c="teal" fw={600}>#{entry.rn}</Text>
                          )}
                          {pressedKey === key && (
                            <span
                              className="taskSheetPressOverlay"
                              style={{ '--task-sheet-press-duration': `${RING_MS}ms` }}
                            >
                              <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="taskSheetPressTrack" cx="12" cy="12" r="9" />
                                <circle className="taskSheetPressBar" cx="12" cy="12" r="9" />
                              </svg>
                            </span>
                          )}
                        </Table.Td>

                        {/* Time In */}
                        <Table.Td
                          key={`ti-${key}`}
                          ref={(el) => { cellRefs.current[`${rowIdx}-${tiCol}`] = el; }}
                          onClick={(e) => selectCell(e, rowIdx, tiCol, () => handleTimeClick(rowIdx, actIdx, 'ti'))}
                          {...hover(`ti-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 80,
                            textAlign: 'center',
                            background: isOverlap ? overlapBg : isHovered(`ti-${key}`) ? hoverBg : entry?.ti ? timeSet : bg,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                            ...cellChrome(rowIdx, tiCol),
                          }}
                        >
                          {entry?.ti ? (
                            <Text size="xs" fw={isOverlap ? 700 : 500} c={isOverlap ? overlapText : undefined}>{entry.ti}</Text>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>

                        {/* Time Out */}
                        <Table.Td
                          key={`to-${key}`}
                          ref={(el) => { cellRefs.current[`${rowIdx}-${toCol}`] = el; }}
                          onClick={(e) => selectCell(e, rowIdx, toCol, () => handleTimeClick(rowIdx, actIdx, 'to'))}
                          {...hover(`to-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 80,
                            textAlign: 'center',
                            background: isOverlap ? overlapBg : isHovered(`to-${key}`) ? hoverBg : entry?.to ? timeSet : bg,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                            ...cellChrome(rowIdx, toCol),
                          }}
                        >
                          {entry?.to ? (
                            <Text size="xs" fw={isOverlap ? 700 : 500} c={isOverlap ? overlapText : undefined}>{entry.to}</Text>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>

                        {/* Activity */}
                        <Table.Td
                          key={`ac-${key}`}
                          ref={(el) => { cellRefs.current[`${rowIdx}-${acCol}`] = el; }}
                          onClick={(e) => selectCell(e, rowIdx, acCol, () => handleActivityClick(rowIdx, actIdx))}
                          {...hover(`ac-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 80,
                            textAlign: 'center',
                            background: isHovered(`ac-${key}`) ? hoverBg : entry?.activityCode ? blkLotSet : blkLotEmpty,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                            ...cellChrome(rowIdx, acCol),
                          }}
                        >
                          {entry?.activityCode ? (
                            <Tooltip
                              withArrow
                              multiline
                              w={240}
                              label={
                                <Stack gap={2}>
                                  <Text size="xs" fw={700}>{entry.activityCode} — {entry.activityDescription}</Text>
                                  {entry.activityTitle && <Text size="xs">{entry.activityTitle}</Text>}
                                  {entry.activityModel && <Text size="xs" c="dimmed">Model {entry.activityModel}</Text>}
                                  {entry.constructionIndex && <Text size="xs" c="dimmed">{entry.constructionIndex}</Text>}
                                </Stack>
                              }
                            >
                              <Text size="xs" fw={600}>{entry.activityCode}</Text>
                            </Tooltip>
                          ) : (
                            <Text size="xs" c="dimmed">— set —</Text>
                          )}
                        </Table.Td>
                        {/* Justification */}
                        <Table.Td
                          key={`ju-${key}`}
                          ref={(el) => { cellRefs.current[`${rowIdx}-${juCol}`] = el; }}
                          onClick={(e) => selectCell(e, rowIdx, juCol, () => handleJustificationClick(rowIdx, actIdx))}
                          {...hover(`ju-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 60,
                            textAlign: 'center',
                            userSelect: 'none',
                            background: hasJustification
                              ? justFilledBg
                              : needsJustification
                                ? justRequiredBg
                                : isHovered(`ju-${key}`) ? hoverBg : bg,
                            transition: 'background 0.15s',
                            ...cellChrome(rowIdx, juCol),
                          }}
                        >
                          {hasJustification ? (
                            // Once a justification is entered, show only red — reveal the
                            // full text on hover.
                            <Tooltip
                              withArrow
                              multiline
                              w={260}
                              label={<Text size="xs">{entry.justification}</Text>}
                              position="top"
                            >
                              <Box style={{ width: '100%', minHeight: 16 }} />
                            </Tooltip>
                          ) : needsJustification ? (
                            <Text size="xs" fw={700} c="red">Justification required</Text>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                      </>
                    );
                  })}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
    </Container>
  );
});

export default TaskSheet;
