import { openDB } from "idb";
import initSqlJs from "sql.js";

class DatabaseService {

  constructor(db) {
    this.db = db;
  }

  static async init() {
    const SQL = await initSqlJs({
      // Assumes sql-wasm.wasm is in your /public folder
      locateFile: (file) => `/DAR/${file}`,
    });

    const idb = await openDB("MyDatabase", 1, {
      upgrade(db) {
        db.createObjectStore("files");
      },
    });

    const saved = await idb.get("files", "sqlite-db");

    const newDb = saved
      ? new SQL.Database(saved)
      : new SQL.Database()

    newDb.run(`create table IF NOT EXISTS task_entry_hdr ( id INTEGER PRIMARY KEY, adminWorker text, name text, system text DEFAULT 'NOAH_PAAPDC', phaseCode text, dateTimeIn text, ldb_created_date default current_timestamp, rec_user text, synch_date text )`);

    return newDb;
  }

  savedDb = async () => {
    if (!this.db) return;
    const idb = await openDB("MyDatabase", 1);
    const data = this.db.export();

    await idb.put("files", data, "sqlite-db");
  }

  dbToJson = (result) => {
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
    return []
  }



}

export default DatabaseService;
