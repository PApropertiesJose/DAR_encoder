import { Modal, Stack, Text, Button, Group, ActionIcon, Tooltip, Badge } from '@mantine/core';
import { RefreshCw, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import useFetchActivitiesPerPhase, { NULL_INDEX_KEY } from '~/hooks/TaskEntries/useFetchActivitiesPerPhase';
import SearchablePicker from './SearchablePicker';


const ActivityModal = ({ opened, onClose, onConfirm, params }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);

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

  const activityOptions = useMemo(
    () => activities.map((a) => ({ value: a.code, label: a.description, activity: a })),
    [activities]
  );

  const handleClose = () => {
    setSelectedIndex(null);
    setSelectedCode(null);
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
        <SearchablePicker
          label="Construction Index"
          placeholder={loading ? 'Loading...' : 'Select construction index'}
          data={indexOptions}
          value={selectedIndex}
          onChange={(val) => {
            setSelectedIndex(val);
            setSelectedCode(null);
          }}
          loading={loading}
          clearable
        />

        <SearchablePicker
          label="Activity"
          placeholder={!selectedIndex ? 'Select a construction index first' : 'Select activity'}
          searchPlaceholder="Search by code, description, title…"
          drawerTitle="Select Activity"
          data={activityOptions}
          value={selectedCode}
          onChange={setSelectedCode}
          disabled={!selectedIndex}
          clearable
          nothingFoundMessage="No activities under this index."
          filterFn={(q, o) =>
            [o.activity.code, o.activity.description, o.activity.title, o.activity.model]
              .some((field) => String(field ?? '').toLowerCase().includes(q))
          }
          renderValue={(o) => (
            <Group gap={6} wrap="nowrap">
              <Badge size="sm" variant="light" color="teal">{o.activity.code}</Badge>
              <Text size="sm" truncate>{o.activity.description}</Text>
            </Group>
          )}
          renderOption={(o, { active }) => {
            const a = o.activity;
            return (
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <div>
                  <Group gap={6}>
                    <Badge size="sm" variant="light" color="teal">{a.code}</Badge>
                    <Text size="sm" fw={500}>{a.description}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">{a.title}{a.model ? ` • Model ${a.model}` : ''}</Text>
                </div>
                {active && <Check size={16} color="var(--mantine-color-teal-6)" />}
              </Group>
            );
          }}
        />

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
