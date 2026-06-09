import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import useUpdateStatusPasaPayrollMutation from '~/hooks/Admins/useUpdateStatusPasaPayrollMutation'
import useAuth from '~/hooks/Auth/useAuth'
import { produce } from 'immer'

const HELPER_RATES = { regular: 75.00, overtime: 93.75 }
const SKILLED_RATES = { regular: 87.50, overtime: 109.38 }

const PasaPayrollContext = createContext(null);

export const usePasaPayrollContext = () => {
  const ctx = useContext(PasaPayrollContext);
  if (!ctx) {
    throw new Error("usePasaPayrollContext must be used within PasaPayrollProvider");
  }

  return ctx;
}


const PasaPayrollProvider = ({ children }) => {
  const [rates, setRates] = useState(HELPER_RATES);
  const [name, setName] = useState();
  const [admins, setAdmins] = useState([]);

  const username = useAuth((state) => state.user?.username);
  const { mutate: updateStatus } = useUpdateStatusPasaPayrollMutation();

  const onManagePopulateAdmins = useCallback((items) => {
    setAdmins(items);
  }, [])

  const pasaPayrollAdmins = useMemo(() => {
    return admins;
  }, [admins]);

  const handleUpdateStatusAdmins = useCallback((e, admin) => {
    const isActive = e.target.checked;

    // optimistically update local state
    setAdmins(produce((draft) => {
      const item = draft.find((a) => a.empseriesid === admin.empseriesid);
      if (item) item.is_active = isActive;
    }));

    // persist the change
    updateStatus(
      { empseriesId: admin.empseriesid, username },
      {
        onError: (error) => {
          // revert on failure
          setAdmins(produce((draft) => {
            const item = draft.find((a) => a.empseriesid === admin.empseriesid);
            if (item) item.is_active = !isActive;
          }));
        }
      }
    );
  }, [updateStatus, username]);

  const handleChangeRate = useCallback((position) => {
    setRates(() => {
      if (position.toLowerCase().includes('helper')) {
        return HELPER_RATES
      }

      return SKILLED_RATES
    })
  }, [])

  const adminRate = useMemo(() => {
    return rates;
  }, [rates])

  const handleSearchPasaPayrollName = useCallback((val) => {
    setName(val);
  }, [])

  const pasaPayrollName = useMemo(() => {
    return name ?? "";
  }, [name])

  return (
    <PasaPayrollContext.Provider value={{
      onManagePopulateAdmins,
      pasaPayrollAdmins,

      handleUpdateStatusAdmins,

      handleChangeRate,
      adminRate,

      handleSearchPasaPayrollName,
      pasaPayrollName

    }}>
      {children}
    </PasaPayrollContext.Provider>
  )
}

export default PasaPayrollProvider


