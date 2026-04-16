import { createContext, useContext, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { createStore, useStore } from "zustand";
import { dbToJson, saveDB } from "~/utils/dbHelper";
import DatabaseService from "~/hooks/Database";
import useTaskDeleteMutation from "~/hooks/TaskEntries/useTaskDeleteMutation";
import useAuth from "~/hooks/Auth/useAuth";
import { notifications } from "@mantine/notifications";
import useManageTaskUpdateMutation from "~/hooks/TaskEntries/useManamgeTaskUpdateMutation";

const TaskContext = createContext(null);

export function useTaskContext(selector) {
  const store = useContext(TaskContext);
  if (!store) {
    throw new Error("useTaskContext must be used within the TaskProvider");
  }
  return useStore(store, selector);
}

const TaskProvider = ({ children }) => {
  const { phaseCode } = useParams();
  const deleteTaskMutate = useTaskDeleteMutation();
  const manageTaskUpdateMutate = useManageTaskUpdateMutation();
  const { user } = useAuth();

  const storeRef = useRef();
  if (!storeRef.current) {
    storeRef.current = createStore((set, get) => ({
      database: null,
      isDbReady: false,
      rawAdmins: [], // raw results
      adminActivities: [],
      segmentedControl: "ADD",
      selectedDate: null,

      handleSelectDate: (val) => {
        set({ selectedDate: val, adminActivities: [] })
      },
      handleChangeSegmentedControl: (val) => set({ segmentedControl: val }),

      handlePopulateAdmin: (val) => {
        const _admins = val.map((admin) => {
          return {
            code: admin.code,
            adminWorker: admin.adminWorker,
            name: admin.name,
            system: admin.system,
            phaseCode: admin.phaseCode,
            group: admin.group,
            control: "ADD",
            tasks: admin.tasks,
          }
        })

        set(() => ({
          adminActivities: _admins,
          rawAdmins: _admins
        }));
      },

      handleAddAdmin: (val) => {
        const { adminActivities } = get();
        const exists = adminActivities.some(item => item.adminWorker === val.id);
        if (exists) return;

        const newAdmin = {
          code: "",
          adminWorker: val.id,
          name: val.name,
          system: val.system,
          phaseCode: phaseCode,
          group: val.groups,
          control: "ADD",
          tasks: [],
        };

        set({ adminActivities: [...adminActivities, newAdmin], rawAdmins: [...adminActivities, newAdmin] });
      },

      handleUpdateTaskAdmin: (workerId, taskIndex, key, column) => {
        set((state) => ({
          adminActivities: state.adminActivities.map((admin) => {
            if (admin.adminWorker !== workerId) {
              return admin;
            }

            return {
              ...admin,
              tasks: admin.tasks.map((task, index) => {
                if (index !== taskIndex) {
                  return task;
                }

                const updates = typeof key === 'object' ? key : { [key]: column };

                return {
                  ...task,
                  ...updates
                };
              })
            };
          })
        }));
      },

      handleManageUpdateTask: (workerId, rn, task) => {
        if (!rn) return;
        const request = {
          "rn": rn,
          "category": task.constructionIndex,
          "blk": task.block,
          "lot": task.lot,
          "taskCode": task.activity.code,
          "taskDescription": task.activity.description,
          "dateTimeIn": task.timeIn,
          "dateTimeOut": task.timeOut,
          "justification": task.justification
        }

        manageTaskUpdateMutate.mutate(request, {
          onSuccess: () => {
            notifications.show({
              color: 'green',
              title: 'Task Updated Successfully',
              message: 'Task has been updated successfully',
            })
          },
          onError: () => {
            notifications.show({
              color: 'red',
              title: 'Task Update Failed',
              message: 'Task has not been updated successfully',
            })
          }
        })
      },

      handleDeleteTask: (workerId, taskIndex, rn) => {
        const removeTaskFromState = (predicate) => {
          set((state) => ({
            adminActivities: state.adminActivities.map((admin) =>
              admin.adminWorker !== workerId
                ? admin
                : { ...admin, tasks: admin.tasks.filter(predicate) }
            ),
          }));
        };

        // No rn means task is local/unsaved — remove by index only
        if (rn === null) {
          removeTaskFromState((_, index) => index !== taskIndex);
          return;
        }

        const params = {
          username: user?.username,
          rn,
        };

        deleteTaskMutate.mutate(params, {
          onSuccess: () => {
            notifications.show({
              color: "green",
              title: "Task Deleted",
              message: "Task has been deleted successfully",
            });
            removeTaskFromState((item) => item.rn !== rn);
          },
          onError: () => {
            notifications.show({
              color: "red",
              title: "Task Deletion Failed",
              message: "Task has not been deleted successfully",
            });
          },
        });
      },

      handleAddTaskAdmin: (val) => {
        set((state) => ({
          adminActivities: state.adminActivities.map((admin) => {
            if (admin.adminWorker !== val.adminWorker) {
              return admin;
            }

            return {
              ...admin,
              tasks: [...(admin.tasks ?? []), { category: 'house-unit', rn: "", justification: "" }]
            };
          })
        }));
      }
    }));
  }

  return (
    <TaskContext.Provider value={storeRef.current}>
      {children}
    </TaskContext.Provider>
  );
}

export default TaskProvider;
