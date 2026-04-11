import { Table, Tooltip, ActionIcon } from "@mantine/core";
import { CheckIcon, TrashIcon } from 'lucide-react'
import { memo } from "react";
import { useTaskContext } from "../context";

const TaskRowActionButton = memo(({
  rn,
  isDisabled,
  loading,
  onSave,
  onUpdate,
  onDelete
}) => {
  const control = useTaskContext(state => state.segmentedControl)
  const showSaveOrUpdate = control === "ADD" || (rn && control === "UPDATE");

  console.log('action icon: ', control);

  if (showSaveOrUpdate) {
    const isSave = control === "ADD" || !rn;
    return (
      <Tooltip label={isSave ? "Save" : "Update"}>
        <ActionIcon
          disabled={isDisabled}
          loading={loading}
          onClick={control === "ADD" ? onSave : onUpdate}
          size={32}
        >
          <CheckIcon size={20} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Tooltip label="DELETE">
      <ActionIcon onClick={onDelete} variant="light" color="red" loading={loading} size={32}>
        <TrashIcon size={18} />
      </ActionIcon>
    </Tooltip>
  );
});

const TaskRowSubV2 = memo(({
  workerName,
  control
}) => {
  console.log(workerName);
  return (
    <Table.Tr>
      <Table.Td colSpan={7}>{workerName}</Table.Td>
      <Table.Td >
        <TaskRowActionButton control={control} />
      </Table.Td>
    </Table.Tr>
  )
})

export default TaskRowSubV2;
