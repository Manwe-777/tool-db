import { ToolDb, ToolDbStorageAdapter } from "tool-db";

export default class ToolDbIndexedb extends ToolDbStorageAdapter {
  private database: IDBDatabase | undefined;
  private readyPromise: Promise<void>;
  private resetInterval: NodeJS.Timeout;

  private dbStart() {
    return new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(this.storageName, 1);
      open.onupgradeneeded = (eve: any) => {
        eve.target.result.createObjectStore(this.storageName);
      };
      open.onsuccess = () => {
        this.database = open.result;
        resolve();
      };
      open.onerror = (eve) => {
        this.tooldb.logger(eve || 1);
        reject(eve);
      };
    });
  }

  constructor(db: ToolDb, forceStorageName?: string) {
    super(db, forceStorageName);

    this.readyPromise = this.dbStart();

    // reset webkit bug? - Periodically reset database connection
    // Use event-based promise update instead of just calling dbStart
    this.resetInterval = setInterval(async () => {
      if (this.database) {
        this.database.close();
      }
      this.readyPromise = this.dbStart();
      await this.readyPromise;
    }, 1000 * 15);
  }

  private async waitForReady() {
    await this.readyPromise;
  }

  public async put(key: string, data: string) {
    await this.waitForReady();
    
    return new Promise((resolve, reject) => {
      if (!this.database) {
        reject(new Error("Database not ready"));
        return;
      }
      const tx = this.database.transaction([this.storageName], "readwrite");
      const obj = tx.objectStore(this.storageName);
      const req = obj.put(data, "" + key);

      req.onsuccess =
        // obj.onsuccess =
        // tx.onsuccess =
        () => {
          resolve(true);
        };
      // req.onabort =
      //   obj.onabort =
      //   tx.onabort =
      //     (eve: any) => {
      //       reject(eve || "put.tx.abort");
      //     };
      req.onerror =
        // obj.onerror =
        tx.onerror = (eve: any) => {
          reject(eve || "put.tx.error");
        };
    });
  }

  public async get(key: string) {
    await this.waitForReady();
    
    return new Promise<string>((resolve, reject) => {
      if (!this.database) {
        reject(new Error("Database not ready"));
        return;
      }
      const tx = this.database.transaction([this.storageName], "readonly");
      const obj = tx.objectStore(this.storageName);
      const req = obj.get("" + key);
      req.onsuccess = () => {
        resolve(req.result);
      };
      // req.onabort = (eve: any) => {
      //   reject(eve || 4);
      // };
      req.onerror = (eve: any) => {
        reject(eve || 5);
      };
    });
  }

  public async query(key: string) {
    await this.waitForReady();
    
    return new Promise<string[]>((resolve, reject) => {
      if (!this.database) {
        reject(new Error("Database not ready"));
        return;
      }
      try {
        const keyRange = IDBKeyRange.bound(key, key + "|", true, true);

        const tx = this.database.transaction([this.storageName], "readonly");
        const obj = tx.objectStore(this.storageName);

        const keysArray: string[] = [];
        obj.openCursor(keyRange).onsuccess = function (event: any) {
          const cursor = event.target.result;
          if (cursor) {
            keysArray.push(event.target.result.key);
            cursor.continue();
          } else {
            resolve(keysArray);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }
}
