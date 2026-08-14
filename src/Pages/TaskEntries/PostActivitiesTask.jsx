import {
  Container,
  Stack,
  Group,
  Text,
  Breadcrumbs,
  Anchor,
  Divider,
  Paper,
  ThemeIcon,
  Badge,
  Table,
  TextInput,
  ActionIcon,
  Tooltip,
  Button,
  Alert,
  Loader
} from '@mantine/core';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ChevronRight, ChevronLeft, NotebookPen, Check, RotateCcw, TriangleAlert } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDebouncedCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import moment from 'moment';
import StringRoutes from '~/Constants/StringRoutes';
import ErrorElement from '~/components/ErrorElement';
import TableSkeleton from '~/components/Loading/TableSkeleton';
import useFetchPostTaskActivities from '~/hooks/TaskEntries/useFetchPostTaskActivities';
import useUpdatePostTaskActivityMutation from '~/hooks/TaskEntries/useUpdatePostTaskActivityMutation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '—';
  const date = moment(value);
  return date.isValid() ? date.format('MM/DD/YYYY') : value;
}

const formatTime = (value) => {
  if (!value) return '—';
  const time = moment(value);
  return time.isValid() ? time.format('hh:mm A') : value;
}

const CELL_INPUT_STYLES = {
  input: {
    fontFamily: 'monospace',
    textAlign: 'center',
    textTransform: 'uppercase',
    height: 30,
    minHeight: 30,
  }
};

// ─── Row ─────────────────────────────────────────────────────────────────────

