import { ToolDb } from "..";

export default class ToolDbStorageAdapter {
  private _tooldb: ToolDb;

  private _forceStorageName: string | undefined;

  /**
   * Promise that resolves when the storage adapter is ready for operations.
   * Subclasses should set this in their constructor.
   */
  protected _readyPromise: Promise<void> = Promise.resolve();

  /**
   * Public getter for the ready promise.
   * Await this before performing operations if you need to ensure the store is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

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

  /**
   * Wait for the storage adapter to be ready.
   * Called internally by put/get/query operations.
   */
  protected async waitForReady(): Promise<void> {
    await this._readyPromise;
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
