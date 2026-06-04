import { createContext, useCallback, useContext, useMemo, useState } from 'react'

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

  return (
    <PasaPayrollContext.Provider value={{
      handleChangeRate,
      adminRate
    }}>
      {children}
    </PasaPayrollContext.Provider>
  )
}

export default PasaPayrollProvider


