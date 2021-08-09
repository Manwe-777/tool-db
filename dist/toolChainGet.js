"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var sha256_1 = __importDefault(require("./utils/sha256"));
/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param onRemote Weter or not to trigger on additional remote responses if data was found locally before that.
 * @returns Promise<Data>
 */
function toolChainGet(key, userNamespaced, timeoutMs, onRemote) {
    var _this = this;
    if (userNamespaced === void 0) { userNamespaced = false; }
    if (timeoutMs === void 0) { timeoutMs = 10000; }
    if (onRemote === void 0) { onRemote = false; }
    var pubKey = "";
    return new Promise(function (resolve, reject) {
        _this.getPubKey()
            .then(function (p) {
            pubKey = p;
        })
            .catch(function (e) {
            if (userNamespaced) {
                reject(e);
            }
        })
            .finally(function () {
            var finalKey = userNamespaced ? "~" + pubKey + "." + key : key;
            var message = {
                hash: sha256_1.default(_this.id + "-" + finalKey),
                source: _this.id,
                type: "get",
                key: finalKey,
            };
            var triggerRemote = function () {
                var timeout = setTimeout(function () { return reject(new Error("Key not found (GET timed out)")); }, timeoutMs);
                _this.listenForKey(key, function (d) {
                    clearTimeout(timeout);
                    resolve(d);
                });
                _this.sendMessage(message);
            };
            _this.dbRead(finalKey)
                .then(function (localData) {
                if (localData) {
                    resolve(localData.value);
                    if (onRemote) {
                        triggerRemote();
                    }
                }
                else {
                    triggerRemote();
                }
            })
                .catch(triggerRemote);
        });
    });
}
exports.default = toolChainGet;
