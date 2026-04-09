import { Container, Title, Paper, Stack, Text, Group, Button } from '@mantine/core';
import { LayoutDashboard } from 'lucide-react';

/**
 * Standard Component Template for DAR Encoder
 * Follows the PascalCase directory structure with index.jsx as entry point.
 */
const ComponentTemplate = () => {
  return (
    <Container fluid p="md">
      <Paper 
        p="xl" 
        radius="md" 
        withBorder 
        style={{ backgroundColor: 'var(--nav-bg)' }}
      >
        <Stack gap="md">
          <Group justify="apart">
            <Group>
              <LayoutDashboard size={24} color="var(--primary)" />
              <Title order={2}>New Feature</Title>
            </Group>
            <Button variant="light" color="primary">Action</Button>
          </Group>
          
          <Text size="sm" c="dimmed">
            Start building your feature here using Mantine components.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
};

export default ComponentTemplate;
