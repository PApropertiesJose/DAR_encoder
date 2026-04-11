import {
  ActionIcon,
  Table,
  Tooltip

} from '@mantine/core';
import { memo } from 'react';
import ConstructionIndexSelect from './ConstructionIndexSelect';
import { CheckIcon } from 'lucide-react';


const TaskRowV2 = memo(({
  rn,
}) => {

  return (
    <Table.Tr>
      <Table.Td colSpan={7}>
        <ConstructionIndexSelect
          rn={rn} />
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

