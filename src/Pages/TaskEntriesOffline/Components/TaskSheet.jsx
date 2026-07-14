import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { getDB } from '~/db/index';
import { ActionIcon, Button, Container, Group, Paper, Table, Text, useMantineColorScheme, Box, TextInput, ThemeIcon, Tooltip, Stack } from '@mantine/core';
import BlkLotModal from './BlkLotModal';
import ActivityModal from './ActivityModal';
import TimePickerModal from './TimePickerModal';
import JustificationModal from './JustificationModal';
import { InfoIcon, Sheet, Trash2Icon } from 'lucide-react'
import { notifications } from '@mantine/notifications';
import { exportTaskSheetToExcel } from './exportTaskSheetToExcel';

const thStyle = { textAlign: 'center' };
const BG = '#00595c';

// 16:00 in minutes — activities ending past this require a justification.
const SIXTEEN = 16 * 60;

const isLandDevt = (constructionIndex) =>
  (constructionIndex ?? '').toLowerCase().includes('land devt');

const toMinutes = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

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

  const longPressTimerRef = useRef(null);
  const longPressDidFire = useRef(false);

  const handleBlkLotPointerDown = (rowIdx, actIdx) => {
    longPressDidFire.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressDidFire.current = true;
      deleteAdminTask(rowIdx, actIdx);
    }, 600);
  };

  const handleBlkLotPointerUp = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleBlkLotClickGuarded = (rowIdx, actIdx) => {
    if (longPressDidFire.current) return;
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
  const COLS_PER_ACT = 5;
  const [selectedCell, setSelectedCell] = useState(null); // { row, col }
  const cellRefs = useRef({});

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

    if (e.key === 'Enter') {
      if (selectedCell) {
        e.preventDefault();
        activateCell(selectedCell);
      }
      return;
    }

    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();

    setSelectedCell((prev) => {
      if (!prev) return { row: 0, col: 0 };
      let { row, col } = prev;
      if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
      else if (e.key === 'ArrowDown') row = Math.min(rows.length - 1, row + 1);
      else if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
      else if (e.key === 'ArrowRight') col = Math.min(totalCols - 1, col + 1);
      return { row, col };
    });
  };

  // Keep selection within bounds when rows/activities change
  useEffect(() => {
    setSelectedCell((prev) => {
      if (!prev) return prev;
      const totalCols = activityCount * COLS_PER_ACT;
      if (totalCols === 0 || rows.length === 0) return null;
      return {
        row: Math.min(prev.row, rows.length - 1),
        col: Math.min(prev.col, totalCols - 1),
      };
    });
  }, [activityCount, rows.length]);

  // Scroll the selected cell into view within the scroll container
  useEffect(() => {
    if (!selectedCell) return;
    const el = cellRefs.current[`${selectedCell.row}-${selectedCell.col}`];
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedCell]);

  const isSelected = (row, col) => selectedCell?.row === row && selectedCell?.col === col;
  const selectedStyle = (row, col) =>
    isSelected(row, col) ? { outline: '2px solid #00aaff', outlineOffset: '-2px' } : null;

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

      <Group justify="space-between" mb={10}>
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
            <Text fw={700} c="dimmed" size="xs">Long press BLK & LOT cell to remove an activity · Click a cell, then use arrow keys to move and Enter to edit</Text>
          </Group>
        </Box>
        <Group>
          <Button
            leftSection={<Sheet size={16}/>}
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
                          onClick={() => { setSelectedCell({ row: rowIdx, col: blCol }); handleBlkLotClickGuarded(rowIdx, actIdx); }}
                          onPointerDown={() => handleBlkLotPointerDown(rowIdx, actIdx)}
                          onPointerUp={handleBlkLotPointerUp}
                          onPointerLeave={handleBlkLotPointerUp}
                          {...hover(`bl-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 100,
                            textAlign: 'center',
                            background: isHovered(`bl-${key}`) ? hoverBg : entry?.block ? blkLotSet : blkLotEmpty,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                            ...selectedStyle(rowIdx, blCol),
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
                        </Table.Td>

                        {/* Time In */}
                        <Table.Td
                          key={`ti-${key}`}
                          ref={(el) => { cellRefs.current[`${rowIdx}-${tiCol}`] = el; }}
                          onClick={() => { setSelectedCell({ row: rowIdx, col: tiCol }); handleTimeClick(rowIdx, actIdx, 'ti'); }}
                          {...hover(`ti-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 80,
                            textAlign: 'center',
                            background: isOverlap ? overlapBg : isHovered(`ti-${key}`) ? hoverBg : entry?.ti ? timeSet : bg,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                            ...selectedStyle(rowIdx, tiCol),
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
                          onClick={() => { setSelectedCell({ row: rowIdx, col: toCol }); handleTimeClick(rowIdx, actIdx, 'to'); }}
                          {...hover(`to-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 80,
                            textAlign: 'center',
                            background: isOverlap ? overlapBg : isHovered(`to-${key}`) ? hoverBg : entry?.to ? timeSet : bg,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                            ...selectedStyle(rowIdx, toCol),
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
                          onClick={() => { setSelectedCell({ row: rowIdx, col: acCol }); handleActivityClick(rowIdx, actIdx); }}
                          {...hover(`ac-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 80,
                            textAlign: 'center',
                            background: isHovered(`ac-${key}`) ? hoverBg : entry?.activityCode ? blkLotSet : blkLotEmpty,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                            ...selectedStyle(rowIdx, acCol),
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
                          onClick={() => { setSelectedCell({ row: rowIdx, col: juCol }); handleJustificationClick(rowIdx, actIdx); }}
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
                            ...selectedStyle(rowIdx, juCol),
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
