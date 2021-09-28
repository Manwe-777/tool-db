"use strict";
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
function indexedb(dbName) {
    if (dbName === void 0) { dbName = "tooldb"; }
    var db = null;
    var store = {};
    store.start = function () {
        // console.warn("store start");
        var open = indexedDB.open(dbName, 1);
        open.onupgradeneeded = function (eve) {
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
        var tx = db.transaction([dbName], "readwrite");
        var obj = tx.objectStore(dbName);
        var req = obj.put(data, "" + key);
        if (cb) {
            req.onsuccess =
                obj.onsuccess =
                    tx.onsuccess =
                        function () {
                            cb(null);
                        };
            req.onabort =
                obj.onabort =
                    tx.onabort =
                        function (eve) {
                            cb(eve || "put.tx.abort");
                        };
            req.onerror =
                obj.onerror =
                    tx.onerror =
                        function (eve) {
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
        var tx = db.transaction([dbName], "readonly");
        var obj = tx.objectStore(dbName);
        var req = obj.get("" + key);
        req.onsuccess = function () {
            cb(null, req.result);
        };
        req.onabort = function (eve) {
            cb(eve || 4);
        };
        req.onerror = function (eve) {
            cb(eve || 5);
        };
    };
    setInterval(function () {
        db && db.close();
        db = null;
        store.start();
    }, 1000 * 15); // reset webkit bug?
    return store;
}
exports.default = indexedb;
//# sourceMappingURL=indexedb.js.map