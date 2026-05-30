import { Group, ThemeIcon, Stack, Text, Badge } from '@mantine/core'
import { MapPinned, CalendarDays } from 'lucide-react';

const PhaseHeader = ({ phase, selectedDate }) => {
  const formattedDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    : null;

  return (
    <Group justify="space-between" wrap="nowrap">
      <Group>
        <ThemeIcon size={42} variant="light" c="primary" radius="md">
          <MapPinned />
        </ThemeIcon>
        <Stack gap={0}>
          <Group>
            <Text size="sm">{phase?.description}</Text>
            <Badge variant="light" size="md" radius="xs">{phase?.code}</Badge>
          </Group>
          <Text size="xs" style={{ fontFamily: 'monospace' }}>{phase?.location}</Text>
        </Stack>
      </Group>

      {formattedDate && (
        <Group gap={6}>
          <CalendarDays size={16} />
          <Text size="sm" fw={500}>{formattedDate}</Text>
        </Group>
      )}
    </Group>
  )
}

export default PhaseHeader;

