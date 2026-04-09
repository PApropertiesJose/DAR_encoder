import { Tooltip, Paper, ThemeIcon, Group, Stack, Text, TextInput, Divider, Table, ActionIcon } from '@mantine/core'
import { Pickaxe, Plus } from 'lucide-react';
import { memo, useMemo } from 'react'
import TaskRowSub from './TaskRowSub';
import { useParams } from 'react-router';
import useAuth from '~/hooks/Auth/useAuth';
import { useTaskContext } from '../context';

const TaskRowHeader = memo(({
  admin,
  params,
  onAdd
}) => {
  const tasks = admin.tasks ?? [];

  const handleClick = () => {
    onAdd(admin);
  }

  return (
    <>
      <Table.Tr >
        <Table.Td style={{ fontSize: '13px' }}>{admin.name}</Table.Td>
        <Table.Td></Table.Td>
        <Table.Td></Table.Td>
        <Table.Td></Table.Td>
        <Table.Td>{admin.group}</Table.Td>
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
      {tasks?.map((task, index) => {
        return (
          <TaskRowSub key={`${admin.adminWorker}-${index}`} params={params} />
        )
      })}

    </>
  )
})

const TaskList = () => {
  const { adminActivities, handleAddTaskAdmin } = useTaskContext();
  const { phaseCode } = useParams();
  const { user } = useAuth();
  const username = user?.username

  const memoParams = useMemo(() => ({
    username: username,
    phaseCode: phaseCode,
  }), [username, phaseCode]);

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
            {adminActivities.map((admin) => (
              <TaskRowHeader key={admin.adminWorker} admin={admin} params={memoParams} onAdd={handleAddTaskAdmin} />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>


    </Paper>
  )
}

export default TaskList;
