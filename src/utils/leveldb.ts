// @ts-nocheck

export default function leveldb(dbName = "tooldb"): {
  start: () => void;
  put: (
    key: string,
    data: any,
    cb: (err: any | null, data?: any) => void
  ) => void;
  get: (key: string, cb: (err: any | null, data?: any) => void) => void;
} {
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
        if (cb) cb(null);
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
        if (cb) cb(null, value);
      }
    });
  };

  return store;
}
