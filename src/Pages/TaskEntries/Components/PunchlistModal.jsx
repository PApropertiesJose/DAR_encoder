import {
  Button,
  Modal,
  Group,
  Avatar,
  Stack,
  Text,
  Flex,
  Paper,
  Space,
  Badge,
  Timeline,
  Select,
  Loader
} from '@mantine/core'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTaskContext } from '../context';
import { getInitials } from '~/utils';
import { ClockIcon, Bell } from 'lucide-react';
import useFetchActivity from '~/hooks/Filters/useFetchActivity';
import useManageTaskEntryMutation from '~/hooks/TaskEntries/useManageTaskEntryMutation';
import { notifications } from '@mantine/notifications';

const PunchlistItems = memo(({ params, onChange }) => {
  const { data, isLoading } = useFetchActivity({ params: params });

  const activities = useMemo(() => {
    if (!data) return [];

    return data.data.map((item) => ({
      'label': `${item.code}-${item.description}`,
      'value': `${item.code}-${item.description}`,
      disabled: item.description === "Punchlist works",
    }))
  }, [data])

  return (
    <Select
      onChange={onChange}
      rightSection={isLoading ? <Loader size={18} /> : null}
      searchable
      label="Activity"
      placeholder='Select activity for punchlisting.'
      data={activities}
    />
  )

})

const PunchlistModal = memo(() => {
  const punchlistModalOpen = useTaskContext(state => state.punchlistModalOpen);
  const punchlistItem = useTaskContext(state => state.punchlistData);
  const handlePunchListCloseModal = useTaskContext(state => state.handlePunchListCloseModal);
  const handleUpdateTaskAdmin = useTaskContext(state => state.handleUpdateTaskAdmin);
  const taskMutation = useManageTaskEntryMutation();
  const [punchlistCode, setPunchlistCode] = useState();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = useCallback(() => {
    const code = punchlistCode.split('-')[0];
    const request = {
      ...punchlistItem,
      punchlistCode: code,
    }

    setIsLoading(true);
    taskMutation.mutate(request, {
      onSuccess: (response) => {
        const _rn = response.data[0]?.rn || null;
        handleUpdateTaskAdmin(request.adminId, request.row, {
          rn: _rn,
          blk: request.block,
          category: request.category,
          dateTimeIn: request.timeIn,
          dateTimeOut: request.projected_time_out,
          justification: request.justification,
          lot: request.lot,
          taskCode: request?.code,
          taskDescription: request.description,
          accumulatedHours: request?.accumulatedHours,
        });
        notifications.show({
          color: 'green',
          title: "Successfully saved!",
          message: "Task Entry added!",
        });
        setIsLoading(false);
        handlePunchListCloseModal();
      },
      onError: (error) => {
        setIsLoading(false);
        const errorMessage = error.response?.data.errorMessage ?? error.message;
        notifications.show({
          color: 'red',
          title: "Failed to saved to task entry",
          message: errorMessage,
        });
      }
    })

  }, [punchlistCode])

  return (
    <Modal
      closeOnClickOutside={!isLoading}
      size="md"
      opened={punchlistModalOpen}
      onClose={handlePunchListCloseModal}
      title="Punchlist"
    >
      <Group py={10} gap={5}>
        <Avatar size={"lg"}>{getInitials(punchlistItem?.name)}</Avatar>
        <Stack gap={0}>
          <Text size="xs" style={{ fontFamily: 'monospace' }}>{punchlistItem?.adminSystem}</Text>
          <Text size="md">{punchlistItem?.name}</Text>
        </Stack>
        <Group flex={1} justify="flex-end">
          <Badge variant="outline">{punchlistItem?.adminId}</Badge>
        </Group>
      </Group>

      <Flex direction={'row'} gap={10} >
        <Paper flex={1} shadow="none">
          <Stack gap={0}>
            <Text size="xs">BLOCK</Text>
            <Text size="md" style={{ fontFamily: 'monospace' }}>
              {punchlistItem?.block}
            </Text>
          </Stack>
        </Paper>
        <Paper flex={1} shadow="none">
          <Stack gap={0}>
            <Text size="xs">LOT</Text>
            <Text size="md" style={{ fontFamily: 'monospace' }}>
              {punchlistItem?.lot}
            </Text>
          </Stack>
        </Paper>
      </Flex>

      <Space h={20} />

      <Timeline>
        <Timeline.Item bullet={<ClockIcon size={32} />} title="Time In">
          <Text style={{ fontFamily: 'monospace' }}>{punchlistItem?.timeIn}</Text>
        </Timeline.Item>
        <Timeline.Item bullet={<Bell size={32} />} title="Time Out">
          <Text style={{ fontFamily: 'monospace' }}>{punchlistItem?.projected_time_out}</Text>
        </Timeline.Item>
      </Timeline>

      <PunchlistItems
        params={punchlistItem?.activityParams}
        onChange={setPunchlistCode}
      />

      <Space h={10} />
      <Group justify='flex-end'>
        <Button disabled={isLoading} variant='default' onClick={handlePunchListCloseModal}>Cancel</Button>
        <Button loading={isLoading} onClick={handleSave}>Saved</Button>
      </Group>
    </Modal>
  )

});

export default PunchlistModal;


