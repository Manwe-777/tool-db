"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
function toolDbGet(key, userNamespaced, timeoutMs) {
    var _this = this;
    if (userNamespaced === void 0) { userNamespaced = false; }
    if (timeoutMs === void 0) { timeoutMs = 1000; }
    return new Promise(function (resolve, reject) {
        var _a, _b;
        if (userNamespaced && ((_a = _this.user) === null || _a === void 0 ? void 0 : _a.pubKey) === undefined) {
            reject(new Error("You are not authorized yet!"));
            return;
        }
        var finalKey = userNamespaced ? ":" + ((_b = _this.user) === null || _b === void 0 ? void 0 : _b.pubKey) + "." + key : key;
        if (_this.debug) {
            console.log("GET > " + finalKey);
        }
        var first = true;
        var timeout = setTimeout(function () {
            resolve(null);
        }, timeoutMs);
        _this.gun.get(finalKey, function (ack) {
            if (ack["@"] || ack.put) {
                var d = ack.put;
                if ((d && first) || (d && !first)) {
                    if (d.v) {
                        try {
                            var data = JSON.parse(d.v);
                            clearTimeout(timeout);
                            resolve(data.value);
                        }
                        catch (e) {
                            console.error(e);
                        }
                    }
                }
                first = false;
            }
        });
    });
}
exports.default = toolDbGet;
//# sourceMappingURL=toolDbGet.js.map