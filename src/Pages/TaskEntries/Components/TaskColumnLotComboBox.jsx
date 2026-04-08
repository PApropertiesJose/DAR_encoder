import { Badge, Loader, Text, useCombobox, Combobox, InputBase, Input, ThemeIcon, Group, Stack } from '@mantine/core'
import { HouseIcon, LandPlot, TrafficCone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import useFetchLot from '~/hooks/Filters/useFetchLot';

const lotIconMapping = (type) => {
  switch (type) {
    case "ROAD LOT":
      return <TrafficCone />
    case "EXCLUDED AREA":
      return <LandPlot />
    default:
      return <HouseIcon />
  }
}

const TaskColumnLotComboBox = ({
  params,
  onChange,
  lot = "",
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState("");

  useEffect(() => {
    if(lot) setSearch(lot);
    if(!lot) setSearch(""); //clear if new block is selected
  }, [lot])

  const { data, isLoading, isSuccess } = useFetchLot({ params: params });

  const results = useMemo(() => {
    if (!isSuccess) return [];
    return data?.data;
  }, [data, isSuccess]);

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const code = item.code ?? "";       // fallback if null
      const searchValue = search ?? "";   // fallback if null

      return code.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [results, search]);;

  const options = filteredResults?.map((item, index) => (
    <Combobox.Option value={item} key={`${item.code}-${index}`}>
      <Group gap={3} my={5}>
        <ThemeIcon size={42} variant="light">
          {lotIconMapping(item.description)}
        </ThemeIcon>
        <Stack gap={0}>
          <Text size="xs">{item.description}</Text>
          <Text style={{ fontSize: '10px', fontFamily: 'monospace' }}>{item.lot_type_description}</Text>
        </Stack>
        <Group flex={1} justify='flex-end'>
          <Stack gap={0} align='flex-end'>
            <Badge radius="xs" label="LOT" variant="outline" size="xs">
              {item.code}
            </Badge>
            <Text style={{ fontSize: '10px', fontFamily: 'monospace' }}>{item.model_description}</Text>
          </Stack>
        </Group>
      </Group>
    </Combobox.Option>
  ));

  return (
    <Combobox
      w="100%"
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          pointer
          rightSection={isLoading ? <Loader size={16} /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => {
            combobox.focusSearchInput();
            combobox.toggleDropdown();
          }}
          value={search}
          placeholder='LOT'
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

    </Combobox >

  );
}

export default TaskColumnLotComboBox; 
