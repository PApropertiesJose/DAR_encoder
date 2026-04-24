import { Select, Loader } from '@mantine/core'
import { useMemo, memo, useCallback } from 'react';
import useFetchProject from '~/hooks/Projects/useFetchProjects';

const SelectPhase = ({
  onChange,
  params 
}) => {
  const { data, isLoading, isError } = useFetchProject(params);

  const items = useMemo(() => {
    if(isError) return [];
    return data?.data?.map((item) => ({
      value: item.code,
      label: item.description
    }))
  }, [data]) 

  const handleChange = useCallback((val) => {
    onChange(val);
  }, [onChange])

  return (
    <Select 
      mt={10}
      searchable
      label="PHASE"
      size="md"
      placeholder='Select Phase'
      rightSection={isLoading ? <Loader size={16}/> : null}
      data={items}
      error={isError && "Failed to fetch phase"}
      onChange={handleChange}
    />
  );
}

export default memo(SelectPhase);
