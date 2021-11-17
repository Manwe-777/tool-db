// @ts-nocheck
export default function leveldb(dbName = "tooldb"): {
  start: () => void;
  put: (
    key: string,
    data: any,
    cb: (err: any | null, data?: any) => void
  ) => void;
  get: (key: string, cb: (err: any | null, data?: any) => void) => void;
  query: (key: string) => Promise<string[]>;
} {
  const level = require("level");
  let db = null;

  const store = {};

  store.start = function () {
    db = level(dbName);
  };
  store.start();

  store.put = function (key, data, cb) {
    db.put(key, data, function (err) {
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
    db.get(key, function (err, value) {
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
        const array = [];
        db.createKeyStream({
          gte: key,
          lte: key + "\uffff",
        })
          .on("data", function (data: string) {
            // if (data.startsWith(key)) {
            array.push(data);
            // }
          })
          .on("error", function (err) {
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
