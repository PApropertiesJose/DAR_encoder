import { Badge, Tooltip, Combobox, InputBase, useCombobox, Input, Text, Loader, Group, Stack, Paper } from "@mantine/core";
import { memo, useEffect, useMemo, useState } from 'react'
import useFetchActivity from "~/hooks/Filters/useFetchActivity";
import { formatNumber } from "~/utils";

const TaskActivityStatus = ({ status }) => {
  if (status == "INCOMPLETE") return <Badge variant="outline" color="red" size="xs" radius="none">{status}</Badge>
  if (status == "NOT YET STARTED") return <Badge variant="outline" c="dimmed" radius="none" size="xs">{status}</Badge>
  if (status == "COMPLETED") return <Badge variant="filled" radius="none" size="xs">{status}</Badge>
  if (status == "ONGOING") return <Badge variant="outline" radius="none" size="xs">{status}</Badge>
}

const TaskColumnActivitiesOptions = memo(({ item }) => {
  return (
    <Combobox.Option disabled={item.status === "COMPLETED"} value={item}>
      <Group>
        <Badge style={{ border: '1px solid var(--mantine-color-dimmed)' }} size="md" h={50} radius="xs" variant="light">PAD</Badge>
        <Stack gap={0} flex={1}>
          <Group justify="space-between">
            <Text size="xs" style={{ fontFamily: 'monospace' }}>{item.code}</Text>
            <TaskActivityStatus status={item.status} />
          </Group>
          <Group gap={0} justify="space-between">
            <Text size="xs">{item.description}</Text>
            <Group gap={0}>
              <Text size="xs" style={{ fontFamily: 'monospace' }}>{formatNumber(item.accumulated_hours)}/hrs</Text>
              <Text size="sm">/{formatNumber(item.budget)}/hrs</Text>
            </Group>
          </Group>
          <Tooltip label="Prerequisite Tasks">
            <Group wrap="wrap" gap={2}>
              {item.pre_requisite_tasks.map((task) => {
                if (task.pre_requisite_code == "") return null;
                return <Badge>{task.pre_requisite_code}</Badge>
              })}
            </Group>
          </Tooltip>
        </Stack>
      </Group>
    </Combobox.Option>
  );
});



const TaskColumnActivities = memo(({
  params,
  term,
  onChange,
  readOnly = false
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const { data, isLoading, isError, error, isSuccess } = useFetchActivity({ params: params });

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!term) setSearch("");
    if (term) setSearch(term);
  }, [term])

  const filteredResults = useMemo(() => {
    if (!isSuccess) return [];

    const list = data?.data ?? [];

    if (!search) return list;

    const searchLower = search.toLowerCase();

    return list.filter((item) =>
      item.code?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }, [data, isSuccess, search]);

  const options = filteredResults?.map((item) => (
    <TaskColumnActivitiesOptions item={item} key={item.code} />
  ))

  return (
    <Combobox
      w="100%"
      store={combobox}
      disabled={readOnly}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          disabled={readOnly}
          pointer
          rightSection={isLoading ? <Loader size={16} /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => {
            combobox.focusSearchInput();
            combobox.toggleDropdown();
          }}
          value={search}
          placeholder='CONSTRUCTION ACTIVITY'
          onChange={(e) => {
            combobox.updateSelectedOptionIndex();
            setSearch(e.currentTarget.value)
          }}
        >
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
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

