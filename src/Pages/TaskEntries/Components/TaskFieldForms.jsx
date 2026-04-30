import { Flex, Button, Paper, Box, Group, Stack, ThemeIcon, Text, Badge, Divider, ActionIcon, Collapse, SegmentedControl, Center } from "@mantine/core";
import { useLocation, useParams } from 'react-router';
import ErrorElement from "~/components/ErrorElement";
import { ChevronDown, MapPinned, Pen, PlusIcon, NotebookPen, Trash } from 'lucide-react'
import AutoCompleteAdmins from "~/components/Filter/AutoCompleteAdmins";
import useAuth from "~/hooks/Auth/useAuth";
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { useTaskContext } from "../context";
import { Files } from 'lucide-react'
import { useCallback } from "react";
import BatchAssignmentTasks from "./BatchAssignmentTasks";

const TaskFieldForms = () => {
  const segmentedControl = useTaskContext(state => state.segmentedControl);
  const handleSelectDate = useTaskContext(state => state.handleSelectDate);
  const { state } = useLocation();
  const { user } = useAuth();
  const { phaseCode } = useParams();
  const [opened, { open, close }] = useDisclosure(false);

  if (!state || !Object.hasOwn(state, 'phase')) {
    return (
      <Box mt={10}>
        <ErrorElement>No phase selected in the initial page.</ErrorElement>
      </Box>

    );
  }

  const phase = state.phase;

  const handleBatchAssigning = useCallback(() => {
    open();
  }, [])

  return (
    <Paper
      my={20}
      shadow="none"
      radius="lg"
    >
      <Group>
        <ThemeIcon size={42} variant="light" c="primary" radius="md">
          <MapPinned />
        </ThemeIcon>
        <Stack gap={0}>
          <Group>
            <Text size="sm" >{phase.description}</Text>
            <Badge variant="light" size="md" radius="xs">{phase.code}</Badge>
          </Group>
          <Text size="xs" style={{ fontFamily: 'monospace' }}>{phase.location}</Text>
        </Stack>
        
      </Group>
      <Divider my={10} />

      <Flex direction={{ md: 'row', base: 'column' }} align="flex-start" justify="space-between" >
        <Box w={{ md: 450, base: '100%' }}>
          {segmentedControl === "ADD" && (
            <AutoCompleteAdmins params={{
              username: user?.username,
              phaseCode: phaseCode
            }} />
          )}
        </Box>

        <Group align="flex-end">
          <Button 
            onClick={handleBatchAssigning}
            leftSection={<Files size={16} />}
            variant="filled" tt="uppercase">
            Batch Assigning
          </Button>
          <DatePickerInput
            placeholder="Select a date"
            label="DATE"
            onChange={handleSelectDate}
            w={{
              md: 300,
              base: '100%'
            }} />
        </Group>
      </Flex>

      <BatchAssignmentTasks 
        opened={opened}
        close={close}
      />
    </Paper>
  );
}

export default TaskFieldForms;

