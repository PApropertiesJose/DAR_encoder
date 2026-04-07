import { Tooltip, Paper, ThemeIcon, Group, Stack, Text, TextInput, Divider, Table, ActionIcon } from '@mantine/core'
import { Pickaxe, Plus } from 'lucide-react';
import { memo } from 'react'
import TaskRowSub from './TaskRowSub';

const TaskRowHeader = memo(() => {
  return (
    <>
      <Table.Tr >
        <Table.Td style={{ fontSize: '13px'}}>Jose Paulo M. Dela Cruz</Table.Td>
        <Table.Td></Table.Td>
        <Table.Td></Table.Td>
        <Table.Td></Table.Td>
        <Table.Td>Mason Group</Table.Td>
        <Table.Td>2026-04-07 7:00</Table.Td>
        <Table.Td>2026-04-07 16:00</Table.Td>
        <Table.Td>
          <ThemeIcon>
            <Tooltip label="Add Activity">
              <ActionIcon variant="light" size={32} radius="md" c="white">
                <Plus size={16} />
              </ActionIcon>
            </Tooltip>
          </ThemeIcon>

        </Table.Td>
      </Table.Tr>
      <TaskRowSub />
      <TaskRowSub />
      <TaskRowSub />
      <TaskRowSub />
      <TaskRowSub />
    </>
  )
})

const TaskList = () => {
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
            <TaskRowHeader />
            <TaskRowHeader />
            <TaskRowHeader />
            <TaskRowHeader />
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>


    </Paper>
  )
}

export default TaskList;
