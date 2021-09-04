"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var _1 = require(".");
/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param onRemote Weter or not to trigger on additional remote responses if data was found locally before that.
 * @returns Promise<Data>
 */
function toolDbGet(key, userNamespaced, timeoutMs) {
    var _this = this;
    if (userNamespaced === void 0) { userNamespaced = false; }
    if (timeoutMs === void 0) { timeoutMs = 3000; }
    return new Promise(function (resolve, reject) {
        var _a, _b;
        if (userNamespaced && ((_a = _this.user) === null || _a === void 0 ? void 0 : _a.pubKey) === undefined) {
            reject(new Error("You are not authorized yet!"));
            return;
        }
        var finalKey = userNamespaced ? "~" + ((_b = _this.user) === null || _b === void 0 ? void 0 : _b.pubKey) + "." + key : key;
        axios_1.default
            .get(_this.host + "/api/get?key=" + encodeURIComponent(finalKey), {
            timeout: timeoutMs,
            headers: {
                "content-type": "application/x-www-form-urlencoded;charset=utf-8",
            },
        })
            .then(function (value) {
            if (value.data === null)
                resolve(null);
            else {
                return (0, _1.verifyMessage)(value.data)
                    .then(function () {
                    resolve(value.data.value);
                })
                    .catch(reject);
            }
        })
            .catch(reject);
    });
}
exports.default = toolDbGet;
//# sourceMappingURL=toolDbGet.js.map