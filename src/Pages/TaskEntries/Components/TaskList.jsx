import { Tooltip, Paper, ThemeIcon, Group, Stack, Text, TextInput, Divider, Table, ActionIcon } from '@mantine/core'
import { Pickaxe, Plus } from 'lucide-react';
import { memo, useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import TaskRowSub from './TaskRowSub';
import { useParams } from 'react-router';
import useAuth from '~/hooks/Auth/useAuth';
import { useTaskContext } from '../context';
import useFetchTaskEntries from '~/hooks/TaskEntries/useFetchTaskEntries';
import TableSkeleton from '~/components/Loading/TableSkeleton';

const TaskRowHeader = memo(({
  workerId,
  params,
  onAdd,
  handleUpdateTaskAdmin
}) => {
  const adminInfo = useTaskContext(useShallow(state => {
    const admin = state.adminActivities.find(a => a.adminWorker === workerId) || {};
    return { name: admin.name, group: admin.group, system: admin.system, taskCount: admin.tasks?.length || 0, tasks: admin?.tasks || [] };
  }));

  const handleClick = () => {
    onAdd({ adminWorker: workerId });
  }

  const taskSubRows = Array.from({ length: adminInfo.taskCount }).map((_, index) => (
    <TaskRowSub
      row={index}
      key={`${workerId}-${index}`}
      workerId={workerId}
      workerName={adminInfo.name}
      workerSystem={adminInfo.system}
      params={params}
      handleUpdateTaskAdmin={handleUpdateTaskAdmin}
      rowData={adminInfo.tasks[index]}
    />
  ));

  return (
    <>
      <Table.Tr >
        <Table.Td style={{ fontSize: '13px' }}>{adminInfo.name}</Table.Td>
        <Table.Td></Table.Td>
        <Table.Td></Table.Td>
        <Table.Td></Table.Td>
        <Table.Td>{adminInfo.group}</Table.Td>
        <Table.Td></Table.Td>
        <Table.Td></Table.Td>
        <Table.Td>
          <ThemeIcon>
            <Tooltip label="Add Activity">
              <ActionIcon onClick={handleClick} variant="light" size={32} radius="md" c="white">
                <Plus size={16} />
              </ActionIcon>
            </Tooltip>
          </ThemeIcon>
        </Table.Td>
      </Table.Tr>
      {taskSubRows}
    </>
  )
})

const TaskList = () => {
  const { data, isLoading, isError, error, isSuccess } = useFetchTaskEntries({
    params: {
      username: 'jmdelacruz',
      system: "NOAH_PAAPDC",
      phaseCode: "SJRF-2",
      schedDate: "2026-04-10",
    }
  });
  const adminIds = useTaskContext(useShallow(state => state.adminActivities.map(a => a.adminWorker)));
  const handleAddTaskAdmin = useTaskContext(state => state.handleAddTaskAdmin);
  const handleUpdateTaskAdmin = useTaskContext(state => state.handleUpdateTaskAdmin);
  const handlePopulateAdmin = useTaskContext(state => state.handlePopulateAdmin);

  useEffect(() => {
    if (isSuccess) {
      handlePopulateAdmin(data.data);
    }
  }, [data, isSuccess, isLoading])

  const { phaseCode } = useParams();
  const { user } = useAuth();
  const username = user?.username

  const memoParams = useMemo(() => ({
    username: username,
    phaseCode: phaseCode,
  }), [username, phaseCode]);

  if (isLoading) {
    return <TableSkeleton cols={4} />
  }


  return (
    <Paper
      shadow="none"
      radius={"lg"}
    >
      <Group>
        <ThemeIcon size={42} variant='light' color="blue.5" radius="sm">
          <Pickaxe />
        </ThemeIcon>
        <Stack gap={0}>
          <Text>Task Activities</Text>
          <Text size="xs" c="dimmed">Admin with activities</Text>
        </Stack>
        <Group flex={1} justify='flex-end'>
          <TextInput
            w={{ md: '35%', base: '100%' }}
            label="Search Admin"
            placeholder='Enter name of the admin'
          />
        </Group>
      </Group>
      <Divider mt={10} mb={5} />

      <Table.ScrollContainer minWidth={800}>
        <Table
          withRowBorders
          withTableBorder
        >
          <Table.Thead >
            <Table.Tr >
              <Table.Th w={'12%'} >NAME</Table.Th>
              <Table.Th w={"8%"}></Table.Th>
              <Table.Th w={"15%"}></Table.Th>
              <Table.Th w="30%" ></Table.Th>
              <Table.Th>GROUP</Table.Th>
              <Table.Th>TIME IN</Table.Th>
              <Table.Th>TIME OUT</Table.Th>
              <Table.Th w={5}>ACTION</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {adminIds.map((id) => (
              <TaskRowHeader
                key={id}
                workerId={id}
                params={memoParams}
                onAdd={handleAddTaskAdmin}
                handleUpdateTaskAdmin={handleUpdateTaskAdmin}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>


    </Paper>
  )
}

export default TaskList;
