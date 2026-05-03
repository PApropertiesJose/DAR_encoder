import {
  ActionIcon,
  Table,
  Tooltip

} from '@mantine/core';
import { memo } from 'react';
import ConstructionIndexSelect from './ConstructionIndexSelect';
import { CheckIcon } from 'lucide-react';
import { data } from './data'
import TaskRowBlockSelect from './TaskRowBlockSelect';
import { useTaskContext } from '../../context';
import { shallow } from 'zustand/shallow';

const TaskRowV2 = memo(({
  workerId,
  row,
  params
}) => {
  const task = useTaskContext(
    state => state.adminActivities
      .find(a => a.adminWorker === workerId)
      ?.tasks?.[row],
    shallow
  );

  console.log(task);

  return (
    <Table.Tr>
      <Table.Td >
        <ConstructionIndexSelect task={task} row={row} workerId={workerId} />
      </Table.Td>
      <Table.Td>
        <TaskRowBlockSelect
          task={task}
          workerId={workerId}
          row={row}
          params={params}
        />
      </Table.Td>
      <Table.Td>
        <Tooltip label="Save">
          <ActionIcon>
            <CheckIcon />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  )

});
export default TaskRowV2;

