import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useParams } from "react-router";

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
  const [adminTasks, setAdminTask] = useState([]);
  const [segmentedControl, setSegmentedControl] = useState("ADD");

  const handleChangeSegmentedControl = useCallback((val) => {
    setSegmentedControl(val);
  }, []);

  const handleAddAdmin = useCallback((val) => {
    setAdminTask((prevState) => {
      const exists = prevState.some(item => item.id === val.id);
      if (exists) return prevState;

      const newAdmin = {
        id: val.id,
        name: val.name,
        system: val.system,
        phaseCode: phaseCode, 
        group: val.groups,
        tasks: [],
      };

      return [...prevState, newAdmin];
    });
  }, [phaseCode]); // ✅ ADDED: phaseCode must be a dependency

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
    handleAddTaskAdmin
  }), [
    adminTasks, 
    handleAddAdmin, 
    handleChangeSegmentedControl, 
    segmentedControl, 
    handleAddTaskAdmin
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
}

export default TaskProvider;
