import { Container, Group, Anchor, Breadcrumbs, Stack, Text, Divider, Paper, Space, Button, Box } from '@mantine/core'
import { memo, useCallback, useEffect, useMemo, useState } from 'react' // useMemo kept for params
import StringRoutes from '~/Constants/StringRoutes';
import { Link, useLocation, useParams } from 'react-router'
import { ChevronRight, CalendarSyncIcon, TextSearch } from 'lucide-react';
import useAuth from '~/hooks/Auth/useAuth';
import AutoCompleteAdmins from './Components/AdminOfflineList';
import PhaseHeader from './Components/PhaseHeader';
import { useIndexedDB } from '~/hooks/useIndexedDB';
import { DB_SCHEMA, DB_VERSION } from '~/Constants/schemas';
import { getDBService } from '~/services/indexedDB';
import TaskSheet from './Components/TaskSheet';
import ValidationModal from './Components/ValidationModal';
import { buildSyncPayload } from './buildSyncPayload';
import { applyValidationJustifications } from './applyValidationJustifications';
import { detectActivityOverlaps } from './detectActivityOverlaps';
import useValidateTaskEntriesMutation from '~/hooks/TaskEntries/useValidateTaskEntriesMutation';
import { notifications } from '@mantine/notifications';


const TaskEntryForm = memo(() => {
  const { user } = useAuth();
  const { phaseCode } = useParams()
  const { state } = useLocation();
  const [forceFetch, setForceFetch] = useState(false);
  const [sheetRows, setSheetRows] = useState([]);
  const validateTaskEtnriesMutate = useValidateTaskEntriesMutation();

  const { add: addSheetRow } = useIndexedDB('sheetRows', { schema: DB_SCHEMA, version: DB_VERSION, autoInit: false });

  const items = [
    { title: "Phase", href: StringRoutes.project_selection_task_offline },
    { title: "Task Entries List", href: `${StringRoutes.project_selection_task_offline_list}/${phaseCode}` },
    { title: "Task Entries Form", href: null },
  ].map((item, index) => (
    <Anchor
      key={index}
      size="xs"
      component={Link}
      state={state}
      to={item.href || '#'}
      c={item.href ? 'var(--accent)' : 'dimmed'}
      viewTransition
      style={{ fontFamily: 'monospace', viewTransitionName: item.title }}
    >
      {item.title}
    </Anchor>
  ));

  const selectedDate = state?.date ?? '';

  const params = useMemo(() => {
    return {
      username: user?.username,
      phaseCode: phaseCode,
      date: selectedDate,
    }
  }, [phaseCode, user, selectedDate])

  const loadSheetRows = useCallback(async () => {
    try {
      const db = getDBService('AppOfflineDB', DB_VERSION, DB_SCHEMA);
      let rows;
      try {
        rows = await db.getAllFromIndex('sheetRows', 'byPhaseDate', IDBKeyRange.only([phaseCode, selectedDate]));
      } catch {
        // Index may not exist yet (old DB version) — fall back to full scan
        const all = await db.getAll('sheetRows');
        rows = all.filter((r) => r.phaseCode === phaseCode && r.date === selectedDate);
      }
      setSheetRows(rows);
    } catch (err) {
      console.error('Failed to load sheet rows:', err);
    }
  }, [phaseCode, selectedDate]);

  useEffect(() => {
    loadSheetRows();
  }, [loadSheetRows]);

  const handleDeleteRow = useCallback(async (row) => {
    try {
      const db = getDBService('AppOfflineDB', DB_VERSION, DB_SCHEMA);
      await db.delete('sheetRows', row.id);
      await loadSheetRows();
    } catch (err) {
      console.error('Failed to delete sheet row:', err);
    }
  }, [loadSheetRows]);

  const handleAdminSelect = useCallback(async (admin) => {
    try {
      await addSheetRow({
        adminId: admin.id,
        adminName: admin.name,
        adminPosition: admin.position,
        phaseCode,
        date: selectedDate,
        username: user?.username,
        savedAt: new Date().toISOString(),
        system: admin.system
      });
      await loadSheetRows();
    } catch (err) {
      console.error('Failed to save sheet row to IndexedDB:', err);
    }
  }, [addSheetRow, loadSheetRows, phaseCode, selectedDate, user?.username]);

  const [validateNonce, setValidateNonce] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Validation result modal
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationData, setValidationData] = useState([]);

  const handleValidateEntries = async () => {
    setValidateNonce((n) => n + 1);
    try {
      // Block validation while any admin has overlapping activities — force a fix first.
      const overlaps = await detectActivityOverlaps({ phaseCode, date: selectedDate, sheetRows });
      if (overlaps.length > 0) {
        notifications.show({
          title: 'Overlapping activities found',
          message: `Fix overlapping activities before validating: ${overlaps
            .map((o) => `${o.adminName} (${o.count})`)
            .join(', ')}.`,
          color: 'red',
          position: 'top-right',
          autoClose: 6000,
        });
        return;
      }

      const payload = await buildSyncPayload(params);
      const response = await validateTaskEtnriesMutate.mutateAsync(payload);
      // console.log('[Validate response]', response);
      if (response?.status === false) {
        notifications.show({
          title: 'Validation failed',
          message: response?.errorMessage ?? 'Unable to validate entries.',
          color: 'red',
          position: 'top-right',
        });
        return;
      }
      const responseData = response?.data ?? [];

      // Persist rn values returned by the server back to taskSheetEntries immediately.
      await applyValidationJustifications({
        rows: responseData,
        sheetRows,
        phaseCode,
        date: selectedDate,
      });
      setReloadNonce((n) => n + 1);

      setValidationData(responseData);
      setValidationOpen(true);
    } catch (err) {
      console.error('Failed to validate entries:', err);
      notifications.show({
        title: 'Validation error',
        message: err?.response?.data?.errorMessage ?? err?.message ?? 'Request failed.',
        color: 'red',
        position: 'top-right',
      });
    }
  }

  const handleValidationConfirm = async (rows) => {
    try {
      const applied = await applyValidationJustifications({
        rows,
        sheetRows,
        phaseCode,
        date: selectedDate,
      });
      setValidationOpen(false);
      setValidationData([]);
      setReloadNonce((n) => n + 1);
      notifications.show({
        title: 'Justifications applied',
        message: `${applied} activity(ies) updated on the sheet.`,
        color: 'teal',
        position: 'top-right',
      });
    } catch (err) {
      console.error('Failed to apply justifications:', err);
      notifications.show({
        title: 'Apply failed',
        message: err?.message ?? 'Could not apply justifications to the sheet.',
        color: 'red',
        position: 'top-right',
      });
    }
  }

  return (
    <Container fluid p={0} m={0}>
      <Group justify='space-between'>
        <Stack gap={0} pb={10} m={0}>
          <Text size="xl" fw={500}>
            Task Entries
          </Text>
          <Breadcrumbs p={0} separator={<ChevronRight size={12} />} separatorMargin={1}>
            {items}
          </Breadcrumbs>
        </Stack>
        <Button
          onClick={handleValidateEntries}
          loading={validateTaskEtnriesMutate.isPending}
          leftSection={<TextSearch size={17} />}
          size="compact-md" variant="outline">
          <Text size="xs">
            Validate Entries
          </Text>
        </Button>
      </Group>
      <Divider />

      <Space h={10} />

      <Paper
        radius="lg"
      >
        <Stack gap={10}>
          <PhaseHeader phase={state?.phase} selectedDate={state?.date} />
          <Divider />
          <Group gap={10}>
            <Box w={{ md: '30%', base: '100%' }}>
              <AutoCompleteAdmins
                onSyncComplete={() => {
                  setForceFetch(false)
                }}
                onSelect={handleAdminSelect}
                addedAdminIds={sheetRows.map((r) => r.adminId)}
                params={params}
                forceFetch={forceFetch}
              />
            </Box>
            <Button
              onClick={() => setForceFetch(true)}
              leftSection={<CalendarSyncIcon size={16} />} variant="outline">
              SYNC ADMINS
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Space h={15} />
      <TaskSheet params={params} rows={sheetRows} onDeleteRow={handleDeleteRow} validateNonce={validateNonce} reloadNonce={reloadNonce} />

      <ValidationModal
        opened={validationOpen}
        onClose={() => setValidationOpen(false)}
        onConfirm={handleValidationConfirm}
        data={validationData}
      />
    </Container>
  );
})

export default TaskEntryForm;

