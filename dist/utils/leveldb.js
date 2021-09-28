"use strict";
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
function leveldb(dbName) {
    if (dbName === void 0) { dbName = "tooldb"; }
    var db = null;
    var store = {};
    store.start = function () {
        db = level(dbName);
    };
    store.start();
    store.put = function (key, data, cb) {
        db.put(key, data, function (err) {
            if (err) {
                if (cb)
                    cb(err);
            }
            else {
                if (cb)
                    cb(null);
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
                if (cb)
                    cb(err);
            }
            else {
                if (cb)
                    cb(null, value);
            }
        });
    };
    return store;
}
exports.default = leveldb;
//# sourceMappingURL=leveldb.js.map