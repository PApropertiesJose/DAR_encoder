import {
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
import ErrorElement from '~/components/ErrorElement';
import { memo, useEffect, useMemo, useState } from 'react';
import { useIndexedDB } from '~/hooks/useIndexedDB';
import { DB_SCHEMA } from '~/Constants/schemas';
import { getDBService } from '~/services/indexedDB';

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
  params,
  forceFetch = false,
  onSyncComplete,
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const { data: cachedAdmins, loading: dbLoading } = useIndexedDB('admins', { schema: DB_SCHEMA });
  const { data: currentPhase, loading: phaseLoading } = useIndexedDB('currentPhaseData', { schema: DB_SCHEMA });

  const hasCache = cachedAdmins && cachedAdmins.length > 0;
  const isPhaseMatched = currentPhase && currentPhase.length > 0 && currentPhase[0]?.code === params.phaseCode;

  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, isSuccess } = useFetchAdmin({
    params,
    options: {
      enabled: !dbLoading && !phaseLoading && (!hasCache || !isPhaseMatched || forceFetch)
    }
  });


  const results = useMemo(() => {
    if (isSuccess) return data?.data || [];
    if (isPhaseMatched) return cachedAdmins || [];
    return [];
  }, [cachedAdmins, isSuccess, isPhaseMatched, data])

  const saveOffline = async () => {
    try {
      const db = getDBService('AppOfflineDB', 1, DB_SCHEMA);
      // Overwrite cache with fresh results
      await db.clear('admins');
      console.log(data);
      if (data?.data) {
        for (const item of data.data) {
          await db.put('admins', item);
        }
      }
      await db.clear('currentPhaseData');
      await db.put('currentPhaseData', { code: params.phaseCode });
    } catch (err) {
      console.error('Failed to save admin to indexedDB:', err);
    } finally {
      onSyncComplete?.();
    }

  }

  // Cache fetched results offline when the request succeeds
  useEffect(() => {
    if (isSuccess) {
      saveOffline();
    } else if (isError) {
      if (forceFetch) {
        onSyncComplete?.();
      }
    }
  }, [isSuccess, isError, forceFetch, onSyncComplete]);

  const filteredResults = useMemo(() => {
    return results?.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [results, search]);

  const options = filteredResults?.map((item) => {
    return (
      <AutoCompleteAdminOptions isAlreadyAdded={false} item={item} key={item.id} />
    )
  });

  return (
    <>
      <Text size="sm">Search Admin</Text>

      <Combobox
        w={"100%"}
        store={combobox}
        onOptionSubmit={(val) => {
          // handleAddAdmin(val);
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
