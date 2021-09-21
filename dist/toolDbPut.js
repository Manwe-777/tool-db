"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var proofOfWork_1 = __importDefault(require("./utils/proofOfWork"));
var signData_1 = __importDefault(require("./utils/signData"));
var toBase64_1 = __importDefault(require("./utils/toBase64"));
/**
 * Triggers a PUT request to other peers.
 * @param key key where we want to put the data at.
 * @param value Data we want to any (any type)
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @returns Promise<Data | null>
 */
function toolDbPut(key, value, userNamespaced, pow) {
    var _this = this;
    if (userNamespaced === void 0) { userNamespaced = false; }
    if (pow === void 0) { pow = 0; }
    return new Promise(function (resolve, reject) {
        if (key.includes(".")) {
            // Dots are used as a delimitator character between bublic keys and the key of the user's data
            reject(new Error("Key cannot include dots!; " + key));
            return;
        }
        if (!_this.user) {
            reject(new Error("You need to log in before you can PUT."));
            return;
        }
        var timestamp = new Date().getTime();
        var dataString = "" + JSON.stringify(value) + _this.user.pubKey + timestamp;
        // WORK
        (0, proofOfWork_1.default)(dataString, pow)
            .then(function (_a) {
            var _b;
            var hash = _a.hash, nonce = _a.nonce;
            if ((_b = _this.user) === null || _b === void 0 ? void 0 : _b.keys) {
                // Sign our value
                (0, signData_1.default)(hash, _this.user.keys.signKeys.privateKey)
                    .then(function (signature) { return __awaiter(_this, void 0, void 0, function () {
                    var data;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        data = {
                            key: userNamespaced ? ":" + ((_a = this.user) === null || _a === void 0 ? void 0 : _a.pubKey) + "." + key : key,
                            pub: ((_b = this.user) === null || _b === void 0 ? void 0 : _b.pubKey) || "",
                            nonce: nonce,
                            timestamp: timestamp,
                            hash: hash,
                            sig: (0, toBase64_1.default)(signature),
                            value: value,
                        };
                        if (this.debug) {
                            console.log("PUT > " + key, data);
                        }
                        this.gun.get(data.key).put({ v: JSON.stringify(data) }, function (ack) {
                            if (ack.err) {
                                reject(ack.err);
                            }
                            else {
                                resolve(data.value);
                            }
                        });
                        return [2 /*return*/];
                    });
                }); })
                    .catch(reject);
            }
        })
            .catch(reject);
    });
}
exports.default = toolDbPut;
//# sourceMappingURL=toolDbPut.js.map