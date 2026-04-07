import { Badge, Tooltip, Combobox, InputBase, useCombobox, Input, Text, Loader, Group, Stack, Paper } from "@mantine/core";
import { memo, useMemo, useState } from 'react'
import useFetchActivity from "~/hooks/Filters/useFetchActivity";
import { formatNumber } from "~/utils";


const TaskColumnActivitiesOptions = memo(({ item }) => {
  return (
    <Combobox.Option>

      <Group>
        <Stack gap={0} flex={1}>
          <Group justify="space-between">
            <Text size="xs" style={{ fontFamily: 'monospace' }}>{item.code}</Text>
            <Badge variant="outline" size="xs">{item.status}</Badge>
          </Group>
          <Group gap={0} justify="space-between">
            <Text size="xs">{item.description}</Text>
            <Text size="xs" style={{ fontFamily: 'monospace'}}>{formatNumber(item.accumulated_hours)}/hrs</Text>
          </Group>
          <Tooltip label="Prerequisite Tasks">
            <Group>
              <Badge size="xs" variant="outline" radius="none">PR14</Badge>
            </Group>
          </Tooltip>
        </Stack>
      </Group>
    </Combobox.Option>
  );
});

const params = {
  "username": 'jmdelacruz',
  "constructionIndex": 'other-task',
  "system": "NOAH_PAAPDC",
  "phaseCode": "SJRF-2",
  "model": "238",
  "lot": "000",
  "block": "000",
  "lot_no": "0000"
}

const TaskColumnActivities = memo(() => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const { data, isLoading, isError, error, isSuccess } = useFetchActivity({ params: params });

  const [search, setSearch] = useState();

  const results = useMemo(() => {
    if (!isSuccess) return [];
    return data?.data ?? [];
  }, [data, isSuccess])

  const options = results?.map((item) => (
    <TaskColumnActivitiesOptions item={item} key={item.code} />
  ))

  return (
    <Combobox
      w="100%"
      store={combobox}
      onOptionSubmit={() => {
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={isLoading ? <Loader size={14} /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => {
            combobox.focusSearchInput();
            combobox.toggleDropdown();
          }}
        >
          <Input.Placeholder>
            {search || 'Search Activity'}
          </Input.Placeholder>
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search by activity or code"
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

  )
})

export default TaskColumnActivities

