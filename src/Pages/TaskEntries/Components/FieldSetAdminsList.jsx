import { useState, useMemo } from 'react';
import {
  Fieldset, Text, ScrollArea, TextInput, Table, Checkbox
} from '@mantine/core';
import { useTaskContext } from '../context';

const FieldSetAdminsList = ({
  onChange,
}) => {
  const adminActivities = useTaskContext(state => state.adminActivities);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return adminActivities;
    return adminActivities.filter(admin =>
      admin.name.toLowerCase().includes(q)
    );
  }, [adminActivities, search]);

  const allChecked = filtered.length > 0 && filtered.every(a => selected.has(a.adminWorker));
  const indeterminate = filtered.some(a => selected.has(a.adminWorker)) && !allChecked;

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allChecked) {
        filtered.forEach(a => next.delete(a.adminWorker));
      } else {
        filtered.forEach(a => next.add(a.adminWorker));
      }
      onChange(next);
      return next;
    });
  };

  const toggleOne = (adminWorker) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(adminWorker) ? next.delete(adminWorker) : next.add(adminWorker);
      onChange(next);
      return next;
    });

  };

  const getSelectedAdmins = () => {
    return adminActivities.filter(a => selected.has(a.adminWorker));
  };

  const handleSubmit = () => {
    const selectedAdmins = getSelectedAdmins();
    console.log('Submitting admins:', selectedAdmins);
    // call your submit handler here
  };

  return (
    <Fieldset legend="Admin Workers">
      <TextInput
        label="Search Admin Name"
        placeholder="Input Admin name"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="sm"
      />
      <Table.ScrollContainer maxHeight={300}>
        <Table
          withColumnBorders
          withRowBorders
          withTableBorder
          striped
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>
                <Checkbox
                  checked={allChecked}
                  indeterminate={indeterminate}
                  onChange={toggleAll}
                />
              </Table.Th>
              <Table.Th>Name</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={2} ta="center" c="dimmed">
                  No results found
                </Table.Td>
              </Table.Tr>
            ) : (
              filtered.map((admin) => (
                <Table.Tr
                  key={admin.adminWorker}
                  bg={selected.has(admin.adminWorker) ? 'primary.2' : undefined}
                >
                  <Table.Td>
                    <Checkbox
                      checked={selected.has(admin.adminWorker)}
                      onChange={() => toggleOne(admin.adminWorker)}
                    />
                  </Table.Td>
                  <Table.Td>{admin.name}</Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Text size="sm" c="dimmed" >
        {selected.size} admin(s) selected
      </Text>
    </Fieldset>
  );
};

export default FieldSetAdminsList;
