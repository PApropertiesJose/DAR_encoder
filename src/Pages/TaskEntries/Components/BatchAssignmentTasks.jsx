import { Modal, Table, Fieldset, Text, Box, Group, Stack, Button, Alert, Space, NativeSelect, Flex, TextInput } from '@mantine/core'
import { memo, useCallback, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react'
import { useForm } from '@mantine/form';
import { BlockSelect } from './TaskRowSub';
import useAuth from '~/hooks/Auth/useAuth';
import { useParams } from 'react-router';
import TaskColumnLotComboBox from './TaskColumnLotComboBox';
import TaskColumnActivities from './TaskColumnActivities';
import FieldSetAdminsList from './FieldSetAdminsList';
import DateTimeIn from './DateTimeIn';
import DateTimeOut from './DateTimeOut';
import { useTaskContext } from '../context';
import BatchAssignmentBreakdown from './BatchAssignmentBreakdown';
import { computeHoursPerActivity } from '~/utils';
import { notifications } from '@mantine/notifications';
import { useDebouncedCallback } from '@mantine/hooks';


// ─── Constants ───────────────────────────────────────────────────────────────

const CONSTRUCTION_TYPES = [
  { label: 'House Unit', value: 'house-unit' },
  { label: 'Other Task', value: 'other-task' },
  { label: "Land Dev't", value: 'lan-dev' },
  { label: 'Post Task', value: 'post-task' },
];

const JustificationTextInput = memo(({
  constructionIndex = 'house-unit',
  projectedHours = null,
  budget = null,
  onChange,
}) => {
  if (constructionIndex === 'other-task') return;
  if ((projectedHours !== 0 && !budget) || projectedHours > budget) {
    return (
      <TextInput
        mt={10}
        label="Justification(Over budget/Overtime)"
        placeholder='Enter justification'
        onChange={onChange}
      />
    );
  }
});

const BatchAssignmentTasks = memo(({
  opened,
  close,
}) => {
  const { user } = useAuth();
  const { phaseCode } = useParams();
  const [unit, setUnit] = useState();
  const handleInsertBatchActivities = useTaskContext(state => state.handleInsertBatchActivities);
  const [admins, setAdmins] = useState(new Set());
  const form = useForm({
    mode: 'controlled',
    initialValues: {
      constructionIndex: 'house-unit',
      block: null,
      lot_no: null,
      activity: null,
      timeIn: null,
      timeOut: null,
      justification: null
    }
  });

  const handleFormChange = useDebouncedCallback((key, value) => {
    form.setFieldValue(key, value);
  }, [form])

  const blockParams = useMemo(() => {
    return {
      username: user?.username,
      phaseCode: phaseCode
    }
  }, [user, phaseCode]);

  const mainParams = useMemo(() => {
    return {
      ...blockParams,
      constructionIndex: form.values?.constructionIndex,
      block: form.values?.block,
      lot_no: form.values?.lot_no,
      activity: form.values?.activity,
      timeIn: form.values?.timeIn,
      timeOut: form.values?.timeOut
    }
  }, [form, blockParams])

  const activityParams = useMemo(() => {
    return {
      ...unit,
      ...mainParams
    }
  }, [unit, mainParams])

  const handleUpdateSelectedAdmins = useCallback((admins) => {
    setAdmins(admins)
  }, [])

  const projectedHours = useMemo(() => {
    if (form.values?.activity && form.values?.timeIn && form.values?.timeOut && admins.size > 0) {
      return computeHoursPerActivity({
        timeIn: form.values?.timeIn,
        timeOut: form.values?.timeOut,
        projectedHours: 0
      }) * admins?.size
    }
    return 0;
  }, [form, admins])

  const handleSubmit = () => {
    const errors = []
    const cIndex = form.values.constructionIndex;
    const _projectedHours = projectedHours
    const _budgetHours = form.values?.activity?.budget
    const justificationRequired = _projectedHours > _budgetHours;

    for (const [key, value] of Object.entries(form.values)) {
      if (key === 'justification' && cIndex === 'other-task') continue;

      if (key === 'justification' && !justificationRequired) continue;
      if (value === null || value === "") {
        let message = `${key} is required`;
        errors.push(message);
      }
    }

    if (errors?.length > 0) {
      notifications.show({
        color: 'red',
        title: 'Missing inputs',
        message: errors.join('\n'),
        styles: { description: { whiteSpace: 'pre-line' } }, // Required for some UI libs to render \n
      });
      return;
    }

    let _admins = [];
    admins.forEach((item) => {
      _admins.push({
        adminWorker: item,
        tasks: {
          rn: 'batch',
          category: form.values.constructionIndex,
          blk: form.values.block,
          lot: form.values?.lot_no,
          taskCode: form.values.activity.code,
          taskDescription: form.values.activity?.description,
          dateTimeIn: form.values.timeIn,
          dateTimeOut: form.values.timeOut,
          projectedHours: projectedHours,
          accumulatedHours: parseFloat(projectedHours) + parseFloat(form.values?.activity?.accumulated_hours),
          justification: form.values.justification
        }
      })
    });

    handleInsertBatchActivities(_admins);
    form.reset();
    close();
  }

  return (
    <Modal
      closeOnClickOutside={false}
      withCloseButton={false}
      styles={{
        header: {
          background: 'none'
        }
      }}
      p={0}
      m={0}
      size="xl"
      title="Batch Assignment"
      opened={opened}
      onClose={close}
    >
      <Alert
        c="orange"
        color='orange'
        variant='light'
        m={0}
        icon={<TriangleAlert />}
      >
        <Text>Pre-select first the admin for batch assigning.</Text>
      </Alert>
      <Space h={10} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <NativeSelect
          tt="uppercase"
          label="Construction Index"
          data={CONSTRUCTION_TYPES}
          onChange={(e) => handleFormChange('constructionIndex', e.currentTarget.value)}
        />
        <Flex gap={10}>
          <Box w="100%">
            <BlockSelect
              value={form.values?.block}
              onChange={(value) => handleFormChange('block', value)}
              label="BLOCK"
              params={blockParams}
            />
          </Box>
          <Box w="100%">
            <TaskColumnLotComboBox
              label="LOT"
              lot={form.values?.lot_no}
              params={mainParams}
              onChange={(value) => {
                handleFormChange('lot_no', value?.code);
                const params = {
                  username: mainParams.username,
                  constructionIndex: "",
                  system: 'NOAH_PAAPDC',
                  phaseCode: mainParams.phaseCode,
                  model: value?.model || "",
                  lot: value.lot_type,
                  block: mainParams.block,
                  lot_no: value?.code
                }
                setUnit(params);
              }}
            />
          </Box>
        </Flex>

        <Space h={10} />

        <TaskColumnActivities
          label={form.values?.activity?.code}
          term={form.values?.activity?.description}
          params={activityParams}
          onChange={(val) => {
            handleFormChange('activity', val);
          }}
        />

        <JustificationTextInput
          projectedHours={projectedHours}
          budget={form.values?.activity?.budget}
          constructionIndex={form.values.constructionIndex}
          onChange={(e) => handleFormChange('justification', e.currentTarget.value)}
        />


        <Flex my={10} gap={10}>
          <Box w="100%">
            <DateTimeIn
              onChange={(val) => handleFormChange('timeIn', val)}
              timeIn={form.values.timeIn}
              label="Time In"
            />
          </Box>
          <Box w="100%">
            <DateTimeOut
              timeOut={form.values.timeOut}
              onChange={(val) => handleFormChange('timeOut', val)}
              label="Time Out" />
          </Box>
        </Flex>

        {form.values?.activity && form.values?.timeIn && form.values?.timeOut && admins.size > 0 && (
          <BatchAssignmentBreakdown
            projectedHours={projectedHours}
            accumulatedHours={parseFloat(projectedHours) + parseFloat(form.values?.activity?.accumulated_hours)}
            budgetHours={form.values?.activity?.budget}
          />
        )}

        <FieldSetAdminsList onChange={handleUpdateSelectedAdmins} />

        <Group mt={20} gap={10} justify='flex-end'>
          <Button variant='subtle' onClick={() => {
            setAdmins(new Set());
            form.reset();
            close();
          }}>Cancel</Button>
          <Button type="submit" variant='filled' >Confirm</Button>
        </Group>
      </form>

    </Modal>
  )
})

export default BatchAssignmentTasks;
