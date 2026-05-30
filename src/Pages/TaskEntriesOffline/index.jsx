import { Group, SimpleGrid, Container, Button, Anchor, Stack, Breadcrumbs, Text, Divider, Box, TextInput, Flex } from '@mantine/core';
import { memo, useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { CalendarSyncIcon, ChevronRight } from 'lucide-react';
import useFetchProject from '~/hooks/Projects/useFetchProjects';
import useAuth from '~/hooks/Auth/useAuth';
import ProjectCard, { ProjectCardSkeleton } from '../ProjectSelection/Components/ProjectCard';
import { useDebouncedValue } from '@mantine/hooks';
import { getDBService } from '~/services/indexedDB';
import { useIndexedDB } from '~/hooks/useIndexedDB';
import ErrorElement from '~/components/ErrorElement';
import StringRoutes from '~/Constants/StringRoutes';
import { DB_SCHEMA } from '~/Constants/schemas';

const ProjectListOffline = memo(({
  username,
  searchQuery,
  forceFetch = false,
  onSyncComplete
}) => {
  // Load cached projects from IndexedDB reactively
  const { data: cachedProjects, loading: dbLoading } = useIndexedDB('projects', {
    dbName: 'AppOfflineDB',
    version: 1,
    schema: DB_SCHEMA
  });

  const hasCache = cachedProjects && cachedProjects.length > 0;

  // Bypass API fetching if cache is already present and user did not click force sync
  const { data, isLoading, isError, error, isSuccess } = useFetchProject(username, {
    enabled: !dbLoading && (!hasCache || forceFetch)
  });

  const navigate = useNavigate();
  const results = data?.data ?? [];

  const saveOffline = async () => {
    try {
      const db = getDBService('AppOfflineDB', 1, DB_SCHEMA);
      // Overwrite cache with fresh results
      await db.clear('projects');
      for (const item of results) {
        await db.put('projects', item);
      }
      console.log('Successfully saved projects to indexedDB offline cache');
    } catch (err) {
      console.error('Failed to save projects to indexedDB:', err);
    } finally {
      if (forceFetch) {
        onSyncComplete?.();
      }
    }
  };

  // Cache fetched results offline when the request succeeds
  useEffect(() => {
    if (isSuccess && results.length > 0) {
      saveOffline();
    } else if (isError || (isSuccess && results.length === 0)) {
      if (forceFetch) {
        onSyncComplete?.();
      }
    }
  }, [isSuccess, isError, results, forceFetch, onSyncComplete]);

  // Use online results if available/successful; otherwise fallback to offline cached projects
  const displayResults = (isSuccess && results.length > 0) ? results : cachedProjects;

  const filteredResults = useMemo(() => {
    if (!displayResults || displayResults.length === 0) return [];
    if (!searchQuery.trim()) return displayResults;

    const lowerQuery = searchQuery.toLowerCase();

    return displayResults.filter((item) => {
      const matchCode = item.code?.toLowerCase().includes(lowerQuery);
      const matchName = item.description?.toLowerCase().includes(lowerQuery);
      const matchLocation = item.location?.toLowerCase().includes(lowerQuery);

      return matchCode || matchName || matchLocation;
    });
  }, [displayResults, searchQuery]);

  // Show loading skeleton only if we are currently loading AND there is no cached data to display
  if ((dbLoading || isLoading) && cachedProjects.length === 0) {
    return (
      <SimpleGrid cols={{ base: 1, md: 4, sm: 3 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    );
  }

  // Show error only if we don't have cached offline data to display
  if (isError && cachedProjects.length === 0) {
    const errorMessage = error.response?.data?.message ?? error.message;
    return <ErrorElement>{errorMessage}</ErrorElement>;
  }

  if (filteredResults.length === 0) {
    return (
      <Text c="dimmed" mt="md">
        No projects found matching "{searchQuery}"
      </Text>
    );
  }

  const handleNavigate = async (item) => {
    navigate(`${StringRoutes.project_selection_task_offline_list}/${item.code}`, {
      viewTransition: true,
      state: {
        phase: item,
      }
    });
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 4, sm: 3 }}>
      {filteredResults.map((item) => (
        <ProjectCard
          onClick={(x) => handleNavigate(x)}
          key={item.code}
          data={item}
        />
      ))}
    </SimpleGrid>
  );
});



const TaskEntriesOffline = memo(() => {
  const [searchQuery, setSearchQuery] = useState(''); // <-- 1. Create state for the search input
  const { user } = useAuth();
  const [forceFetch, setForceFetch] = useState(false);

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

  const [debounce] = useDebouncedValue(searchQuery, 500);

  return (
    <Container fluid p={0} m={0}>
      <Flex direction={{ md: 'row', base: 'column' }} justify="space-between">
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
          loading={forceFetch}
          onClick={() => setForceFetch(true)}
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

      <ProjectListOffline
        username={user?.username}
        searchQuery={debounce}
        forceFetch={forceFetch}
        onSyncComplete={() => setForceFetch(false)}
      />

    </Container>
  );
})

export default TaskEntriesOffline;

