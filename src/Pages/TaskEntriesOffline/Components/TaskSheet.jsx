import { memo, useEffect, useState } from 'react';
import { getDB } from '~/db/index';
import { Button, Container, Group, Paper, Table, Text, useMantineColorScheme } from '@mantine/core';
import BlkLotModal from './BlkLotModal';
import TimePickerModal from './TimePickerModal';

const thStyle = { textAlign: 'center' };
const BG = '#00595c';

const TaskSheet = memo(({ params, rows = [] }) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  const [activityCount, setActivityCount] = useState(0);

  // Blk & Lot modal
  const [blkLotOpen, setBlkLotOpen]   = useState(false);
  const [activeBlkLot, setActiveBlkLot] = useState(null);
  const [cellData, setCellData]         = useState({});

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

  const persistCellData = (next) => {
    getDB().then((db) => db.put('taskSheetEntries', next, sheetKey));
  };

  // Time modal
  const [timeOpen, setTimeOpen]     = useState(false);
  const [activeTime, setActiveTime] = useState(null); // { rowIdx, actIdx, field: 'ti'|'to' }

  const handleBlkLotClick = (rowIdx, actIdx) => {
    setActiveBlkLot({ rowIdx, actIdx });
    setBlkLotOpen(true);
  };

  const handleBlkLotConfirm = ({ block, lot }) => {
    const key = `${activeBlkLot.rowIdx}-${activeBlkLot.actIdx}`;
    setCellData((prev) => {
      const next = { ...prev, [key]: { ...prev[key], block, lot } };
      persistCellData(next);
      return next;
    });
    setBlkLotOpen(false);
    setActiveBlkLot(null);
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

  // Stripe colors — theme-aware
  const stripeEven = dark ? '#1a1b1e' : '#f8f9fa';
  const stripeOdd  = dark ? '#25262b' : '#ffffff';

  // Blk & Lot cell colors — theme-aware
  const blkLotSet   = dark ? '#1b3a2a' : '#e8f5e9';
  const blkLotEmpty = dark ? '#3a3010' : '#fff9c4';

  // Time cell colors — theme-aware
  const timeSet   = dark ? '#1a2a3a' : '#e3f2fd';
  const timeEmpty = dark ? '#25262b' : '#ffffff';

  const stickyBg = (rowIdx) => (rowIdx % 2 === 0 ? stripeEven : stripeOdd);

  const [hoveredKey, setHoveredKey] = useState(null);

  const activeTimeKey = activeTime ? `${activeTime.rowIdx}-${activeTime.actIdx}` : null;
  const currentTimeValue = activeTimeKey ? cellData[activeTimeKey]?.[activeTime.field] : null;

  return (
    <Container component={Paper} fluid p={0} m={0}>
      <BlkLotModal
        opened={blkLotOpen}
        onClose={() => { setBlkLotOpen(false); setActiveBlkLot(null); }}
        onConfirm={handleBlkLotConfirm}
        params={params}
      />
      <TimePickerModal
        opened={timeOpen}
        onClose={() => { setTimeOpen(false); setActiveTime(null); }}
        onConfirm={handleTimeConfirm}
        label={activeTime?.field === 'ti' ? 'Select Time In' : 'Select Time Out'}
        initialTime={currentTimeValue}
      />

      <Group justify="flex-end" p="xs">
        <Button size="xs" variant="light" color="teal" onClick={() => setActivityCount((c) => c + 1)}>
          + Add Planned Activity
        </Button>
      </Group>

      <div style={{ overflowX: 'auto', overflowY: 'auto', height: `calc(100vh - 400px)`, position: 'relative' }}>
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
                  Planned Activity {i + 1}
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
              const bg = stickyBg(rowIdx);
              return (
                <Table.Tr key={row.id ?? rowIdx} style={{ background: bg }}>
                  <Table.Td style={{ position: 'sticky', left: 0, background: bg, zIndex: 1 }}>{rowIdx + 1}</Table.Td>
                  <Table.Td style={{ position: 'sticky', left: 0, background: bg, zIndex: 2 }}>{row.adminPosition ?? '—'}</Table.Td>
                  <Table.Td style={{ position: 'sticky', left: 0, minWidth: 200, background: bg, zIndex: 3 }}>{row.adminName ?? '—'}</Table.Td>
                  {Array(activityCount).fill().map((_, actIdx) => {
                    const key = `${rowIdx}-${actIdx}`;
                    const entry = cellData[key];
                    const hoverBg = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,89,92,0.08)';
                    const hover = (cellId) => ({
                      onMouseEnter: () => setHoveredKey(cellId),
                      onMouseLeave: () => setHoveredKey(null),
                    });
                    const isHovered = (cellId) => hoveredKey === cellId;

                    return (
                      <>
                        {/* Blk & Lot */}
                        <Table.Td
                          key={`bl-${key}`}
                          onClick={() => handleBlkLotClick(rowIdx, actIdx)}
                          {...hover(`bl-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 100,
                            textAlign: 'center',
                            background: isHovered(`bl-${key}`) ? hoverBg : entry?.block ? blkLotSet : blkLotEmpty,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                          }}
                        >
                          {entry?.block ? (
                            <Text size="xs" fw={500}>{entry.block} / {entry.lot}</Text>
                          ) : (
                            <Text size="xs" c="dimmed">— set —</Text>
                          )}
                        </Table.Td>

                        {/* Time In */}
                        <Table.Td
                          key={`ti-${key}`}
                          onClick={() => handleTimeClick(rowIdx, actIdx, 'ti')}
                          {...hover(`ti-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 80,
                            textAlign: 'center',
                            background: isHovered(`ti-${key}`) ? hoverBg : entry?.ti ? timeSet : bg,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                          }}
                        >
                          {entry?.ti ? (
                            <Text size="xs" fw={500}>{entry.ti}</Text>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>

                        {/* Time Out */}
                        <Table.Td
                          key={`to-${key}`}
                          onClick={() => handleTimeClick(rowIdx, actIdx, 'to')}
                          {...hover(`to-${key}`)}
                          style={{
                            cursor: 'pointer',
                            minWidth: 80,
                            textAlign: 'center',
                            background: isHovered(`to-${key}`) ? hoverBg : entry?.to ? timeSet : bg,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                          }}
                        >
                          {entry?.to ? (
                            <Text size="xs" fw={500}>{entry.to}</Text>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>

                        <Table.Td key={`ac-${key}`} {...hover(`ac-${key}`)} style={{ background: isHovered(`ac-${key}`) ? hoverBg : bg, transition: 'background 0.15s' }}></Table.Td>
                        <Table.Td key={`ju-${key}`} {...hover(`ju-${key}`)} style={{ background: isHovered(`ju-${key}`) ? hoverBg : bg, transition: 'background 0.15s' }}></Table.Td>
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
