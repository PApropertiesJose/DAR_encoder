import { createContext, useContext, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { createStore, useStore } from "zustand";
import { dbToJson, saveDB } from "~/utils/dbHelper";
import DatabaseService from "~/hooks/Database";

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
  
  const storeRef = useRef();
  if (!storeRef.current) {
    storeRef.current = createStore((set, get) => ({
      database: null,
      isDbReady: false,
      adminActivities: [],
      segmentedControl: "ADD",
      selectedDate: undefined,
      
      initDB: async () => {
        try {
          const _db = await DatabaseService.init();
          set({ database: new DatabaseService(_db), isDbReady: true });
        } catch (err) {
          console.error(err);
        }
      },
      
      handleSelectDate: (val) => set({ selectedDate: val }),
      handleChangeSegmentedControl: (val) => set({ segmentedControl: val }),
      
      handleAddAdmin: (val) => {
        const { adminActivities } = get();
        const exists = adminActivities.some(item => item.adminWorker === val.id);
        if (exists) return;

        const newAdmin = {
          adminWorker: val.id,
          name: val.name,
          system: val.system,
          phaseCode: phaseCode,
          group: val.groups,
          tasks: [],
        };

        set({ adminActivities: [...adminActivities, newAdmin] });
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

                return {
                  ...task,
                  [key]: column
                };
              })
            };
          })
        }));
      },
      
      handleAddTaskAdmin: (val) => {
        set((state) => ({
          adminActivities: state.adminActivities.map((admin) => {
            if (admin.adminWorker !== val.adminWorker) {
              return admin;
            }

            return {
              ...admin,
              tasks: [...(admin.tasks ?? []), { category: 'HOUSEUNIT' }]
            };
          })
        }));
      }
    }));
  }

  useEffect(() => {
    storeRef.current.getState().initDB();
  }, []);

  return (
    <TaskContext.Provider value={storeRef.current}>
      {children}
    </TaskContext.Provider>
  );
}

export default TaskProvider;
