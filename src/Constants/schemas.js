export const DB_SCHEMA = {
  stores: {
    projects: { keyPath: 'code' },
    admins: { keyPath: 'id' },
    currentPhaseData: { keyPath: 'id', autoIncrement: true }
  }
};
