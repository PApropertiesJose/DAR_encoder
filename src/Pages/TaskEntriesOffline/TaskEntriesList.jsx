import { Container, Divider, Stack, Text, Breadcrumbs, Button, Anchor, Space, Paper } from '@mantine/core'
import { MonthView } from '@mantine/schedule'
import { memo, useCallback, useState } from 'react';
import { events } from './data.js'
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import StringRoutes from '~/Constants/StringRoutes.js';
import { ChevronRight } from 'lucide-react';
import PhaseHeader from './Components/PhaseHeader.jsx';
import { useIndexedDB } from '~/hooks/useIndexedDB';
import { DB_SCHEMA, DB_VERSION } from '~/Constants/schemas';

const TaskEntriesList = memo(() => {
  const { state } = useLocation();
  const { phaseCode } = useParams();
  const navigate = useNavigate();

  const { data: currentPhaseList } = useIndexedDB('currentPhaseData', {
    dbName: 'AppOfflineDB',
    version: DB_VERSION,
    schema: DB_SCHEMA
  });

  const { add: addTaskEntry } = useIndexedDB('taskEntries', {
    dbName: 'AppOfflineDB',
    version: DB_VERSION,
    schema: DB_SCHEMA
  });

  const phase = state?.phase || currentPhaseList?.[0];
  const [currentDate, setCurrentDate] = useState(new Date());

  const items = [
    { title: "Phase", href: StringRoutes.project_selection_task_offline },
    { title: "Task Entries List", href: null }
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
    </Anchor >
  ));


  const handleNavigate = useCallback(async (date) => {
    await addTaskEntry({
      phaseCode,
      date,
      createdAt: new Date().toISOString(),
    });
    const routeString = StringRoutes.project_selection_task_offline_list_form.replace(':phaseCode?', phaseCode);
    navigate(routeString, {
      state: {
        phase,
        date,
      }
    });
  }, [phase, phaseCode, navigate, addTaskEntry])


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
        <PhaseHeader phase={phase} />
        <Divider my={10} />
        <MonthView
          onDayClick={handleNavigate}
          date={currentDate}
          onDateChange={(value) => setCurrentDate(new Date(value))}
          events={events}
          withWeekNumbers
          viewSelectProps={{ views: [] }}
        />
      </Paper>
    </Container>
  );
})

export default TaskEntriesList;
