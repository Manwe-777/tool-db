import { ToolDbStore } from "../types/tooldb";

export default function leveldb(dbName = "tooldb"): ToolDbStore {
  const level = require("level");
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
    db = level(dbName);
  };
  store.start();

  store.put = function (key, data, cb) {
    db.put(key, data, function (err: any) {
      if (err) {
        if (cb) cb(err);
      } else {
        if (cb) cb(false);
      }
    });
  };

  store.get = function (key, cb) {
    // console.warn("store get", key);
    if (!db) {
      setTimeout(function () {
        store.get(key, cb);
      }, 9);
      return;
    }
    db.get(key, function (err: any, value: any) {
      if (err) {
        if (cb) cb(err);
      } else {
        if (cb) cb(false, value);
      }
    });
  };

  store.query = function (key) {
    console.log("QUERY", key);
    return new Promise((resolve, reject) => {
      try {
        const array: string[] = [];
        db.createKeyStream({
          gte: key,
          lte: key + "\uffff",
        })
          .on("data", function (data: string) {
            // if (data.startsWith(key)) {
            array.push(data);
            // }
          })
          .on("error", function (err: any) {
            reject(err);
          })
          .on("close", function () {
            resolve(array);
          });
      } catch (error) {
        reject(error);
      }
    });
  };

  return store;
}
