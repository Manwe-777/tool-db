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
var decodeKeyString_1 = __importDefault(require("./crypto/decodeKeyString"));
var importKey_1 = __importDefault(require("./crypto/importKey"));
var verifyData_1 = __importDefault(require("./crypto/verifyData"));
var fromBase64_1 = __importDefault(require("./fromBase64"));
var sha256_1 = __importDefault(require("./sha256"));
/**
 * Verifies a message validity (PoW, pubKey, timestamp, signatures)
 * @param msg AnyMessage
 * @returns boolean or undefined if the message type does not match
 */
function verifyMessage(msg) {
    return __awaiter(this, void 0, void 0, function () {
        var strData, publicKeyNamespace, pubKeyString, pubKey, verified;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // console.log("verify: ", msg);
                    if (msg.type === "get") {
                        return [2 /*return*/, true];
                    }
                    if (!(msg.type === "put")) return [3 /*break*/, 3];
                    strData = JSON.stringify(msg.val.value);
                    if (msg.val.timestamp > new Date().getTime()) {
                        console.warn("Invalid message timestamp.");
                        return [2 /*return*/, false];
                    }
                    publicKeyNamespace = false;
                    if (msg.val.key.slice(0, 1) == "~") {
                        publicKeyNamespace = msg.val.key.split(".")[0].slice(1);
                    }
                    pubKeyString = msg.val.pub;
                    if (publicKeyNamespace && publicKeyNamespace !== pubKeyString) {
                        console.warn("Provided pub keys do not match");
                        return [2 /*return*/, false];
                    }
                    // Verify hash and nonce (adjust zeroes for difficulty of the network)
                    // While this POW does not enforce security per-se, it does make it harder
                    // for attackers to spam the network, and could be adjusted by peers.
                    if (msg.hash.slice(0, 3) !== "000") {
                        console.warn("No valid hash (no pow)");
                        return [2 /*return*/, false];
                    }
                    if (sha256_1.default("" + strData + pubKeyString + msg.val.timestamp + msg.val.nonce) !== msg.hash) {
                        console.warn("Specified hash does not generate a valid pow");
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, importKey_1.default(decodeKeyString_1.default(pubKeyString), "spki", "ECDSA", ["verify"])];
                case 1:
                    pubKey = _a.sent();
                    return [4 /*yield*/, verifyData_1.default(msg.hash, fromBase64_1.default(msg.val.sig), pubKey)];
                case 2:
                    verified = _a.sent();
                    // console.warn(`Signature validation: ${verified ? "Sucess" : "Failed"}`);
                    return [2 /*return*/, verified];
                case 3: return [2 /*return*/, undefined];
            }
        });
    });
}
exports.default = verifyMessage;
