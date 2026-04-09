import {
  Box,
  Avatar,
  Input,
  InputBase,
  Combobox,
  useCombobox,
  Group,
  Stack,
  Text,
  Loader,
  Badge
} from '@mantine/core';
import { getInitials } from '~/utils';
import useFetchAdmin from '~/hooks/Filters/useFetchAdmin';
import ErrorElement from '../ErrorElement';
import { memo, useContext, useMemo, useState } from 'react';
import { useTaskContext } from '~/Pages/TaskEntries/context';
import { notifications } from '@mantine/notifications';

const AutoCompleteAdminOptions = memo(({ item, isAlreadyAdded = false }) => {
  return (
    <Combobox.Option disabled={isAlreadyAdded} value={item} key={item.id} >
      <Group>
        <Avatar variant='light' color="primary">{getInitials(item)}</Avatar>
        <Stack gap={0}>
          <Group gap={5}>
            <Text size="sm">{item.name}</Text>
          </Group>
          <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>{item.position}</Text>
        </Stack>
        <Group flex={1} justify='flex-end'>
          {item.groups[0] == "" ? null : <Badge size="xs" variant='outline'>{item.groups[0]}</Badge>}
        </Group>
      </Group>
    </Combobox.Option>
  );
})

const AutoCompleteAdmins = memo(({
  params
}) => {
  const { adminActivities, handleAddAdmin, selectedDate } = useTaskContext();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, isSuccess } = useFetchAdmin({ params });

  const results = useMemo(() => {
    if (!isSuccess) return [];
    return data?.data;
  }, [data, isSuccess]);

  const filteredResults = useMemo(() => {
    return results.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [results, search]);

  if (isError) {
    const errorMessage = error.response.data.message ?? error.message;
    return <ErrorElement>{errorMessage}</ErrorElement>;
  }

  const options = filteredResults?.map((item) => {
    const isExisting = adminActivities.some((x) => x.adminWorker == item.id);
    return (
      <AutoCompleteAdminOptions isAlreadyAdded={isExisting} item={item} key={item.id} />
    )
  });

  return (
    <>
      <Text size="sm">Search Admin</Text>

      <Combobox
        w={"100%"}
        store={combobox}
        onOptionSubmit={(val) => {
          // if (!selectedDate) {
          //   notifications.show({
          //     color: 'red',
          //     title: "Failed to Add admin!",
          //     message: "Please select a date first"
          //   })
          //   return;
          // }
          handleAddAdmin(val);
          // combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <InputBase
            component="button"
            type="button"
            pointer
            rightSection={isLoading ? <Loader size={16} /> : <Combobox.Chevron />}
            rightSectionPointerEvents="none"
            onClick={() => {
              combobox.focusSearchInput();
              combobox.toggleDropdown();
            }}
          >
            <Input.Placeholder>
              {search || 'Input name of the Admin'}
            </Input.Placeholder>
          </InputBase>
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Search
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search by name..."
          />

          <Combobox.Options
            mah={300}
            style={{ overflowY: 'auto' }}
          >
            {options.length > 0 ? options : (
              <Text size="sm" p="xs">No results found</Text>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
      <Text size="xs" c="dimmed" pt={5}>Note: Select an admin for task entry</Text>
    </>
  );
})

export default AutoCompleteAdmins;
