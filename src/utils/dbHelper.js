
export const dbToJson = (result) => {
  if (result.length > 0) {
    // sql.js returns [{columns: [], values: [[]]}]
    // We map it to objects to make it easier to use in React
    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      return columns.reduce((obj, col, i) => {
        obj[col] = row[i];
        return obj;
      }, {});
    });

    return rows;
  }

  return [];
}