const PostTaskRow = memo(({
  rowData,
  phaseCode,
  index,
  onUpdated
}) => {
  const mutation = useUpdatePostTaskActivityMutation();
  const [blk, setBlk] = useState(rowData.blk ?? '');
  const [lot, setLot] = useState(rowData.lot ?? '');

  const savedBlk = rowData.blk ?? '';
  const savedLot = rowData.lot ?? '';

  // resync when the server sends a different value for this row (refetch)
  useEffect(() => {
    setBlk(savedBlk);
    setLot(savedLot);
  }, [savedBlk, savedLot]);

  const isDirty = blk.trim() !== savedBlk || lot.trim() !== savedLot;
  const isEmpty = !blk.trim() || !lot.trim();

  const handleConfirm = () => {
    if (!isDirty || mutation.isPending) return;

    if (isEmpty) {
      notifications.show({
        color: 'orange',
        title: 'Missing inputs',
        message: 'BLK and LOT are both required before confirming.'
      });
      return;
    }

    mutation.mutate({
      rn: rowData.rn,
      blk: blk.trim(),
      lot: lot.trim(),
      phaseCode: phaseCode
    }, {
      onSuccess: () => {
        notifications.show({
          color: 'green',
          title: 'Post task updated',
          message: `RN ${rowData.rn} — BLK ${blk.trim()} / LOT ${lot.trim()}`
        });
        onUpdated(rowData.rn, blk.trim(), lot.trim());
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.errorMessage ?? error.message;
        notifications.show({
          color: 'red',
          title: 'Something went wrong!',
          message: errorMessage
        });
      }
    });
  }

  const handleReset = () => {
    setBlk(savedBlk);
    setLot(savedLot);
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === 'Escape') {
      handleReset();
    }
  }

  return (
    <Table.Tr bg={isDirty ? 'var(--mantine-color-yellow-light)' : undefined}>
      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{index + 1}</Table.Td>
      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{rowData.rn}</Table.Td>
      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{rowData.adminWorker}</Table.Td>
      <Table.Td style={{ fontSize: 13 }}>{rowData.name}</Table.Td>
      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatDate(rowData.dateTimeIn)}</Table.Td>
      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatTime(rowData.timeIn)}</Table.Td>
      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatTime(rowData.timeOut)}</Table.Td>
      <Table.Td>
        <Badge variant="light" size="sm" radius="xs">{rowData.category}</Badge>
      </Table.Td>
      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{rowData.taskCode}</Table.Td>
      <Table.Td style={{ fontSize: 13 }}>{rowData.taskDescription}</Table.Td>
      <Table.Td p={2}>
        <TextInput
          variant="unstyled"
          size="xs"
          value={blk}
          placeholder="blk"
          styles={CELL_INPUT_STYLES}
          onChange={(e) => setBlk(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
      </Table.Td>
      <Table.Td p={2}>
        <TextInput
          variant="unstyled"
          size="xs"
          value={lot}
          placeholder="lot"
          styles={CELL_INPUT_STYLES}
          onChange={(e) => setLot(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="center" wrap="nowrap">
          <Tooltip label={isDirty ? 'Confirm update' : 'No changes'}>
            <ActionIcon
              variant={isDirty ? 'filled' : 'light'}
              color="green"
              size={28}
              radius="md"
              disabled={!isDirty}
              loading={mutation.isPending}
              onClick={handleConfirm}
            >
              <Check size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Discard changes">
            <ActionIcon
              variant="subtle"
              color="gray"
              size={28}
              radius="md"
              disabled={!isDirty || mutation.isPending}
              onClick={handleReset}
            >
              <RotateCcw size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
});

// ─── Table ───────────────────────────────────────────────────────────────────

const PostTaskTable = memo(({ phaseCode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState([]);

  const params = useMemo(() => ({ phaseCode: phaseCode }), [phaseCode]);
  const { data, isLoading, isFetching, isError, error, isSuccess } = useFetchPostTaskActivities({ params });

  useEffect(() => {
    if (isSuccess) {
      setRows(data?.data ?? []);
    }
  }, [isSuccess, data]);

  const handleSearch = useDebouncedCallback((value) => {
    setSearchQuery(value);
  }, 400);

  // keep the confirmed values as the new baseline without refetching the whole list
  const handleUpdated = useCallback((rn, blk, lot) => {
    setRows((current) => current.map((item) => (
      item.rn === rn ? { ...item, blk: blk, lot: lot } : item
    )));
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;

    const lowerQuery = searchQuery.toLowerCase();

    return rows.filter((item) => {
      const matchAdmin = item.adminWorker?.toLowerCase().includes(lowerQuery);
      const matchName = item.name?.toLowerCase().includes(lowerQuery);
      const matchTaskCode = item.taskCode?.toLowerCase().includes(lowerQuery);
      const matchDescription = item.taskDescription?.toLowerCase().includes(lowerQuery);
      const matchCategory = item.category?.toLowerCase().includes(lowerQuery);
      const matchBlk = item.blk?.toLowerCase().includes(lowerQuery);
      const matchLot = item.lot?.toLowerCase().includes(lowerQuery);
      const matchRn = item.rn?.toString().includes(lowerQuery);

      return matchAdmin || matchName || matchTaskCode || matchDescription || matchCategory || matchBlk || matchLot || matchRn;
    });
  }, [rows, searchQuery]);

  if (isLoading) {
    return <TableSkeleton cols={6} />
  }

  if (isError) {
    const errorMessage = error.response?.data?.errorMessage ?? error.message;
    return <ErrorElement>{errorMessage}</ErrorElement>
  }

  if (data?.status === false) {
    return <ErrorElement>{data?.errorMessage ?? 'Unable to load the post task activities.'}</ErrorElement>
  }

  return (
    <>
      <Group justify="space-between" align="flex-end" mb={10}>
        <Group gap={8}>
          <Badge variant="light" size="lg" radius="sm">{filteredRows.length} of {rows.length} rows</Badge>
          {isFetching && <Loader size={16} />}
        </Group>
        <TextInput
          w={{ md: 350, base: '100%' }}
          label="Search"
          placeholder="Name, admin, RN, task code, blk, lot..."
          onChange={(e) => handleSearch(e.currentTarget.value)}
        />
      </Group>

      <Table.ScrollContainer minWidth={1280} maxHeight="calc(100vh - 380px)">
        <Table
          withColumnBorders
          withRowBorders
          withTableBorder
          highlightOnHover
          stickyHeader
          stickyHeaderOffset={0}
          verticalSpacing={4}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th bg="primary.7" w={45}>#</Table.Th>
              <Table.Th bg="primary.7" w={90}>RN</Table.Th>
              <Table.Th bg="primary.7" w={90}>ADMIN</Table.Th>
              <Table.Th bg="primary.7" w={180}>NAME</Table.Th>
              <Table.Th bg="primary.7" w={110}>DATE</Table.Th>
              <Table.Th bg="primary.7" w={100}>TIME IN</Table.Th>
              <Table.Th bg="primary.7" w={100}>TIME OUT</Table.Th>
              <Table.Th bg="primary.7" w={130}>CATEGORY</Table.Th>
              <Table.Th bg="primary.7" w={90}>TASK CODE</Table.Th>
              <Table.Th bg="primary.7">DESCRIPTION</Table.Th>
              <Table.Th bg="primary.7" w={110} style={{ textAlign: 'center' }}>BLK</Table.Th>
              <Table.Th bg="primary.7" w={110} style={{ textAlign: 'center' }}>LOT</Table.Th>
              <Table.Th bg="primary.7" w={90} style={{ textAlign: 'center' }}>CONFIRM</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredRows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={13}>
                  <Text c="dimmed" size="sm" ta="center" py={20}>
                    No post task activities found.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : filteredRows.map((row, index) => (
              <PostTaskRow
                key={row.rn}
                index={index}
                rowData={row}
                phaseCode={phaseCode}
                onUpdated={handleUpdated}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
});

// ─── Page ────────────────────────────────────────────────────────────────────

const PostActivitiesTask = () => {
  const { phaseCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const phase = state?.phase;

  const items = [
    { title: 'Phase', to: StringRoutes.project_selection, state: null },
    { title: 'Task Entries', to: `${StringRoutes.project_selection_task_entries}/${phaseCode}`, state: state },
    { title: 'Post Tasks', to: null, state: null }
  ].map((item, index) => (
    <Anchor
      key={index}
      size="xs"
      component={Link}
      to={item.to || '#'}
      state={item.state}
      c={item.to ? 'var(--accent)' : 'dimmed'}
      viewTransition
      style={{ fontFamily: 'monospace', viewTransitionName: item.title }}
    >
      {item.title}
    </Anchor>
  ));

  if (!phaseCode) {
    return (
      <Container fluid p={0}>
        <ErrorElement>No phase selected in the initial page.</ErrorElement>
      </Container>
    );
  }

  return (
    <Container fluid p={0}>
      <Stack gap={0} pb={10} m={0}>
        <Group gap={5}>
          <ThemeIcon variant="transparent" c="primary">
            <NotebookPen />
          </ThemeIcon>
          <Text size="xl" fw={500}>Manage Post Tasks</Text>
        </Group>
        <Breadcrumbs p={0} separator={<ChevronRight size={12} />} separatorMargin="xs">
          {items}
        </Breadcrumbs>
      </Stack>
      <Divider />

      <Paper my={20} shadow="none" radius="lg">
        <Group>
          <Button
            variant="subtle"
            leftSection={<ChevronLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <Stack gap={0}>
            <Group gap={8}>
              <Text size="sm">{phase?.description ?? 'Post Task Activities'}</Text>
              <Badge variant="light" size="md" radius="xs">{phaseCode}</Badge>
            </Group>
            {phase?.location && (
              <Text size="xs" style={{ fontFamily: 'monospace' }}>{phase.location}</Text>
            )}
          </Stack>
        </Group>

        <Divider my={10} />

        <Alert c="orange" color="orange" variant="light" mb={10} icon={<TriangleAlert />}>
          <Text size="sm">
            Type the BLK and LOT directly on the cell, then press the green check (or Enter) to save that row.
            Press Escape to discard the row changes.
          </Text>
        </Alert>

        <PostTaskTable phaseCode={phaseCode} />
      </Paper>
    </Container>
  );
}

export default PostActivitiesTask;
