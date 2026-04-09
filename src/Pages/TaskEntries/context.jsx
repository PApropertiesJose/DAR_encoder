import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { dbToJson, saveDB } from "~/utils/dbHelper";
import DatabaseService from "~/hooks/Database";

const TaskContext = createContext(null);


export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within the TaskProvider");
  }
  return context;
}

const TaskProvider = ({ children }) => {
  const { phaseCode } = useParams();
  const [database, setDatabase] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [adminTasks, setAdminTask] = useState([]);
  const [segmentedControl, setSegmentedControl] = useState("ADD");
  const [selectedDate, setSelectedDate] = useState();

  useEffect(() => {
    let dbInstance;

    async function initDB() {
      try {
        const _db = await DatabaseService.init();
        dbInstance = new DatabaseService(_db);
        setDatabase(dbInstance);
        setIsDbReady(true);
      } catch (err) {
        console.error(err);
      }
    }

    initDB();

    return () => {
      if (dbInstance) dbInstance.db.close();
    };
  }, []);

  const handleSelectDate = useCallback((val) => {
    setSelectedDate(val);
  }, []);

  const handleChangeSegmentedControl = useCallback((val) => {
    setSegmentedControl(val);
  }, []);

  const handleAddAdmin = useCallback(async (val) => {
    const exists = adminTasks.some(item => item.adminWorker === val.id);
    if (exists) return;

    const newAdmin = {
      adminWorker: val.id,
      name: val.name,
      system: val.system,
      phaseCode: phaseCode,
      group: val.groups,
      tasks: [],
    };

    setAdminTask((prevState) => [...prevState, newAdmin]);

  }, [phaseCode]); // Added adminTasks and db as dependencies

  const handleUpdateTaskAdmin = useCallback((workerId, taskIndex, key, column) => {
    setAdminTask((prevState) => {
      return prevState.map((admin) => {
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
      });
    });
  }, []);

  useEffect(() => {
    console.log(adminTasks);
  }, [adminTasks])

  const handleAddTaskAdmin = useCallback((val) => {
    setAdminTask((prevState) => {
      return prevState.map((admin) => {
        // If this isn't the admin we're looking for, return the original reference
        if (admin.adminWorker !== val.adminWorker) {
          return admin;
        }

        // If it IS the admin, create a new object reference for this one only
        return {
          ...admin,
          tasks: [...(admin.tasks ?? []), { category: 'HOUSEUNIT' }]
        };
      });
    });
  }, []);

  const contextValue = useMemo(() => ({
    adminActivities: adminTasks,
    handleAddAdmin,
    handleChangeSegmentedControl,
    segmentedControl,
    handleAddTaskAdmin,
    database,
    handleSelectDate,
    selectedDate,
    handleUpdateTaskAdmin,

  }), [
    adminTasks,
    handleAddAdmin,
    handleChangeSegmentedControl,
    segmentedControl,
    handleAddTaskAdmin,
    database,
    handleSelectDate,
    selectedDate,
    handleUpdateTaskAdmin,
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
}

export default TaskProvider;
