import { Container, Group, Anchor, Breadcrumbs, Stack, Text, Divider, Paper, Space, Button, Box } from '@mantine/core'
import { memo, useEffect, useMemo, useState } from 'react'
import StringRoutes from '~/Constants/StringRoutes';
import { Link, useLocation, useParams } from 'react-router'
import { ChevronRight, CalendarSyncIcon } from 'lucide-react';
import useAuth from '~/hooks/Auth/useAuth';
import AutoCompleteAdmins from './Components/AdminOfflineList';
import PhaseHeader from './Components/PhaseHeader';
import { useIndexedDB } from '~/hooks/useIndexedDB';
import { DB_SCHEMA } from '~/Constants/schemas';
import { current } from 'node_modules/immer/dist/immer';
import TaskSheet from './Components/TaskSheet';

const TaskEntryForm = memo(() => {
  const { user } = useAuth();
  const { phaseCode } = useParams()
  const { state } = useLocation();
  const [forceFetch, setForceFetch] = useState(false);

  const { data: currentPhase } = useIndexedDB('currentPhaseData');

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
          <PhaseHeader phase={state?.phase} />
          <Divider />
          <Group gap={10}>
            <Box w={{ md: '30%', base: '100%' }}>
              <AutoCompleteAdmins
                onSyncComplete={() => {
                  console.log('force fetching');
                  setForceFetch(false)
                }}
                params={params} forceFetch={forceFetch} />
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
      <TaskSheet />
    </Container>
  );
})

export default TaskEntryForm;

