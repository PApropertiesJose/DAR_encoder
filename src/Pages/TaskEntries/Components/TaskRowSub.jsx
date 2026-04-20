import {
  Group, Badge, Select, Stack, NativeSelect, Tooltip, Table,
  ActionIcon, Loader, Text, ThemeIcon,
  TextInput,
  ModalContent
} from '@mantine/core';
import { CheckIcon, ChevronDown, Pen, TrashIcon } from 'lucide-react';
import { useParams } from 'react-router';
import { memo, useCallback, useMemo, useReducer, useState, useEffect, useRef, useLayoutEffect } from 'react';
import useFetchBlock from '~/hooks/Filters/useFetchBlockMutation';
import TaskColumnActivities from './TaskColumnActivities';
import DateTimeIn from './DateTimeIn';
import DateTimeOut from './DateTimeOut';
import { computeHoursPerActivity, isTaskOverlapping, realTimeTrackingOfOverlapHours } from '~/utils';
import TaskColumnLotComboBox from './TaskColumnLotComboBox';
import { useDebouncedState } from '@mantine/hooks';
import useManageTaskEntryMutation from '~/hooks/TaskEntries/useManageTaskEntryMutation';
import { notifications } from '@mantine/notifications';
import { useTaskContext } from '../context';


//TODO: FIX THE UPDATE OF EACH FIELD reset & disabled the save button if it has existing RN which mean it isaved  in the database

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
    case 'RESET':
      return { ...INITIAL_STATE, constructionIndex: action.payload, block: null, lot: null, actTerm: null, activity: null };

    case "SET_ROW_DATA":
      return {
        ...state,
        rn: action.payload.rn,
        constructionIndex: action.payload.category,
        block: action.payload.blk,
        lot: action.payload.lot,
        actTerm: action.payload.taskDescription,
        activity: {
          code: action.payload.taskCode,
          description: action.payload.taskDescription,
          accumulated_hours: action.payload.accumulatedHours,
          budget: action.payload.budget || 0,
        }


        // lotObject: action.payload.task.lotObject !== undefined ? action.payload.task.lotObject : state.lotObject,
        // activity: action.payload.task.activity || state.activity
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
        btnLoading: action.payload
      }

    default:
      return state;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const TaskRowActionButton = memo(({
  control,
  rn,
  isDisabled,
  loading,
  onSave,
  onUpdate,
  onDelete
}) => {
  const showSaveOrUpdate = control === "ADD";

  if (showSaveOrUpdate) {
    const isSave = control === "ADD" || !rn;
    return (
      <Tooltip label={isSave ? "Save" : "Update"}>
        <ActionIcon
          disabled={isDisabled}
          loading={loading}
          onClick={control === "ADD" && onSave}
          size={32}
        >
          <CheckIcon size={20} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={`DELETE id: ${rn}`}>
      <ActionIcon disabled={control === "END"} onClick={onDelete} variant="light" color="red" loading={loading} size={32}>
        <TrashIcon size={18} />
      </ActionIcon>
    </Tooltip>
  );
});

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
  handleManageUpdateTask,
  rowData,
}) => {
  const admins = useTaskContext(state => state.adminActivities);
  const handlePunchListOpenModal = useTaskContext(state => state.handlePunchListOpenModal);
  const [state, dispatch] = useReducer(reducer, rowData);
  const {
    rn, constructionIndex, block, lot, lotObject,
    timeIn, timeOut, actTerm, activity, btnLoading
  } = state;

  useEffect(() => {
    console.log("RERENDERS: ", workerName);
    if (rowData?.rn) {
      dispatch({ type: "SET_ROW_DATA", payload: rowData });
    } else if (rowData?.category) {
      dispatch({ type: 'RESET', payload: 'house-unit' })
      setJustication("");
    }
  }, [rowData])


  const [justification, setJustication] = useDebouncedState(rowData?.justification, 500);
  const taskMutation = useManageTaskEntryMutation();

  // useEffect(() => {
  //   if (justification) {
  //     handleUpdateTaskAdmin(workerId, row, 'justification', justification);
  //   }
  // }, [justification, handleUpdateTaskAdmin, workerId, row]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectConstruction = useCallback(
    (e) => {
      const val = e.currentTarget.value;
      dispatch({ type: 'RESET', payload: val });
      // handleUpdateTaskAdmin(workerId, row, 'category', val);
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleSelectBlock = useCallback(
    (val) => {
      // handleUpdateTaskAdmin(workerId, row, 'block', val);
      dispatch({ type: 'SET_BLOCK', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleSelectLot = useCallback(
    (val) => {
      // handleUpdateTaskAdmin(workerId, row, 'lot', val.code);
      dispatch({ type: 'SET_LOT', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleTimeIn = useCallback(
    (val) => {
      // handleUpdateTaskAdmin(workerId, row, 'timeIn', val);
      dispatch({ type: 'SET_TIME_IN', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleTimeOut = useCallback(
    (val) => {
      // handleUpdateTaskAdmin(workerId, row, 'timeOut', val);
      dispatch({ type: 'SET_TIME_OUT', payload: val })
    },
    [handleUpdateTaskAdmin, workerId, row]
  );

  const handleSelectActivity = useCallback(
    (val) => {
      // handleUpdateTaskAdmin(workerId, row, {
      //   taskCode: val.code,
      //   taskDescription: val.description,
      //   budget: val.budget,
      //   accumulated_hours: val.accumulated_hours
      // });
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
    [handleDeleteTask, workerId, row, rn]
  );

  // ── Derived State ─────────────────────────────────────────────────────────

  const hoursPerActivity = useMemo(
    () => {
      // if (!timeIn && !timeOut) return 0;
      return computeHoursPerActivity({ timeIn: timeIn, timeOut: timeOut, projectedHours: rowData?.projectedHours })
    },
    [timeIn, timeOut]
  );

  const blockParams = params

  const lotParams = useMemo(
    () => ({ ...params, block }),
    [params, block]
  );


  const isOverlapping = useMemo(() => {
    const admin = admins.find((a) => a.adminWorker === workerId);
    if (!admin) return false;
    const hasOverlap = !timeIn || !timeOut ?
      isTaskOverlapping(admin.tasks ?? [], row) :
      realTimeTrackingOfOverlapHours(timeIn, timeOut, admin.tasks)
    return hasOverlap
  }, [timeIn, timeOut])

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
    return (activity.accumulated_hours + parseFloat(hoursPerActivity) - (rowData?.accumulatedHours || 0)).toFixed(2);
  }, [hoursPerActivity, activity?.accumulated_hours]);

  const isRowOverbudget = useMemo(() => {
    if (!budgetHours) return false;
    if (accumulatedHours > budgetHours) return true;
    return false;
  }, [budgetHours, accumulatedHours, hoursPerActivity])

  const handleManageTaskEntry = useCallback(() => {
    const request = {
      rn: rn || null,
      system: "NOAH_PAAPDC",
      phaseCode: params.phaseCode,
      modelCode: lotObject?.model,
      adminId: workerId,
      adminSystem: "HRIS",
      name: workerName,
      position: "",
      code: activity?.code,
      description: activity?.description,
      projected_time_out: timeOut,
      justification: justification,
      timeIn: timeIn,
      category: constructionIndex,
      block: block,
      lot: lot,
      isOt: false, // create a state for identifying ot on hold;
      username: params.username,
      row: row,
      accumulatedHours: activity?.accumulated_hours,
    }

    if (activity?.description === "Punchlist works") {
      handlePunchListManageModal(request);
      return;
    }

    // common erntry process 
    dispatch({ type: "LOADING", payload: true });
    taskMutation.mutate(request, {
      onSuccess: (response) => {
        const _rn = response.data[0]?.rn || null;
        handleUpdateTaskAdmin(workerId, row, {
          rn: _rn,
          blk: block,
          category: constructionIndex,
          dateTimeIn: timeIn,
          dateTimeOut: timeOut,
          justification: justification,
          lot: lot,
          taskCode: activity?.code,
          taskDescription: actTerm,
          accumulatedHours: activity?.accumulated_hours,
        });

        notifications.show({
          color: 'green',
          title: "Successfully saved!",
          message: "Task Entry added!",
        });
      },
      onError: (error) => {
        const errorMessage = error.response.data?.errorMessage ?? error.message;
        notifications.show({
          color: 'red',
          title: "Failed to saved task entry",
          message: errorMessage,
        });
      },
      onSettled: () => {
        dispatch({ type: "LOADING", payload: false });
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

  const handlePunchListManageModal = (request) => {
    const data = {
      ...request,
      "activityParams": activityParams
    }
    handlePunchListOpenModal(data);
  }

  const handleManageUpdateTaskEntry = useCallback(() => {
    handleManageUpdateTask(workerId, rn, { ...state, justification });
  }, [justification])
  // console.log("rerender: ", workerName);

  return (
    <Table.Tr style={{ pointerEvents: (!rn && control == "ADD") && 'auto' }} bg={isOverlapping ? "red.1" : "transparent"} >
      < Table.Td >
        <NativeSelect
          disabled={(rn && (control == "ADD" || control == "DELETE" || control == "END"))}
          value={constructionIndex}
          data={CONSTRUCTION_TYPES}
          onChange={handleSelectConstruction}
        />
      </Table.Td >

      <Table.Td>
        <BlockSelect
          readOnly={(rn && (control == "ADD" || control == "DELETE" || control == "END"))}
          value={block}
          params={blockParams}
          onChange={handleSelectBlock}
        />
      </Table.Td>

      <Table.Td>
        <TaskColumnLotComboBox
          readOnly={(rn && (control == "ADD" || control == "DELETE" || control == "END"))}
          lot={lot}
          params={lotParams}
          onChange={handleSelectLot}
        />
      </Table.Td>

      <Table.Td>
        <Stack gap={10}>
          <TaskColumnActivities
            readOnly={(rn && (control == "ADD" || control == "DELETE" || control == "END"))}
            term={actTerm}
            onChange={handleSelectActivity}
            params={activityParams}
          />
          {/* {(constructionIndex !== 'other-task') && (isRowOverbudget || justification) && ( */}
          {/* {(constructionIndex !== 'other-task') && (isRowOverbudget) &&  ( */}
          {(rowData?.justification) || (constructionIndex !== 'other-task') && (isRowOverbudget) && (
            <TextInput
              readOnly={(rn && (control == "ADD" || control == "DELETE" || control == "END"))}
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
          readOnly={(rn && (control == "ADD" || control == "DELETE" || control == "END"))}
          timeIn={rowData?.dateTimeIn || timeIn} onChange={handleTimeIn} />
      </Table.Td>

      <Table.Td>
        <DateTimeOut
          readOnly={(rn && (control == "ADD" || control == "DELETE" || control == "END"))}
          timeOut={rowData?.dateTimeOut || timeOut} onChange={handleTimeOut} />
      </Table.Td>

      <Table.Td>
        <TaskRowActionButton
          control={control}
          rn={rn}
          loading={btnLoading}
          isDisabled={
            control === "ADD"
              ? rowData?.rn || (!lotObject || !activity || !timeIn || !timeOut || !block || !lot || (isRowOverbudget && constructionIndex !== 'other-task' && !justification) || isOverlapping)
              : (constructionIndex !== 'other-task' && budgetHours <= 0)
          }
          onSave={handleManageTaskEntry}
          onUpdate={handleManageUpdateTaskEntry}
          onDelete={handleDeleteTaskActivity}
        />
      </Table.Td>
    </Table.Tr >
  );
});

export default TaskRowSub;
