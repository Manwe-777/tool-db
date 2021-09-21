"use strict";
// @ts-nocheck
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
var _1 = require(".");
var shared_1 = __importDefault(require("./shared"));
function verification(msg) {
    return __awaiter(this, void 0, void 0, function () {
        var keys, promises, verifiedList;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!msg.put) return [3 /*break*/, 2];
                    keys = Object.keys(msg.put);
                    promises = keys.map(function (key) { return __awaiter(_this, void 0, void 0, function () {
                        var data, toolDb;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    data = {};
                                    if ((_a = msg.put[key]) === null || _a === void 0 ? void 0 : _a.v) {
                                        try {
                                            data = JSON.parse(msg.put[key].v);
                                        }
                                        catch (e) {
                                            //
                                        }
                                    }
                                    toolDb = shared_1.default.toolDb;
                                    return [4 /*yield*/, toolDb.verify(data)];
                                case 1: return [2 /*return*/, _b.sent()];
                            }
                        });
                    }); });
                    return [4 /*yield*/, Promise.all(promises).catch(console.error)];
                case 1:
                    verifiedList = _a.sent();
                    if (verifiedList.filter(function (r) { return r === _1.VerifyResult.Verified; }).length ===
                        keys.length) {
                        this.to.next(msg);
                        console.log("Verification > OK", msg);
                        return [2 /*return*/];
                    }
                    console.log("Verification > NOT OK", msg, verifiedList);
                    return [2 /*return*/];
                case 2:
                    console.log("Verification > Skipped", msg);
                    this.to.next(msg);
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function putCheck(msg) {
    return __awaiter(this, void 0, void 0, function () {
        var key_1, data_1, toolDb, verify;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!msg.put) return [3 /*break*/, 2];
                    key_1 = msg.put["#"];
                    data_1 = {};
                    try {
                        data_1 = JSON.parse(msg.put[":"]);
                    }
                    catch (e) {
                        // console.warn(e);
                    }
                    if (!(data_1 && data_1.value)) return [3 /*break*/, 2];
                    toolDb = shared_1.default.toolDb;
                    return [4 /*yield*/, toolDb.verify(data_1)];
                case 1:
                    verify = _a.sent();
                    if (verify !== _1.VerifyResult.Verified) {
                        return [2 /*return*/];
                    }
                    // Check listeners
                    toolDb._keyListeners.forEach(function (listener) {
                        if (key_1.startsWith(listener.key)) {
                            if (listener.timeout)
                                clearTimeout(listener.timeout);
                            listener.timeout = setTimeout(function () {
                                listener.fn(data_1.value);
                                listener.timeout = null;
                            }, 250);
                        }
                    });
                    _a.label = 2;
                case 2:
                    this.to.next(msg);
                    return [2 /*return*/];
            }
        });
    });
}
function customGun(toolDb, _gun) {
    if (_gun === void 0) { _gun = undefined; }
    (_gun || require("gun")).on("create", function (ctx) {
        ctx.on("in", verification);
        ctx.on("out", verification);
        ctx.on("put", putCheck);
        this.to.next(ctx);
    });
}
exports.default = customGun;
//# sourceMappingURL=customGun.js.map