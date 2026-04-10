import {
  Group, Badge, Select, Stack, NativeSelect, Tooltip, Table,
  ActionIcon, Loader, Text, ThemeIcon,
  TextInput,
  ModalContent
} from '@mantine/core';
import { CheckIcon, ChevronDown, Pen, TrashIcon } from 'lucide-react';
import { useParams } from 'react-router';
import { memo, useCallback, useMemo, useReducer, useState, useEffect, useRef } from 'react';
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
  rn: null,
  constructionIndex: 'house-unit',
  block: null,
  lot: null,
  lotObject: null,
  timeIn: null,
  timeOut: null,
  actTerm: null,
  activity: null,
  btnLoading: false,
}
// ─── Reducer ─────────────────────────────────────────────────────────────────

function init(initialData) {
  if (initialData) {
    return {
      rn: initialData?.rn,
      constructionIndex: initialData.category?.toLowerCase().replace('_', '-') || 'house-unit',
      block: initialData.block ?? initialData.blk ?? null,
      lot: initialData.lot ?? null,
      lotObject: null,
      timeIn: initialData.timeIn ?? initialData.dateTimeIn ?? null,
      timeOut: initialData.timeOut ?? initialData.dateTimeOut ?? null,
      actTerm: initialData.taskDescription ?? initialData.actTerm ?? null,
      activity: initialData.taskCode ? {
        code: initialData.taskCode,
        description: initialData.taskDescription,
        budget: initialData.budget ?? 0,
        accumulated_hours: initialData.accumulated_hours ?? 0,
      } : null,
      btnLoading: initialData.btnLoading ?? false,
    }
  }
  return INITIAL_STATE;
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONSTRUCTION':
      return { ...INITIAL_STATE, constructionIndex: action.payload };

    case "SET_ROW_DATA":
      console.log(action.payload.task);
      return {
        ...state,
        ...action.payload.task,
        lotObject: action.payload.task.lotObject !== undefined ? action.payload.task.lotObject : state.lotObject,
        activity: action.payload.task.activity || state.activity
      };

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

const BlockSelect = memo(({ value, params, onChange, readOnly = false }) => {
  const { data, isLoading, isSuccess } = useFetchBlock({ params });

  const blocks = useMemo(
    () => (isSuccess ? data?.data.map((item) => item.code) : []),
    [data, isSuccess]
  );

  return (
    <Select
      readOnly={readOnly}
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
  control,
  row,
  params,
  workerId,
  workerName,
  workerSystem,
  handleUpdateTaskAdmin,
  handleDeleteTask,
  rowData,
}) => {
  const [state, dispatch] = useReducer(reducer, rowData, init);
  const {
    rn, constructionIndex, block, lot, lotObject,
    timeIn, timeOut, actTerm, activity, btnLoading
  } = state;

  const [justification, setJustication] = useDebouncedState(rowData?.justification, 500);
  const taskMutation = useManageTaskEntryMutation();

  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    if (rowData) {
      const task = {
        rn: rowData?.rn,
        constructionIndex: rowData.category?.toLowerCase().replace('_', '-') || 'house-unit',
        block: rowData.block ?? rowData.blk ?? state.block,
        lot: rowData.lot ?? state.lot,
        timeIn: rowData.timeIn ?? rowData.dateTimeIn ?? state.timeIn,
        timeOut: rowData.timeOut ?? rowData.dateTimeOut ?? state.timeOut,
        actTerm: rowData.taskDescription ?? rowData.actTerm ?? state.actTerm,
        activity: rowData.taskCode ? {
          code: rowData.taskCode,
          description: rowData.taskDescription,
          budget: rowData.budget ?? state.activity?.budget ?? 0,
          accumulated_hours: rowData.accumulated_hours ?? state.activity?.accumulated_hours ?? 0,
        } : state.activity,
        btnLoading: rowData.btnLoading ?? false,
      }

      // Quick shallow compare to prevent redundant updates creating a render loop
      if (
        task.block !== state.block ||
        task.lot !== state.lot ||
        task.actTerm !== state.actTerm ||
        task.timeIn !== state.timeIn ||
        task.timeOut !== state.timeOut ||
        task.constructionIndex !== state.constructionIndex ||
        task.btnLoading !== state.btnLoading
      ) {
        dispatch({ type: 'SET_ROW_DATA', payload: { task: task } });
      }
    }
  }, [rowData]) //external updates without double-rendering on mount

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
      handleUpdateTaskAdmin(workerId, row, {
        taskCode: val.code,
        taskDescription: val.description,
        budget: val.budget,
        accumulated_hours: val.accumulated_hours
      });
      // handleUpdateTaskAdmin(workerId, row, 'actTerm', val.description);
      dispatch({ type: 'SET_ACTIVITY', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleDeleteTaskActivity = useCallback(
    () => {
      const _rn = rn || null;
      handleDeleteTask(workerId, row, _rn);
    },
    [handleDeleteTask, workerId, row]
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
      if (!block || !lot) return null;
      return {
        username: params.username,
        constructionIndex: constructionIndex,
        system: 'NOAH_PAAPDC',
        phaseCode: params.phaseCode,
        model: lotObject?.model || "",
        lot: lotObject?.lot_type || "",
        block: block,
        lot_no: lotObject?.code || lot,
      }
    },
    [lotObject, block, lot, params, constructionIndex]
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
    if (!budgetHours) return false;
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

  const handleManageUpdateTaskEntry = useCallback(() => {
    console.log(rn);
  }, [])

  return (
    <Table.Tr style={{ pointerEvents: (rn && control == 'UPDATE') || (!rn && control == "ADD") && 'auto' }} bg={isOverlapping ? "red.1" : "transparent"} >
      < Table.Td >
        <NativeSelect
          disabled={(rn && (control == "ADD" || control == "DELETE"))}
          value={constructionIndex}
          data={CONSTRUCTION_TYPES}
          onChange={handleSelectConstruction}
        />
      </Table.Td >

      <Table.Td>
        <BlockSelect
          readOnly={(rn && (control == "ADD" || control == "DELETE"))}
          value={block}
          params={blockParams}
          onChange={handleSelectBlock}
        />
      </Table.Td>

      <Table.Td>
        <TaskColumnLotComboBox
          readOnly={(rn && (control == "ADD" || control == "DELETE"))}
          lot={lot}
          params={lotParams}
          onChange={handleSelectLot}
        />
      </Table.Td>

      <Table.Td>
        <Stack gap={10}>
          <TaskColumnActivities
            readOnly={(rn && (control == "ADD" || control == "DELETE"))}
            term={actTerm}
            onChange={handleSelectActivity}
            params={activityParams}
          />
          {(constructionIndex !== 'other-task') && (justification) && (
            <TextInput
              readOnly={(rn && (control == "ADD" || control == "DELETE"))}
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
              size="sm" ff="monospace" >{accumulatedHours}</Text>
          </Tooltip>
          <Tooltip label="Budget Hours">
            <Text
              style={{
                fontSize: !isRowOverbudget ? "18px" : "14px",
                fontWeight: !isRowOverbudget ? "800" : "500",
                transition: "all 0.3s ease"
              }}
              size="md">/{budgetHours}</Text>
          </Tooltip>

        </Group>
      </Table.Td>

      <Table.Td>
        <DateTimeIn
          readOnly={(rn && (control == "ADD" || control == "DELETE"))}
          timeIn={timeIn} onChange={handleTimeIn} />
      </Table.Td>

      <Table.Td>
        <DateTimeOut
          readOnly={(rn && (control == "ADD" || control == "DELETE"))}
          timeOut={timeOut} onChange={handleTimeOut} />
      </Table.Td>

      <Table.Td>
        {
          (control == "ADD" && rn) || (control == "ADD") || (rn && control == "UPDATE") ? (
            <Tooltip label={control == "ADD" || !rn ? "Save" : "Update"}>
              <ActionIcon
                disabled={
                  control == "ADD" ?
                    (!lotObject || !activity || !timeIn || !timeOut || !block || !lot || (isRowOverbudget && constructionIndex !== 'other-task' && !justification) || isOverlapping) :
                    budgetHours <= 0 ? true : false
                }
                loading={btnLoading}
                onClick={control == "ADD" ? handleManageTaskEntry : handleManageUpdateTaskEntry} size={32}>
                <CheckIcon size={20} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label={"DELETE"}>
              <ActionIcon onClick={handleDeleteTaskActivity} variant="light" color="red" loading={btnLoading} size={32}>
                <TrashIcon size={18} />
              </ActionIcon>
            </Tooltip>
          )
        }
      </Table.Td>
    </Table.Tr >
  );
});

export default TaskRowSub;
