import { create } from 'zustand';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export const useTaskEntryStore = create((set) => ({
  adminIds: [],
  admins: {},
  taskIdsByAdmin: {},
  tasks: {},

  handlePopulateAdmin: (adminsData) => {
    const adminIds = [];
    const admins = {};
    const taskIdsByAdmin = {};
    const tasks = {};

    adminsData.forEach(admin => {
      adminIds.push(admin.adminWorker);
      admins[admin.adminWorker] = {
        code: admin.code,
        adminWorker: admin.adminWorker,
        name: admin.name,
        system: admin.system,
        phaseCode: admin.phaseCode,
        group: admin.group,
      };

      const adminTasks = admin.tasks || [];
      const taskIds = [];

      adminTasks.forEach((t) => {
        const taskId = generateId();
        taskIds.push(taskId);
        tasks[taskId] = {
           rn: t.rn,
           constructionIndex: t.category?.toLowerCase().replace('_', '-') || 'house-unit',
           block: t.block ?? t.blk ?? null,
           lot: t.lot ?? null,
           lotObject: t.lotObject ?? null,
           timeIn: t.timeIn ?? t.dateTimeIn ?? null,
           timeOut: t.timeOut ?? t.dateTimeOut ?? null,
           actTerm: t.taskDescription ?? t.actTerm ?? null,
           justification: t.justification ?? "",
           activity: t.taskCode ? {
             code: t.taskCode,
             description: t.taskDescription,
             budget: t.budget ?? 0,
             accumulated_hours: t.accumulated_hours ?? 0,
           } : null,
           btnLoading: t.btnLoading ?? false,
        };
      });

      taskIdsByAdmin[admin.adminWorker] = taskIds;
    });

    set({ adminIds, admins, taskIdsByAdmin, tasks });
  },

  handleAddTaskAdmin: ({ adminWorker }) => {
    const taskId = generateId();
    set(state => ({
      taskIdsByAdmin: {
        ...state.taskIdsByAdmin,
        [adminWorker]: [...(state.taskIdsByAdmin[adminWorker] || []), taskId]
      },
      tasks: {
        ...state.tasks,
        [taskId]: {
          rn: null,
          constructionIndex: 'house-unit',
          block: null,
          lot: null,
          lotObject: null,
          timeIn: null,
          timeOut: null,
          actTerm: null,
          justification: "",
          activity: null,
          btnLoading: false,
        }
      }
    }));
  },

  handleUpdateTask: (taskId, key, value) => {
    set(state => {
      const updates = typeof key === 'object' ? key : { [key]: value };
      return {
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...state.tasks[taskId],
            ...updates
          }
        }
      }
    });
  },

  handleDeleteLocalTask: (workerId, taskId) => {
    set(state => {
      const newTaskIds = (state.taskIdsByAdmin[workerId] || []).filter(id => id !== taskId);
      const newTasks = { ...state.tasks };
      delete newTasks[taskId];

      return {
        taskIdsByAdmin: {
          ...state.taskIdsByAdmin,
          [workerId]: newTaskIds
        },
        tasks: newTasks
      }
    });
  }
}));
