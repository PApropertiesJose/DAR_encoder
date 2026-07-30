import { useMemo, useState } from 'react';
import {
  Input,
  Drawer,
  TextInput,
  ScrollArea,
  Stack,
  Text,
  Group,
  ActionIcon,
  Loader,
  UnstyledButton,
} from '@mantine/core';
import { ChevronDown, Search, X, Check } from 'lucide-react';

/**
 * Mobile-friendly replacement for a searchable Mantine <Select>.
 *
 * A plain searchable Select opens a floating dropdown while focusing a text
 * input, so on mobile the virtual keyboard covers the options. This component
 * instead opens a bottom Drawer (a "bottom sheet") with the search field
 * pinned at the top and a scrollable list below — the keyboard pushes the
 * list up but every option stays reachable by scrolling.
 */
const SearchablePicker = ({
  label,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search…',
  data = [],
  value,
  onChange,
  disabled = false,
  loading = false,
  clearable = true,
  searchable = true,
  nothingFoundMessage = 'Nothing found',
  drawerTitle,
  // 'numeric' shows the digits-only virtual keyboard for number-like options.
  searchInputMode,
  // Optional customizers for richer items:
  renderOption, // (option, { active }) => node — custom row body
  renderValue, // (option) => node — custom trigger label
  filterFn, // (query, option) => boolean — custom search predicate
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(
    () => data.find((o) => o.value === value) ?? null,
    [data, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    if (filterFn) return data.filter((o) => filterFn(q, o));
    return data.filter((o) => String(o.label ?? '').toLowerCase().includes(q));
  }, [data, query, filterFn]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const handleSelect = (val) => {
    onChange?.(val);
    close();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(null);
  };

  const rightSection = loading ? (
    <Loader size={16} />
  ) : clearable && value ? (
    <ActionIcon variant="subtle" color="gray" size="sm" onClick={handleClear}>
      <X size={14} />
    </ActionIcon>
  ) : (
    <ChevronDown size={16} />
  );

  return (
    <Input.Wrapper label={label}>
      <Input
        component="button"
        type="button"
        pointer
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        rightSection={rightSection}
      >
        {selectedOption ? (
          renderValue ? (
            renderValue(selectedOption)
          ) : (
            <Text size="sm" truncate>
              {selectedOption.label}
            </Text>
          )
        ) : (
          <Text size="sm" c="dimmed">
            {placeholder}
          </Text>
        )}
      </Input>

      <Drawer
        opened={open}
        onClose={close}
        position="bottom"
        size="100%"
        title={drawerTitle ?? label}
        zIndex={400}
        styles={{
          body: {
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100% - 60px)',
          },
        }}
      >
        {searchable && (
          <TextInput
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            leftSection={<Search size={14} />}
            inputMode={searchInputMode}
            mb="sm"
          />
        )}
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={renderOption ? 'xs' : 4}>
            {filtered.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {nothingFoundMessage}
              </Text>
            )}
            {filtered.map((o) => {
              const active = o.value === value;
              return (
                <UnstyledButton
                  key={o.value}
                  onClick={() => handleSelect(o.value)}
                  p="sm"
                  style={{
                    borderRadius: 8,
                    border: renderOption
                      ? '1px solid var(--mantine-color-default-border)'
                      : undefined,
                    background: active
                      ? 'var(--mantine-color-teal-light)'
                      : undefined,
                  }}
                >
                  {renderOption ? (
                    renderOption(o, { active })
                  ) : (
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm">{o.label}</Text>
                      {active && <Check size={16} color="var(--mantine-color-teal-6)" />}
                    </Group>
                  )}
                </UnstyledButton>
              );
            })}
          </Stack>
        </ScrollArea>
      </Drawer>
    </Input.Wrapper>
  );
};

export default SearchablePicker;
