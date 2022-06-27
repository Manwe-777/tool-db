import ToolDbStorageAdapter from "../adapters-base/storageAdapter";
import ToolDb from "../tooldb";

export default class ToolDbIndexedb extends ToolDbStorageAdapter {
  private database: IDBDatabase | undefined;

  private dbStart() {
    const open = indexedDB.open(this.tooldb.options.storageName, 1);
    open.onupgradeneeded = (eve: any) => {
      eve.target.result.createObjectStore(this.tooldb.options.storageName);
    };
    open.onsuccess = () => {
      this.database = open.result;
    };
    open.onerror = (eve) => {
      this.tooldb.logger(eve || 1);
    };
  }

  constructor(db: ToolDb) {
    super(db);

    this.dbStart();

    // reset webkit bug?
    setInterval(() => {
      this.database && this.database.close();
      this.dbStart();
    }, 1000 * 15);
  }

  public put(key: string, data: string) {
    return new Promise((resolve, reject) => {
      if (!this.database) {
        reject();
        return;
      }
      const tx = this.database.transaction(
        [this.tooldb.options.storageName],
        "readwrite"
      );
      const obj = tx.objectStore(this.tooldb.options.storageName);
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

  public get(key: string) {
    return new Promise<string>((resolve, reject) => {
      if (!this.database) {
        reject();
        return;
      }
      const tx = this.database.transaction(
        [this.tooldb.options.storageName],
        "readonly"
      );
      const obj = tx.objectStore(this.tooldb.options.storageName);
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

  public query(key: string) {
    return new Promise<string[]>((resolve, reject) => {
      if (!this.database) {
        reject();
        return;
      }
      try {
        const keyRange = IDBKeyRange.bound(key, key + "|", true, true);

        const tx = this.database.transaction(
          [this.tooldb.options.storageName],
          "readonly"
        );
        const obj = tx.objectStore(this.tooldb.options.storageName);

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
