export const DB_VERSION = 5;

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
    units: { keyPath: 'block' },
    // Activities grouped by construction index, keyed by `${phase}::${constructionIndex}`
    activities: { keyPath: 'id' },
  }
};
