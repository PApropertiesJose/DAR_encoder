import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import initSqlJs from "sql.js";
import { dbToJson } from "~/utils/dbHelper";

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
  const [db, setDb] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);

  const [adminTasks, setAdminTask] = useState([]);
  const [segmentedControl, setSegmentedControl] = useState("ADD");

  // --- 1. Initialize SQL.js on Mount ---
  useEffect(() => {
    async function initDB() {
      try {
        const SQL = await initSqlJs({
          // Assumes sql-wasm.wasm is in your /public folder
          locateFile: (file) => `/DAR/${file}`,
        });

        const newDb = new SQL.Database();

        newDb.run(`create table IF NOT EXISTS task_entry_hdr ( id INTEGER PRIMARY KEY, adminWorker text, name text, system text DEFAULT 'NOAH_PAAPDC', phaseCode text, dateTimeIn text, ldb_created_date default current_timestamp, rec_user text, synch_date text )`);

        setDb(newDb);
        setIsDbReady(true);
      } catch (err) {
        throw new Error(err);
      }
    }
    initDB();

    return () => {
      if (db) db.close();
    };
  }, []);

  //fetch the data from local
  useEffect(() => {
    if (!db) return;
    const result = db.exec("SELECT * FROM task_entry_hdr");
    const items = dbToJson(result);
    // console.log(items);
    setAdminTask(items);
  }, [db]);


  const handleChangeSegmentedControl = useCallback((val) => {
    const result = db?.exec("SELECT * FROM task_entry_hdr")
    const items = dbToJson(result);
    console.log(items);
    setSegmentedControl(val);
  }, [db]);

  const handleAddAdmin = useCallback((val) => {
    const exists = adminTasks.some(item => item.id === val.id);
    if (exists) return;

    const newAdmin = {
      id: val.id,
      name: val.name,
      system: val.system,
      phaseCode: phaseCode,
      group: val.groups,
      tasks: [],
    };

    try {
      db?.run(
        `INSERT INTO task_entry_hdr(adminWorker, name, phaseCode, rec_user) VALUES(?, ?, ?, ?)`,
        [newAdmin.id, newAdmin.name, phaseCode, 'jmdelacruz']
      );

      // 3. Update React state only after successful DB insertion
      setAdminTask((prevState) => [...prevState, newAdmin]);
    } catch (error) {
      console.error("Failed to insert admin task:", error);
    }
  }, [db, phaseCode, adminTasks]); // Added adminTasks and db as dependencies

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

  // ✅ THE CRITICAL FIX: Memoize the context value
  const contextValue = useMemo(() => ({
    adminActivities: adminTasks,
    handleAddAdmin,
    handleChangeSegmentedControl,
    segmentedControl,
    handleAddTaskAdmin,
    db
  }), [
    adminTasks,
    handleAddAdmin,
    handleChangeSegmentedControl,
    segmentedControl,
    handleAddTaskAdmin,
    db
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
}

export default TaskProvider;
