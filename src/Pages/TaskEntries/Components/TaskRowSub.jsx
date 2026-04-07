import { Select, NativeSelect, Tooltip, Table, ActionIcon, Loader } from '@mantine/core'
import { ChevronDown, Pen } from 'lucide-react';
import { useParams } from 'react-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import useAuth from '~/hooks/Auth/useAuth';
import useFetchBlock from '~/hooks/Filters/useFetchBlockMutation';
import useFetchLot from '~/hooks/Filters/useFetchLot';
import TaskColumnActivities from './TaskColumnActivities';

const TaskColumnBlock = ({
  onChange,
  params
}) => {
  const { data, isLoading, isSuccess } = useFetchBlock({ params: params });

  const blocks = useMemo(() => {
    if (!isSuccess) return [];
    return data?.data.map((item) => item.code);
  }, [data, isSuccess]);

  return <Select
    rightSection={isLoading ? <Loader size={15} /> : <ChevronDown />}
    placeholder='BLOCK'
    data={blocks}
    searchable
    onChange={(v) => onChange(v)}
  />
}

const TaskColumnLot = ({
  params,
  onChange,
  lot
}) => {
  const { data, isLoading, isSuccess } = useFetchLot({ params: params });

  const lots = useMemo(() => {
    if (!isSuccess) return [];
    return data?.data.map((item, index) => ({
      label: `${item.code} (${item.description} - ${item.model})`,
      value: item.code === "0000" ?
        `${item.code}#${index}` : 
        item.code
    }));
  }, [data, isSuccess])

  return <Select
    value={lot}
    onChange={(v) => onChange(v)}
    rightSection={isLoading ? <Loader size={15} /> : <ChevronDown />}
    placeholder='LOT'
    data={lots}
    searchable
  />
}

const TaskRowSub = memo(() => {
  const [block, setBlock] = useState(null)
  const [lot, setLot] = useState(null);
  const { phaseCode } = useParams();

  const { user } = useAuth();
  const username = user.username;

  const handleSelectBlock = useCallback((val) => {
    setBlock(val);
    setLot(null);
  })

  const handleSelectLot = useCallback((val) => {
    setLot(val);
  });

  return (
    <Table.Tr>
      <Table.Td>
        <NativeSelect
          data={[
            { label: 'House Unit', value: 2 },
            { label: 'Other Task', value: 4 },
            { label: "Land Dev't", value: 1 },
            { label: 'Post Task', value: 5 },
          ]}
        />
      </Table.Td>
      <Table.Td>
        <TaskColumnBlock
          params={{
            username: username,
            phaseCode: phaseCode
          }}
          onChange={handleSelectBlock}
        />
      </Table.Td>
      <Table.Td>
        <TaskColumnLot
          lot={lot}
          onChange={handleSelectLot}
          params={{
            username: username,
            phaseCode: phaseCode,
            block: block,
          }}
        />
      </Table.Td>
      <Table.Td>
        <TaskColumnActivities />
      </Table.Td>
      <Table.Td></Table.Td>
      <Table.Td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>2026-04-07 10:00</Table.Td>
      <Table.Td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>2026-04-07 12:00</Table.Td>
      <Table.Td>
        <Tooltip label="Save">
          <ActionIcon variant='light' size={32}>
            <Pen size={12} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  )
})

export default TaskRowSub;
