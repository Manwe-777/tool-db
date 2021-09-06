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
var message_1 = require("./types/message");
var verifyMessage_1 = __importDefault(require("./utils/verifyMessage"));
/**
 * WIP move the remainder of this (custom verification) to client service!
 */
var ToolDbService = /** @class */ (function () {
    function ToolDbService(debug) {
        var _this = this;
        if (debug === void 0) { debug = false; }
        this.debug = false;
        /**
         * These can be customized depending on your db of choice.
         */
        this.dbInit = function () {
            console.log("You need to configure a db!");
        };
        this.dbRead = function (key) {
            console.log("You need to configure a db!");
            return new Promise(function (r) { return r({}); });
        };
        this.dbWrite = function (key, msg) {
            console.log("You need to configure a db!");
        };
        this.triggerPut = function (msg) {
            //
        };
        this.onMessage = function (msg, peerId) {
            //
        };
        this._customVerification = {};
        /**
         * Adds an extra verification step for messages at the given key.
         * You can compare against a previously stored value using the value given at the callback.
         * The callback should return a boolean for if the message passed the verification step.
         * @param key data key
         * @param fn (stored, incoming) => boolean
         */
        this.addVerification = function (key, fn) {
            _this._customVerification[key] = fn;
        };
        this.messageWrapper = function (data) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                // This wrapper functions filters out those messages we already handled from the listener
                // It also takes care of verification, data persistence and low level handling
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        (0, verifyMessage_1.default)(data).then(function (verified) { return __awaiter(_this, void 0, void 0, function () {
                            var oldValue;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!verified) return [3 /*break*/, 2];
                                        if (!this._customVerification[data.key]) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this.dbRead(data.key)];
                                    case 1:
                                        oldValue = _a.sent();
                                        verified = !this._customVerification[data.key](oldValue || undefined, data)
                                            ? message_1.VerifyResult.InvalidVerification
                                            : verified;
                                        _a.label = 2;
                                    case 2:
                                        if (verified === message_1.VerifyResult.Verified) {
                                            this.dataPutHandler(data);
                                            resolve(true);
                                        }
                                        else {
                                            reject(new Error("Could not verify message integrity: " + verified));
                                            console.warn(data);
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                    })];
            });
        }); };
        this.debug = debug;
    }
    ToolDbService.prototype.dataPutHandler = function (msg) {
        return __awaiter(this, void 0, void 0, function () {
            var oldValue;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.dbRead(msg.key)];
                    case 1:
                        oldValue = _a.sent();
                        // if (this.debug) console.log("Recv PUT", msg, oldValue);
                        if (!oldValue ||
                            (oldValue.timestamp < msg.timestamp &&
                                (msg.key.slice(0, 1) == ":" ? oldValue.pub === msg.pub : true))) {
                            this.dbWrite(msg.key, msg);
                            this.triggerPut(msg);
                        }
                        else {
                            // console.warn(`Skip message write!`, oldValue, msg);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ToolDbService.prototype.initialize = function () {
        this.dbInit();
    };
    return ToolDbService;
}());
exports.default = ToolDbService;
//# sourceMappingURL=toolDbService.js.map