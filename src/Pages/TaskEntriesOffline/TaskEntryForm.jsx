import { Container, Group, Anchor, Breadcrumbs, Stack, Text, Divider, Paper, Space, Button, Box } from '@mantine/core'
import { memo, useCallback, useEffect, useMemo, useState } from 'react' // useMemo kept for params
import StringRoutes from '~/Constants/StringRoutes';
import { Link, useLocation, useParams } from 'react-router'
import { ChevronRight, CalendarSyncIcon } from 'lucide-react';
import useAuth from '~/hooks/Auth/useAuth';
import AutoCompleteAdmins from './Components/AdminOfflineList';
import PhaseHeader from './Components/PhaseHeader';
import { useIndexedDB } from '~/hooks/useIndexedDB';
import { DB_SCHEMA, DB_VERSION } from '~/Constants/schemas';
import { getDBService } from '~/services/indexedDB';
import TaskSheet from './Components/TaskSheet';

const TaskEntryForm = memo(() => {
  const { user } = useAuth();
  const { phaseCode } = useParams()
  const { state } = useLocation();
  const [forceFetch, setForceFetch] = useState(false);
  const [sheetRows, setSheetRows] = useState([]);

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

  const params = useMemo(() => {
    return {
      username: user?.username,
      phaseCode: phaseCode
    }
  }, [phaseCode, user])

  const selectedDate = state?.date ?? '';

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
      });
      await loadSheetRows();
    } catch (err) {
      console.error('Failed to save sheet row to IndexedDB:', err);
    }
  }, [addSheetRow, loadSheetRows, phaseCode, selectedDate, user?.username]);

  return (
    <Container fluid p={0} m={0}>
      <Stack gap={0} pb={10} m={0}>
        <Text size="xl" fw={500}>
          Task Entries
        </Text>
        <Breadcrumbs p={0} separator={<ChevronRight size={12} />} separatorMargin={1}>
          {items}
        </Breadcrumbs>
      </Stack>
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
                  console.log('force fetching');
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

      <Space h={15}/>
      <TaskSheet params={params} rows={sheetRows} />
    </Container>
  );
})

export default TaskEntryForm;

