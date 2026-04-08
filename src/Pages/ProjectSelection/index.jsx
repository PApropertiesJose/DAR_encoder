import { useState, useMemo, memo } from 'react';
import {
  Container,
  Stack,
  Text,
  Breadcrumbs,
  Anchor,
  Divider,
  TextInput,
  Box,
  SimpleGrid,
} from '@mantine/core';
import { ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router' // or 'react-router-dom' depending on your setup
import ProjectCard, { ProjectCardSkeleton } from './Components/ProjectCard';
import useFetchProject from '~/hooks/Projects/useFetchProjects';
import ErrorElement from '~/components/ErrorElement';
import { useDebouncedValue } from '@mantine/hooks';
import useAuth from '~/hooks/Auth/useAuth';
import StringRoutes from '~/Constants/StringRoutes';

const ProjectList = memo(({ params, searchQuery }) => {
  const { data, isLoading, isError, error, isSuccess } = useFetchProject(params);
  const navigate = useNavigate();

  const results = data?.data ?? [];

  // ✅ Move this ABOVE any return
  const filteredResults = useMemo(() => {
    if (!isSuccess) return [];
    if (!searchQuery.trim()) return results;

    const lowerQuery = searchQuery.toLowerCase();

    return results.filter((item) => {
      const matchCode = item.code?.toLowerCase().includes(lowerQuery);
      const matchName = item.description?.toLowerCase().includes(lowerQuery);
      const matchLocation = item.location?.toLowerCase().includes(lowerQuery);

      return matchCode || matchName || matchLocation;
    });
  }, [results, searchQuery, isSuccess]);

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, md: 4, sm: 3 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    );
  }

  if (isError) {
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

  const handleNavigate = (item) => {
    navigate(`${StringRoutes.project_selection_task_entries}/${item.code}`, {
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
          key={item.code} data={item} />
      ))}
    </SimpleGrid>
  );

})


const ProjectSelection = () => {
  const [searchQuery, setSearchQuery] = useState(''); // <-- 1. Create state for the search input
  const { user } = useAuth();
  const username = user?.username;

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
      <Stack gap={0} pb={10} m={0}>
        <Text size="xl" fw={500}>Task Entries</Text>
        <Breadcrumbs p={0} separator={<ChevronRight size={12} />} separatorMargin="xs">
          {items}
        </Breadcrumbs>
      </Stack>
      <Divider />

      <Box my={10} w={{ md: '40%', sm: '40%', base: '100%' }}>
        <TextInput
          label="Search Phase"
          placeholder="Enter phase to search"
          value={searchQuery} // <-- 2. Bind state to value
          onChange={(e) => setSearchQuery(e.currentTarget.value)} // <-- 3. Update state on type
        />
      </Box>

      {/* 4. Pass the query down to the list */}
      <ProjectList params={"jmdelacruz"} searchQuery={debounce} />
    </Container>
  );
};

export default ProjectSelection
