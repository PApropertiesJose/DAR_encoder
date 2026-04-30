import { Table, Fieldset } from '@mantine/core'
import { memo } from 'react';

const BatchAssignmentBreakdown = memo(({
  projectedHours,
  accumulatedHours,
  budgetHours
}) => {
  return (
    <Fieldset legend="Breakdown" my={10}>
      <Table
        withColumnBorders
        withRowBorders
        withTableBorder
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Projected Hours</Table.Th>
            <Table.Th>Accumulated Hours</Table.Th>
            <Table.Th>Budget Hours</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>{projectedHours}/hrs</Table.Td>
            <Table.Td>{accumulatedHours}/hrs</Table.Td>
            <Table.Td>{budgetHours}/hrs</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Fieldset>
  )
})

export default BatchAssignmentBreakdown
