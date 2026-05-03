import { Select, Loader } from '@mantine/core'
import { ChevronDown } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTaskContext } from '../../context';
import useFetchBlock from '~/hooks/Filters/useFetchBlockMutation';

const TaskRowBlockSelect = memo(({
  task,
  params,
  workerId,
  row
}) => {
  const { data, isLoading, isError, isSuccess, error } = useFetchBlock({ params });
  const handleUpdateTaskAdmin = useTaskContext(state => state.handleUpdateTaskAdmin);

  const blocks = useMemo(
    () => (isSuccess ? data?.data.map((item) => item.code) : []),
    [data, isSuccess]
  );

  const handleChange = useCallback((v) => {
    handleUpdateTaskAdmin(workerId, row, 'blk', v);
  }, [])

  return (
    <Select
      searchable
      value={task?.blk}
      data={blocks}
      rightSection={isLoading ? <Loader size={15} /> : <ChevronDown size={16} />}
      onChange={handleChange}
    />
  )
});

export default TaskRowBlockSelect;


