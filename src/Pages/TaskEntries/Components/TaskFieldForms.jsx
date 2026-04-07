import { Flex, Paper, Box, Group, Stack, ThemeIcon, Text, Badge, Divider, ActionIcon, Collapse } from "@mantine/core";
import { useLocation, useParams } from 'react-router';
import ErrorElement from "~/components/ErrorElement";
import { ChevronDown, MapPinned } from 'lucide-react'
import AutoCompleteAdmins from "~/components/Filter/AutoCompleteAdmins";
import useAuth from "~/hooks/Auth/useAuth";
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure} from '@mantine/hooks';

const TaskFieldForms = () => {
  const { state } = useLocation();
  const { user } = useAuth();
  const { phaseCode } = useParams();
  const [opened, { toggle }] = useDisclosure(true);

  if (!state || !Object.hasOwn(state, 'phase')) {
    return (
      <Box mt={10}>
        <ErrorElement>No phase selected in the initial page.</ErrorElement>
      </Box>

    );
  }

  const phase = state.phase;

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
        <Group flex={1} justify="flex-end">
          <ActionIcon onClick={toggle} variant="transparent" size={23}>
            <ChevronDown />
          </ActionIcon>
        </Group>
      </Group>
      <Divider my={10} />

      <Collapse in={opened}>
        <Flex direction={{ md: 'row', base: 'column' }} align="flex-start" justify="space-between" >
          <Box w={{ md: 450, base: '100%' }}>
            <AutoCompleteAdmins params={{
              username: user?.username,
              phaseCode: phaseCode
            }} />

          </Box>

          <DatePickerInput
            placeholder="Select a date"
            label="DATE"
            w={{
              md: 300,
              base: '100%'
            }} />
        </Flex>
      </Collapse>
    </Paper>
  );
}

export default TaskFieldForms;

