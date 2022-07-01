import { ToolDb } from "..";

export default class ToolDbStorageAdapter {
  private _tooldb: ToolDb;

  get tooldb() {
    return this._tooldb;
  }

  constructor(db: ToolDb) {
    this._tooldb = db;
  }

  put(key: string, data: string): Promise<unknown> {
    return Promise.resolve();
  }

  get(key: string): Promise<string> {
    return Promise.resolve("");
  }

  query(key: string): Promise<string[]> {
    return Promise.resolve([]);
  }
}
