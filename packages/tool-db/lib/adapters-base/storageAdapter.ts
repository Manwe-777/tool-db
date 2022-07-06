import { ToolDb } from "..";

export default class ToolDbStorageAdapter {
  private _tooldb: ToolDb;

  private _forceStorageName: string | undefined;

  get tooldb() {
    return this._tooldb;
  }

  get storageName() {
    return this._forceStorageName || this._tooldb.options.storageName;
  }

  constructor(db: ToolDb, forceStorageName?: string) {
    this._tooldb = db;

    if (forceStorageName) {
      this._forceStorageName = forceStorageName;
    }
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
