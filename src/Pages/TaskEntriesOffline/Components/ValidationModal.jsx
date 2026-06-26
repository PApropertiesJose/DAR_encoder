import { Modal, Stack, Text, Table, Textarea, Button, Group, Badge, ScrollArea, Box, useMantineColorScheme } from '@mantine/core';
import { AlertTriangleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const thStyle = { textAlign: 'center', whiteSpace: 'nowrap' };
const tdStyle = { textAlign: 'center', whiteSpace: 'nowrap' };

const fmt = (v) => (v == null ? '—' : v);
const fmtNum = (v) => (v == null ? '—' : Number(v).toFixed(2));

// Fields every activity row must have before it can be applied to the sheet.
const REQUIRED_FIELDS = [
  { key: 'blk', label: 'Blk' },
  { key: 'lot', label: 'Lot' },
  { key: 'timeIn', label: 'Time In' },
  { key: 'timeOut', label: 'Time Out' },
  { key: 'taskCode', label: 'Activity' },
];

const isBlank = (v) => v == null || String(v).trim() === '';
const getMissing = (row) => REQUIRED_FIELDS.filter((f) => isBlank(row[f.key]));

// A row already persisted in the database carries a real `rn` (row number).
// An `rn` of 0 (or blank) means it is NOT yet synced.
const isSynced = (row) => !isBlank(row.rn) && Number(row.rn) !== 0;

// Stable per-row identity: `rn` once synced, else a composite of its values.
const rowKey = (row, idx) =>
  isSynced(row)
    ? `rn-${row.rn}`
    : `${row.adminWorker ?? ''}-${row.taskCode ?? ''}-${row.timeIn ?? ''}-${row.timeOut ?? ''}-${idx}`;

/**
 * Lists the validation result returned by /TaskSynching and collects a
 * justification for every overbudget activity (requiredJustification === true).
 * Rows missing required input (blk/lot, timeIn, timeOut, activity) are
 * highlighted and block confirmation. On confirm, returns the rows augmented
 * with the entered justification so the caller can apply them to the TaskSheet.
 */
const ValidationModal = ({ opened, onClose, onConfirm, data = [] }) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  // Highlight colors for missing input — theme-aware.
  const MISSING_ROW_BG = dark ? '#3a1a1a' : '#fff0f0';
  const MISSING_CELL_BG = dark ? '#5c1a1a' : '#ffc9c9';
  const MISSING_TEXT = dark ? '#ffa8a8' : '#c92a2a';

  // Green border marks rows already synced in the database (have an `rn`).
  const SYNCED_BORDER = dark ? '#69db7c' : '#2f9e44';

  const [justifications, setJustifications] = useState({});

  // Seed the local justification drafts from any justification already present
  // on the response rows each time the modal is reopened.
  useEffect(() => {
    if (!opened) return;
    const seed = {};
    data.forEach((row, idx) => {
      const existing = row.justification ?? row.justificationForOt;
      if (existing != null && String(existing).trim()) seed[rowKey(row, idx)] = String(existing);
    });
    setJustifications(seed);
  }, [opened, data]);

  const requiredRows = useMemo(
    () => data.filter((row) => row.requiredJustification),
    [data]
  );

  const incompleteRows = useMemo(
    () => data.filter((row) => getMissing(row).length > 0),
    [data]
  );
  const hasIncomplete = incompleteRows.length > 0;

  const syncedCount = useMemo(() => data.filter(isSynced).length, [data]);

  const allJustified = data.every(
    (row, idx) => !row.requiredJustification || justifications[rowKey(row, idx)]?.trim()
  );

  const handleConfirm = () => {
    const withJustification = data.map((row, idx) => ({
      ...row,
      justification: row.requiredJustification
        ? (justifications[rowKey(row, idx)] ?? '').trim()
        : (row.justification ?? null),
    }));
    onConfirm(withJustification);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Validate Entries</Text>}
      centered
      size="90%"
    >
      <Stack gap="md">
        {syncedCount > 0 && (
          <Group gap={6} style={{ color: SYNCED_BORDER }}>
            <Box w={12} h={12} style={{ border: `2px solid ${SYNCED_BORDER}`, borderRadius: 3 }} />
            <Text size="xs" fw={500}>
              {syncedCount} row(s) already synced in the database (green border).
            </Text>
          </Group>
        )}
        {hasIncomplete && (
          <Group gap={6} c="red">
            <AlertTriangleIcon size={16} />
            <Text size="xs" fw={500}>
              {incompleteRows.length} row(s) have missing input (Blk/Lot, Time In, Time Out or Activity). Fix them before applying.
            </Text>
          </Group>
        )}
        {requiredRows.length > 0 && (
          <Group gap={6} c="red">
            <AlertTriangleIcon size={16} />
            <Text size="xs" fw={500}>
              {requiredRows.length} overbudget activity(ies) require a justification before confirming.
            </Text>
          </Group>
        )}

        <ScrollArea.Autosize mah="60vh">
          <Table withTableBorder withColumnBorders withRowBorders striped highlightOnHover style={{ fontSize: 12 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={thStyle}>Admin</Table.Th>
                <Table.Th style={thStyle}>Activity</Table.Th>
                <Table.Th style={thStyle}>Blk</Table.Th>
                <Table.Th style={thStyle}>Lot</Table.Th>
                <Table.Th style={thStyle}>Time In</Table.Th>
                <Table.Th style={thStyle}>Time Out</Table.Th>
                <Table.Th style={thStyle}>Hours</Table.Th>
                <Table.Th style={thStyle}>Budget</Table.Th>
                <Table.Th style={thStyle}>Total Accumulated</Table.Th>
                <Table.Th style={{ ...thStyle, minWidth: 240 }}>Justification</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((row, idx) => {
                const key = rowKey(row, idx);
                const needsJust = row.requiredJustification;
                const synced = isSynced(row);
                const missingSet = new Set(getMissing(row).map((f) => f.key));
                const incomplete = missingSet.size > 0;
                const rowStyle = {
                  ...(incomplete ? { background: MISSING_ROW_BG } : {}),
                  // Green outline distinguishes rows already synced in the database.
                  ...(synced ? { outline: `2px solid ${SYNCED_BORDER}`, outlineOffset: '-2px' } : {}),
                };
                // Cell style merges the missing highlight on top of the base style.
                const cell = (k, base = tdStyle) =>
                  missingSet.has(k) ? { ...base, background: MISSING_CELL_BG } : base;
                const valueOrMissing = (k, value) =>
                  missingSet.has(k)
                    ? <Text size="xs" fw={700} style={{ color: MISSING_TEXT }}>Missing</Text>
                    : fmt(value);

                return (
                  <Table.Tr key={key} style={rowStyle}>
                    <Table.Td style={tdStyle}>
                      <Stack gap={2} align="center">
                        <Text size="xs">{fmt(row.adminWorker)}</Text>
                        {synced && <Badge size="xs" color="green" variant="light">Synced</Badge>}
                      </Stack>
                    </Table.Td>
                    <Table.Td style={cell('taskCode', { ...tdStyle, whiteSpace: 'normal', minWidth: 200 })}>
                      {missingSet.has('taskCode') ? (
                        <Text size="xs" fw={700} style={{ color: MISSING_TEXT }}>Missing</Text>
                      ) : (
                        <Stack gap={0}>
                          <Text size="xs" fw={600}>{row.taskCode}</Text>
                          <Text size="xs" c="dimmed">{fmt(row.taskDescription)}</Text>
                        </Stack>
                      )}
                    </Table.Td>
                    <Table.Td style={cell('blk')}>{valueOrMissing('blk', row.blk)}</Table.Td>
                    <Table.Td style={cell('lot')}>{valueOrMissing('lot', row.lot)}</Table.Td>
                    <Table.Td style={cell('timeIn')}>{valueOrMissing('timeIn', row.timeIn)}</Table.Td>
                    <Table.Td style={cell('timeOut')}>{valueOrMissing('timeOut', row.timeOut)}</Table.Td>
                    <Table.Td style={tdStyle}>{fmtNum(row.hours)}</Table.Td>
                    <Table.Td style={tdStyle}>{fmtNum(row.budget)}</Table.Td>
                    <Table.Td style={tdStyle}>
                      {needsJust ? (
                        <Badge color="red" variant="light">{fmtNum(row.totalAccumulatedHours)}</Badge>
                      ) : (
                        fmtNum(row.totalAccumulatedHours)
                      )}
                    </Table.Td>
                    <Table.Td style={{ ...tdStyle, whiteSpace: 'normal' }}>
                      {needsJust ? (
                        <Textarea
                          placeholder="Justification required (overbudget)"
                          value={justifications[key] ?? ''}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            setJustifications((prev) => ({ ...prev, [key]: value }));
                          }}
                          error={!justifications[key]?.trim()}
                          autosize
                          minRows={1}
                          maxRows={4}
                          size="xs"
                        />
                      ) : (
                        <Text size="xs" c="dimmed">Not required</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {data.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={10}>
                    <Box ta="center" p="md">
                      <Text size="xs" c="dimmed">No entries to validate.</Text>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!allJustified || hasIncomplete || data.length === 0}>
            Confirm &amp; Apply
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ValidationModal;
