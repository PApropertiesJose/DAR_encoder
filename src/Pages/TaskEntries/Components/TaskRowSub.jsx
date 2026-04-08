import {
  Badge, Select, NativeSelect, Tooltip, Table,
  ActionIcon, Loader, Text, ThemeIcon
} from '@mantine/core';
import { ChevronDown, Pen } from 'lucide-react';
import { useParams } from 'react-router';
import { memo, useCallback, useMemo, useReducer } from 'react';
import useAuth from '~/hooks/Auth/useAuth';
import useFetchBlock from '~/hooks/Filters/useFetchBlockMutation';
import TaskColumnActivities from './TaskColumnActivities';
import DateTimeIn from './DateTimeIn';
import DateTimeOut from './DateTimeOut';
import { computeHoursPerActivity } from '~/utils';
import TaskColumnLotComboBox from './TaskColumnLotComboBox';

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
  params
}) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const {
    constructionIndex, block, lot, lotObject,
    timeIn, timeOut, actTerm,
  } = state;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectConstruction = useCallback(
    (e) => dispatch({ type: 'SET_CONSTRUCTION', payload: e.currentTarget.value }),
    []
  );

  const handleSelectBlock = useCallback(
    (val) => dispatch({ type: 'SET_BLOCK', payload: val }),
    []
  );

  const handleSelectLot = useCallback(
    (val) => dispatch({ type: 'SET_LOT', payload: val }),
    []
  );

  const handleTimeIn = useCallback(
    (val) => dispatch({ type: 'SET_TIME_IN', payload: val }),
    []
  );

  const handleTimeOut = useCallback(
    (val) => dispatch({ type: 'SET_TIME_OUT', payload: val }),
    []
  );

  const handleSelectActivity = useCallback(
    (val) => dispatch({ type: 'SET_ACTIVITY', payload: val }),
    []
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

  const activityParams = useMemo(
    () => {
      if(!block || !lotObject) return null;
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

  return (
    <Table.Tr>
      <Table.Td>
        <NativeSelect
          value={constructionIndex}
          data={CONSTRUCTION_TYPES}
          onChange={handleSelectConstruction}
        />
      </Table.Td>

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
        <TaskColumnActivities
          term={actTerm}
          onChange={handleSelectActivity}
          params={activityParams}
        />
      </Table.Td>

      <Table.Td>
        <Tooltip label="Hours">
          <Text size="xs" ff="monospace">{hoursPerActivity}/hrs</Text>
        </Tooltip>
      </Table.Td>

      <Table.Td>
        <DateTimeIn value={timeIn} onChange={handleTimeIn} />
      </Table.Td>

      <Table.Td>
        <DateTimeOut value={timeOut} onChange={handleTimeOut} />
      </Table.Td>

      <Table.Td>
        <Tooltip label="Save">
          <ActionIcon variant="light" size={32}>
            <Pen size={12} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  );
});

export default TaskRowSub;
