import { Modal, Stack, Text, Select, Loader, Button, Group, ActionIcon, Tooltip, ScrollArea, Radio, Badge, Box, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { RefreshCw, Search } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import useFetchActivitiesPerPhase, { NULL_INDEX_KEY } from '~/hooks/TaskEntries/useFetchActivitiesPerPhase';


const ActivityModal = ({ opened, onClose, onConfirm, params }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [search, setSearch] = useState('');
  const [debounce] = useDebouncedValue(search, 500);

  const { data: groups, loading, resync, syncing } = useFetchActivitiesPerPhase(params);

  const indexOptions = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.map((g) => ({
      value: g.constructionIndex ?? NULL_INDEX_KEY,
      label: g.constructionIndex ?? 'General',
    }));
  }, [groups]);

  const activities = useMemo(() => {
    if (!selectedIndex || !Array.isArray(groups)) return [];
    const group = groups.find(
      (g) => (g.constructionIndex ?? NULL_INDEX_KEY) === selectedIndex
    );
    return group?.activities ?? [];
  }, [groups, selectedIndex]);


  const filteredActivities = useMemo(() => {
    const q = debounce.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) =>
      [a.code, a.description, a.title, a.model]
        .some((field) => String(field ?? '').toLowerCase().includes(q))
    );
  }, [activities, debounce]);

  const handleClose = () => {
    setSelectedIndex(null);
    setSelectedCode(null);
    setSearch('');
    onClose();
  };

  const handleConfirm = () => {
    const activity = activities.find((a) => a.code === selectedCode);
    if (!activity) return;
    onConfirm({
      activityCode: activity.code,
      activityDescription: activity.description,
      activityTitle: activity.title,
      activityModel: activity.model,
      constructionIndex: selectedIndex === NULL_INDEX_KEY ? null : selectedIndex,
    });
    setSelectedIndex(null);
    setSelectedCode(null);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <Text fw={600}>Select Activity</Text>
          <Tooltip label="Resync offline data" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              loading={syncing}
              onClick={resync}
            >
              <RefreshCw size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
      centered
      size="md"
    >
      <Stack gap="md">
        <Select
          label="Construction Index"
          placeholder={loading ? 'Loading...' : 'Select construction index'}
          data={indexOptions}
          value={selectedIndex}
          onChange={(val) => {
            setSelectedIndex(val);
            setSelectedCode(null);
            setSearch('');
          }}
          rightSection={loading ? <Loader size={16} /> : undefined}
          searchable
          clearable
        />

        {selectedIndex && (
          <Radio.Group
            label="Activity"
            value={selectedCode}
            onChange={setSelectedCode}
          >
            <TextInput
              mt="xs"
              placeholder="Search activities by code, description, title…"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<Search size={14} />}
            />
            <ScrollArea h={280} mt="xs">
              <Stack gap="xs">
                {activities.length === 0 && (
                  <Text size="sm" c="dimmed">No activities under this index.</Text>
                )}
                {activities.length > 0 && filteredActivities.length === 0 && (
                  <Text size="sm" c="dimmed">No activities match “{search}”.</Text>
                )}
                {filteredActivities.map((a) => (
                  <Box
                    key={a.code}
                    p="xs"
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: selectedCode === a.code ? 'var(--mantine-color-teal-light)' : undefined,
                    }}
                    onClick={() => setSelectedCode(a.code)}
                  >
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <div>
                        <Group gap={6}>
                          <Badge size="sm" variant="light" color="teal">{a.code}</Badge>
                          <Text size="sm" fw={500}>{a.description}</Text>
                        </Group>
                        <Text size="xs" c="dimmed">{a.title}{a.model ? ` • Model ${a.model}` : ''}</Text>
                      </div>
                      <Radio value={a.code} />
                    </Group>
                  </Box>
                ))}
              </Stack>
            </ScrollArea>
          </Radio.Group>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={handleClose}>Cancel</Button>
          <Button disabled={!selectedCode} onClick={handleConfirm}>
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ActivityModal;
