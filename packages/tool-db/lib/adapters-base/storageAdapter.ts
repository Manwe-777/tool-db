/**
 * What a storage adapter needs from its owner (a database or a relay)
 */
export interface StorageContext {
  options: { storageName: string };
  logger: (...args: any[]) => void;
}

export default class ToolDbStorageAdapter {
  private _context: StorageContext;

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
    return this._context;
  }

  get storageName() {
    return this._forceStorageName || this._context.options.storageName;
  }

  constructor(context: StorageContext, forceStorageName?: string) {
    this._context = context;

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

  /**
   * Rejects if the key does not exist
   */
  get(key: string): Promise<string> {
    return Promise.reject(new Error("Not found"));
  }

  /**
   * Returns the keys starting with the given prefix
   */
  query(prefix: string): Promise<string[]> {
    return Promise.resolve([]);
  }

  delete(key: string): Promise<unknown> {
    return Promise.resolve();
  }
}
