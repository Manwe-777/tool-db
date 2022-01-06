import { ToolDbStore } from "../types/tooldb";

export default function indexedb(dbName = "tooldb"): ToolDbStore {
  let db: any = null;

  const store = {
    start: () => {
      //
    },
    put: (
      key: string,
      data: string,
      callback: (err: any | null, data?: string) => void
    ) => {
      //
    },
    get: (key: string, callback: (err: any | null, data?: string) => void) => {
      //
    },
    query: (key: string) => Promise.resolve<string[]>([]),
  };

  store.start = function () {
    // console.warn("store start");
    const open = indexedDB.open(dbName, 1);
    open.onupgradeneeded = function (eve: any) {
      eve.target.result.createObjectStore(dbName);
    };
    open.onsuccess = function () {
      db = open.result;
    };
    open.onerror = function (eve) {
      console.warn(eve || 1);
    };
  };
  store.start();

  store.put = function (key, data, cb) {
    // console.warn("store put", key);
    if (!db) {
      setTimeout(function () {
        store.put(key, data, cb);
      }, 1);
      return;
    }
    const tx = db.transaction([dbName], "readwrite");
    const obj = tx.objectStore(dbName);
    const req = obj.put(data, "" + key);
    if (cb) {
      req.onsuccess =
        obj.onsuccess =
        tx.onsuccess =
          () => {
            cb(false);
          };
      req.onabort =
        obj.onabort =
        tx.onabort =
          (eve: any) => {
            cb(eve || "put.tx.abort");
          };
      req.onerror =
        obj.onerror =
        tx.onerror =
          (eve: any) => {
            cb(eve || "put.tx.error");
          };
    }
  };

  store.get = function (key, cb) {
    // console.warn("store get", key);
    if (!db) {
      setTimeout(function () {
        store.get(key, cb);
      }, 9);
      return;
    }
    const tx = db.transaction([dbName], "readonly");
    const obj = tx.objectStore(dbName);
    const req = obj.get("" + key);
    req.onsuccess = function () {
      cb(false, req.result);
    };
    req.onabort = function (eve: any) {
      cb(eve || 4);
    };
    req.onerror = function (eve: any) {
      cb(eve || 5);
    };
  };

  store.query = function (key: string) {
    return new Promise((resolve, reject) => {
      try {
        const keyRange = IDBKeyRange.bound(key, key + "|", true, true);

        const tx = db.transaction([dbName], "readonly");
        const obj = tx.objectStore(dbName);

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
  };

  setInterval(function () {
    db && db.close();
    db = null;
    store.start();
  }, 1000 * 15); // reset webkit bug?

  return store;
}
