import {
  Group, Badge, Select, Stack, NativeSelect, Tooltip, Table,
  ActionIcon, Loader, Text, ThemeIcon,
  TextInput,
  ModalContent
} from '@mantine/core';
import { CheckIcon, ChevronDown, Pen } from 'lucide-react';
import { useParams } from 'react-router';
import { memo, useCallback, useMemo, useReducer, useState, useEffect } from 'react';
import useFetchBlock from '~/hooks/Filters/useFetchBlockMutation';
import TaskColumnActivities from './TaskColumnActivities';
import DateTimeIn from './DateTimeIn';
import DateTimeOut from './DateTimeOut';
import { computeHoursPerActivity, isTaskOverlapping } from '~/utils';
import TaskColumnLotComboBox from './TaskColumnLotComboBox';
import { useDebouncedState } from '@mantine/hooks';
import useManageTaskEntryMutation from '~/hooks/TaskEntries/useManageTaskEntryMutation';
import { notifications } from '@mantine/notifications';
import { useTaskContext } from '../context';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONSTRUCTION_TYPES = [
  { label: 'House Unit', value: 'house-unit' },
  { label: 'Other Task', value: 'other-task' },
  { label: "Land Dev't", value: 'lan-dev' },
  { label: 'Post Task', value: 'post-task' },
];

