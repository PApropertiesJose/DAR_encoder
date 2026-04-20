import { Tooltip, Paper, ThemeIcon, SegmentedControl, Group, Stack, Text, TextInput, Divider, Table, ActionIcon, Loader } from '@mantine/core'
import { Clock, Pickaxe, Plus, WatchIcon } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useVirtualizer } from '@tanstack/react-virtual';
import TaskRowSub from './TaskRowSub';
import { useParams } from 'react-router';
import useAuth from '~/hooks/Auth/useAuth';
import { useTaskContext } from '../context';
import useFetchTaskEntries from '~/hooks/TaskEntries/useFetchTaskEntries';
import TableSkeleton from '~/components/Loading/TableSkeleton';
import { useDebouncedCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import useManageTaskUpdateMutation from '~/hooks/TaskEntries/useManamgeTaskUpdateMutation';

const TaskRowHeader = memo(({
  workerId,
  params,
  onAdd,
  handleEndShiftAdmin,
  handleUpdateTaskAdmin,
  handleDeleteTask,
  handleManageUpdateTask,
  control,
  measureRef,
  index
}) => {
  const endMutation = useManageTaskUpdateMutation();
  const [isLoading, setIsLoading] = useState(false);
  const adminInfo = useTaskContext(useShallow(state => {
    const admin = state.adminActivities.find(a => a.adminWorker === workerId) || {};
    return { name: admin.name, group: admin.group, system: admin.system, shiftStatus: admin.shiftStatus, taskCount: admin.tasks?.length || 0, tasks: admin?.tasks || [] };
  }));
  const [segmentedControl, setSegmentedControl] = useState(adminInfo.shiftStatus === "ENDED" ? "END" : "ADD");

  const handleClick = () => {
    onAdd({ adminWorker: workerId });
  }

  const taskSubRows = Array.from({ length: adminInfo.taskCount }).map((_, i) => (
    <TaskRowSub
      control={segmentedControl}
      row={i}
      key={`${workerId}-${i}`}
      workerId={workerId}
      workerName={adminInfo.name}
      workerSystem={adminInfo.system}
      params={params}
      handleUpdateTaskAdmin={handleUpdateTaskAdmin}
      handleDeleteTask={handleDeleteTask}
      handleManageUpdateTask={handleManageUpdateTask}
      rowData={adminInfo.tasks[i]}
    />
  ));

  const handleEndAdminShift = () => {
    const rns = adminInfo.tasks.map((item) => item.rn.toString());

    const hadEmpty = rns.some(item => item === "");
    if (hadEmpty) {
      notifications.show({
        color: 'orange',
        title: "Failed to end the shift of the admin.",
        message: "Some tasks are not yet saved."
      })
      return;
    }

    const _params = { rns: rns, username: params.username }

    setIsLoading(true);
    endMutation.mutate(_params, {
      onSuccess: (response) => {
        notifications.show({
          color: "green",
          title: "End Admin Shift",
          message: "Successfully end the admin shift",
        });

        setIsLoading(false);
        handleEndShiftAdmin(workerId);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.errorMessage ?? error.message;
        notifications.show({
          color: 'red',
          title: "Something went wrong!",
          message: errorMessage
        });
        setIsLoading(false);
      }

    });

  }

  const controlDisabledDue = useMemo(() => {
    return adminInfo?.shiftStatus === "ENDED"
  }, [adminInfo]);

  return (
    <Table.Tbody ref={measureRef} data-index={index}>
      <Table.Tr >
        <Table.Td style={{ fontSize: '13px' }}>{adminInfo.name}</Table.Td>
        <Table.Td colSpan={3}>
          <SegmentedControl variant="outlined" color="primary" onChange={setSegmentedControl} value={segmentedControl} fullWidth data={[
            {
              value: "ADD",
              label: "ADD",
              disabled: controlDisabledDue,
            },
            {
              value: "DELETE",
              label: "DELETE",
              disabled: controlDisabledDue,
            },
            {
              value: "END",
              label: "END",
              disabled: controlDisabledDue
            }
          ]} />
        </Table.Td>
        {/* <Table.Td></Table.Td> */}
        {/* <Table.Td></Table.Td> */}
        <Table.Td>{adminInfo.group}</Table.Td>
        <Table.Td style={{ fontFamily: 'monospace' }}>{adminInfo.tasks[0]?.dateTimeIn}</Table.Td>
        <Table.Td style={{ fontFamily: 'monospace' }}>{adminInfo.tasks[adminInfo.tasks.length - 1]?.dateTimeOut}</Table.Td>
        <Table.Td>
          {segmentedControl !== "END" ? (
            <ThemeIcon>
              <Tooltip label="Add Activity">
                <ActionIcon disabled={(segmentedControl == "DELETE")} onClick={handleClick} variant="light" size={32} radius="md" c="white">
                  <Plus size={16} />
                </ActionIcon>
              </Tooltip>
            </ThemeIcon>
          ) : (
            <ThemeIcon c="red">
              <Tooltip label={controlDisabledDue ? "SHIFT ALREADY ENDED" : "END SHIFT"}>
                <ActionIcon disabled={controlDisabledDue} loading={isLoading} onClick={handleEndAdminShift} variant="filled" size="32" radius="md">
                  <Clock size={16} />
                </ActionIcon>
              </Tooltip>
            </ThemeIcon>
          )}

        </Table.Td>
      </Table.Tr>
      {taskSubRows}
    </Table.Tbody>
  )
})

const TaskList = ({
  params
}) => {
  const { data, isLoading, isError, error, isSuccess } = useFetchTaskEntries({
    params: params
  });
  const adminIds = useTaskContext(useShallow(state => state.adminActivities.map(a => a.adminWorker)));
  const adminNames = useTaskContext(useShallow(state => state.adminActivities.map(a => a.name)));
  const handleAddTaskAdmin = useTaskContext(state => state.handleAddTaskAdmin);
  const handleUpdateTaskAdmin = useTaskContext(state => state.handleUpdateTaskAdmin);
  const handlePopulateAdmin = useTaskContext(state => state.handlePopulateAdmin);
  const handleDeleteTask = useTaskContext(state => state.handleDeleteTask);
  const handleManageUpdateTask = useTaskContext(state => state.handleManageUpdateTask);
  const handleEndShiftAdmin = useTaskContext(state => state.handleEndShiftAdmin);
  const segmentedControl = useTaskContext(state => state.segmentedControl);
  const [loadingAdmin, setLoadingAdmin] = useState(false);


  const handleSearch = useDebouncedCallback((val) => {
    if (!val.trim()) {
      setLoadingAdmin(false);
      return;
    }

    setLoadingAdmin(true);

    // Small delay so the loader is visible before scroll snaps
    setTimeout(() => {
      const searchLower = val.toLowerCase();
      const matchIndex = adminNames.findIndex(a =>
        a?.toLowerCase().includes(searchLower)
      );

      if (matchIndex !== -1) {
        rowVirtualizer.scrollToIndex(matchIndex, { align: 'start', behavior: 'instant' });
      }

      setLoadingAdmin(false);
    }, 300);
  }, 500);

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

  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: adminIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimate height per group (header + some tasks)
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0;

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
            rightSection={loadingAdmin ? <Loader size={14} /> : null}
            w={{ md: '35%', base: '100%' }}
            label="Search Admin"
            placeholder='Enter name of the admin'
            onChange={(e) => handleSearch(e.currentTarget.value)} />
        </Group>
      </Group>
      <Divider mt={10} mb={5} />

      <div ref={parentRef} style={{ height: 'calc(100vh - 440px)', overflow: 'auto' }}>
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

            {paddingTop > 0 && (
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td style={{ height: `${paddingTop}px`, padding: 0 }} colSpan={8} />
                </Table.Tr>
              </Table.Tbody>
            )}

            {virtualItems.map((virtualRow) => (
              <TaskRowHeader
                key={adminIds[virtualRow.index]}
                workerId={adminIds[virtualRow.index]}
                params={memoParams}
                onAdd={handleAddTaskAdmin}
                handleUpdateTaskAdmin={handleUpdateTaskAdmin}
                handleDeleteTask={handleDeleteTask}
                handleManageUpdateTask={handleManageUpdateTask}
                handleEndShiftAdmin={handleEndShiftAdmin}
                control={segmentedControl}
                measureRef={rowVirtualizer.measureElement}
                index={virtualRow.index}
              />
            ))}

            {paddingBottom > 0 && (
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td style={{ height: `${paddingBottom}px`, padding: 0 }} colSpan={8} />
                </Table.Tr>
              </Table.Tbody>
            )}

          </Table>
        </Table.ScrollContainer>
      </div>

    </Paper>
  )
}

export default TaskList;
