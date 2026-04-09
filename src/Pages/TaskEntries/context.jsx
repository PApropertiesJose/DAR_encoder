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

  //fetch the data from local
  useEffect(() => {
    if (!database?.db || !selectedDate) return;
    const result = database?.db.exec("SELECT * FROM task_entry_hdr where dateTimeIn = ?", [selectedDate]);
    const items = dbToJson(result);
    setAdminTask(items);
  }, [database?.db, selectedDate]);

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

    try {
      database.db?.run(
        `INSERT INTO task_entry_hdr(adminWorker, name, phaseCode, dateTimeIn, rec_user) VALUES(?, ?, ?, ?, ?)`,
        [newAdmin.adminWorker, newAdmin.name, phaseCode, selectedDate, 'jmdelacruz']
      );

      await database?.savedDb();

      // 3. Update React state only after successful DB insertion
      setAdminTask((prevState) => [...prevState, newAdmin]);

    } catch (error) {
      console.error("Failed to insert admin task:", error);
    }
  }, [database?.db, phaseCode, adminTasks, selectedDate]); // Added adminTasks and db as dependencies

  const handleAddTaskAdmin = useCallback((val) => {
    setAdminTask((prevState) => {
      const index = prevState.findIndex(item => item.id === val.id);
      if (index === -1) return prevState;


      const admin = prevState[index];
      const tasks = admin.tasks ?? [];

      const updatedAdmin = {
        ...admin,
        tasks: [...tasks, { category: 'HOUSEUNIT' }]
      };

      const newState = [...prevState];
      newState[index] = updatedAdmin;

      return newState;
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
    selectedDate

  }), [
    adminTasks,
    handleAddAdmin,
    handleChangeSegmentedControl,
    segmentedControl,
    handleAddTaskAdmin,
    database,
    handleSelectDate,
    selectedDate
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
}

export default TaskProvider;
