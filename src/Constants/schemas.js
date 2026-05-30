export const DB_VERSION = 2;

export const DB_SCHEMA = {
  stores: {
    projects: { keyPath: 'code' },
    admins: { keyPath: 'id' },
    currentPhaseData: { keyPath: 'id', autoIncrement: true },
    taskEntries: { keyPath: 'id', autoIncrement: true },
    sheetRows: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'byPhaseDate', keyPath: ['phaseCode', 'date'] },
      ],
    },
  }
};
