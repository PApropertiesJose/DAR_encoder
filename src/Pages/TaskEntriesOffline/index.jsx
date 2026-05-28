import { Group, Container, Button, Anchor, Stack, Breadcrumbs, Text, Divider, Box, TextInput, Flex } from '@mantine/core';
import { memo, useState } from 'react'
import { Link } from 'react-router'
import { CalendarSyncIcon, ChevronRight } from 'lucide-react';

const TaskEntriesOffline = memo(() => {
  const [searchQuery, setSearchQuery] = useState(''); // <-- 1. Create state for the search input
  const items = [{ title: "Phase", href: null }].map((item, index) => (
    <Anchor
      key={index}
      size="xs"
      component={Link}
      to={item.href || '#'}
      c={item.href ? 'var(--accent)' : 'dimmed'}
      viewTransition
      style={{ fontFamily: 'monospace', viewTransitionName: item.title }}
    >
      {item.title}
    </Anchor>
  ));

  return (
    <Container fluid p={0} m={0}>
      <Flex direction={{ md: 'row', base: 'column'}} justify="space-between">
        <Stack gap={0} pb={10} m={0}>
          <Text size="xl" fw={500}>
            Task Entries
          </Text>
          <Breadcrumbs p={0} separator={<ChevronRight size={12} />} separatorMargin="xs">
            {items}
          </Breadcrumbs>
        </Stack>
        <Button 
          variant='outline'
          leftSection={<CalendarSyncIcon size={16} />}
        >
          SYNCH PHASE
        </Button>
      </Flex>
      <Divider />

      <Box my={10} w={{ md: '40%', sm: '40%', base: '100%' }}>
        <TextInput
          label="Search Phase"
          placeholder="Enter phase to search"
          value={searchQuery} // <-- 2. Bind state to value
          onChange={(e) => setSearchQuery(e.currentTarget.value)} // <-- 3. Update state on type
        />
      </Box>

    </Container>
  );
})

export default TaskEntriesOffline;

