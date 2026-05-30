import { Group, ThemeIcon, Stack, Text, Badge, Divider } from '@mantine/core'
import { MapPinned } from 'lucide-react';

const PhaseHeader = ({
  phase
}) => {
  return (
    <>
      <Group>
        <ThemeIcon size={42} variant="light" c="primary" radius="md">
          <MapPinned />
        </ThemeIcon>
        <Stack gap={0}>
          <Group>
            <Text size="sm" >{phase?.description}</Text>
            <Badge variant="light" size="md" radius="xs">{phase?.code}</Badge>
          </Group>
          <Text size="xs" style={{ fontFamily: 'monospace' }}>{phase?.location}</Text>
        </Stack>

      </Group>
    </>
  )
}

export default PhaseHeader;