const INITIAL_STATE = {
  constructionIndex: 'house-unit',
  block: null,
  lot: null,
  lotObject: null,
  timeIn: null,
  timeOut: null,
  actTerm: null,
  activity: null,
  btnLoading: false,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONSTRUCTION':
      return { ...INITIAL_STATE, constructionIndex: action.payload };

    case 'SET_BLOCK':
      return {
        ...state,
        block: action.payload,
        lot: null,
        lotObject: null,
        actTerm: null,
        activity: null,
      };

    case 'SET_LOT':
      return {
        ...state,
        lot: action.payload.code,
        lotObject: action.payload,
        actTerm: null,
        activity: null
      };

    case 'SET_TIME_IN':
      return { ...state, timeIn: action.payload };

    case 'SET_TIME_OUT':
      return { ...state, timeOut: action.payload };

    case 'SET_ACTIVITY':
      return {
        ...state,
        actTerm: action.payload.description,
        activity: action.payload,
      };

    case "LOADING":
      return {
        ...state,
        btnLoading: !state.btnLoading
      }

    default:
      return state;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const BlockSelect = memo(({ value, params, onChange }) => {
  const { data, isLoading, isSuccess } = useFetchBlock({ params });

  const blocks = useMemo(
    () => (isSuccess ? data?.data.map((item) => item.code) : []),
    [data, isSuccess]
  );

  return (
    <Select
      value={value}
      placeholder="BLOCK"
      data={blocks}
      searchable
      rightSection={isLoading ? <Loader size={15} /> : <ChevronDown size={16} />}
      onChange={onChange}
    />
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

const TaskRowSub = memo(({
  row,
  params,
  workerId,
  workerName,
  workerSystem,
  handleUpdateTaskAdmin
}) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const {
    constructionIndex, block, lot, lotObject,
    timeIn, timeOut, actTerm, activity, btnLoading
  } = state;

  const [justification, setJustication] = useDebouncedState("", 500);
  const taskMutation = useManageTaskEntryMutation();

  useEffect(() => {
    if (justification) {
      handleUpdateTaskAdmin(workerId, row, 'justification', justification);
    }
  }, [justification, handleUpdateTaskAdmin, workerId, row]);

  console.log("rerenders: ", workerName);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectConstruction = useCallback(
    (e) => {
      const val = e.currentTarget.value;
      dispatch({ type: 'SET_CONSTRUCTION', payload: val });
      handleUpdateTaskAdmin(workerId, row, 'category', val);
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleSelectBlock = useCallback(
    (val) => {
      handleUpdateTaskAdmin(workerId, row, 'block', val);
      dispatch({ type: 'SET_BLOCK', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleSelectLot = useCallback(
    (val) => {
      handleUpdateTaskAdmin(workerId, row, 'lot', val.code);
      handleUpdateTaskAdmin(workerId, row, 'lotObject', val);
      dispatch({ type: 'SET_LOT', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleTimeIn = useCallback(
    (val) => {
      handleUpdateTaskAdmin(workerId, row, 'timeIn', val);
      dispatch({ type: 'SET_TIME_IN', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleTimeOut = useCallback(
    (val) => {
      handleUpdateTaskAdmin(workerId, row, 'timeOut', val);
      dispatch({ type: 'SET_TIME_OUT', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleSelectActivity = useCallback(
    (val) => {
      handleUpdateTaskAdmin(workerId, row, 'activity', val);
      handleUpdateTaskAdmin(workerId, row, 'actTerm', val.description);
      dispatch({ type: 'SET_ACTIVITY', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  // ── Derived State ─────────────────────────────────────────────────────────

  const hoursPerActivity = useMemo(
    () => computeHoursPerActivity({ timeIn, timeOut }),
    [timeIn, timeOut]
  );

  const blockParams = params

  const lotParams = useMemo(
    () => ({ ...params, block }),
    [params, block]
  );

  const isOverlapping = useTaskContext((state) => {
    const admin = state.adminActivities.find((a) => a.adminWorker === workerId);
    if (!admin) return false;
    return isTaskOverlapping(admin.tasks ?? [], row);
  });

  const activityParams = useMemo(
    () => {
      if (!block || !lotObject) return null;
      return {
        username: params.username,
        constructionIndex: constructionIndex,
        system: 'NOAH_PAAPDC',
        phaseCode: params.phaseCode,
        model: lotObject?.model,
        lot: lotObject?.lot_type,
        block: block,
        lot_no: lotObject?.code,
      }
    },
    [lotObject, block]
  )

  const budgetHours = useMemo(() => {
    if (!activity) return 0;
    return activity.budget
  }, [activity?.budget])

  const accumulatedHours = useMemo(() => {
    if (!activity) return 0 + hoursPerActivity;
    return (activity.accumulated_hours + parseFloat(hoursPerActivity)).toFixed(2);
  }, [activity?.accumulated_hours, hoursPerActivity]);

  const isRowOverbudget = useMemo(() => {
    if (accumulatedHours > budgetHours) return true;
    return false;
  }, [budgetHours, accumulatedHours, hoursPerActivity])

  const handleManageTaskEntry = useCallback(() => {
    const request = {
      system: "NOAH_PAAPDC",
      phaseCode: params.phaseCode,
      modelCode: lotObject?.model,
      workers: [
        {
          id: workerId,
          system: workerSystem,
          name: workerName,
          position: ""
        }
      ],
      tasks: [
        {
          code: activity?.code,
          description: activity?.description,
          isWithAdditional: false,
          projected_time_out: timeOut,
          justification: justification,
          isOt: false,
        }
      ],
      codes: [], //not required but needed in the request body
      timeIn: timeIn,
      category: constructionIndex,
      block: block,
      lot: lot,
      isOt: false // create a state for identifying ot on hold;
    }

    dispatch({ type: "LOADING" });
    taskMutation.mutate(request, {
      onSuccess: () => {
        notifications.show({
          color: 'green',
          title: "Successfully saved!",
          message: "Task Entry added!",
        });
      },
      onError: (error) => {
        const errorMessage = error.response.data?.message ?? error.message;
        notifications.show({
          color: 'red',
          title: "Failed to saved task entry",
          message: errorMessage,
        });
      },
      onSettled: () => {
        dispatch({ type: "LOADING" });
      }
    })
  }, [
    params.phaseCode,
    lotObject,
    workerId,
    workerSystem,
    workerName,
    activity,
    timeOut,
    timeIn,
    justification,
    constructionIndex,
    block,
    lot,
    taskMutation
  ])


  return (
    <Table.Tr bg={isOverlapping ? "red.1" : undefined}>
      < Table.Td >
        <NativeSelect
          value={constructionIndex}
          data={CONSTRUCTION_TYPES}
          onChange={handleSelectConstruction}
        />
      </Table.Td >

      <Table.Td>
        <BlockSelect
          value={block}
          params={blockParams}
          onChange={handleSelectBlock}
        />
      </Table.Td>

      <Table.Td>
        <TaskColumnLotComboBox
          lot={lot}
          params={lotParams}
          onChange={handleSelectLot}
        />
      </Table.Td>

      <Table.Td>
        <Stack gap={10}>
          <TaskColumnActivities
            term={actTerm}
            onChange={handleSelectActivity}
            params={activityParams}
          />
          {isRowOverbudget && constructionIndex !== 'other-task' && (
            <TextInput
              defaultValue={justification}
              required
              placeholder='Enter Justification'
              onChange={(e) => setJustication(e.currentTarget.value)}
            />
          )}
        </Stack>
      </Table.Td>

      <Table.Td>
        <Group gap={0}>
          <Tooltip label="Projected Hours">
            <Text size="xs" ff="monospace">{hoursPerActivity}/</Text>
          </Tooltip>
          <Tooltip label="Accumulated Hours">
            <Text
              style={{
                fontSize: isRowOverbudget ? "18px" : "14px",
                fontWeight: isRowOverbudget ? "800" : "500",
                transition: "all 0.3s ease",
              }}
              size="sm" ff="monospace" >{accumulatedHours}/</Text>
          </Tooltip>
          <Tooltip label="Budget Hours">
            <Text
              style={{
                fontSize: !isRowOverbudget ? "18px" : "14px",
                fontWeight: !isRowOverbudget ? "800" : "500",
                transition: "all 0.3s ease"
              }}
              size="md">{budgetHours}</Text>

          </Tooltip>

        </Group>
      </Table.Td>

      <Table.Td>
        <DateTimeIn value={timeIn} onChange={handleTimeIn} />
      </Table.Td>

      <Table.Td>
        <DateTimeOut value={timeOut} onChange={handleTimeOut} />
      </Table.Td>

      <Table.Td>
        <Tooltip label="Save">
          <ActionIcon disabled={!lotObject || !activity || !timeIn || !timeOut || !block || !lot || (isRowOverbudget && constructionIndex !== 'other-task' && !justification)} loading={btnLoading} onClick={handleManageTaskEntry} variant="light" size={32}>
            <CheckIcon size={12} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr >
  );
});

export default TaskRowSub;
