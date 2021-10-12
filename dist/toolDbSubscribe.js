"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require(".");
/**
 * Subscribe to all PUT updates for this key.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @returns Promise<Data>
 */
function toolDbSubscribe(key, userNamespaced) {
    var _this = this;
    if (userNamespaced === void 0) { userNamespaced = false; }
    return new Promise(function (resolve, reject) {
        var _a, _b;
        if (userNamespaced && ((_a = _this.user) === null || _a === void 0 ? void 0 : _a.pubKey) === undefined) {
            reject(new Error("You are not authorized yet!"));
            return;
        }
        var finalKey = userNamespaced ? ":" + ((_b = _this.user) === null || _b === void 0 ? void 0 : _b.pubKey) + "." + key : key;
        if (_this.options.debug) {
            console.log("Subscribe > " + finalKey);
        }
        var msgId = (0, _1.textRandom)(10);
        _this.websockets.send({
            type: "subscribe",
            key: finalKey,
            id: msgId,
        });
        resolve();
    });
}
exports.default = toolDbSubscribe;
//# sourceMappingURL=toolDbSubscribe.js.map