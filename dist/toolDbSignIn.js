"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var decodeKeyString_1 = __importDefault(require("./utils/crypto/decodeKeyString"));
var decryptWithPass_1 = __importDefault(require("./utils/crypto/decryptWithPass"));
var importKey_1 = __importDefault(require("./utils/crypto/importKey"));
var base64ToUint8_1 = __importDefault(require("./utils/base64ToUint8"));
var catchReturn_1 = __importDefault(require("./utils/catchReturn"));
var fromBase64_1 = __importDefault(require("./utils/fromBase64"));
var sha256_1 = __importDefault(require("./utils/sha256"));
function toolDbSignIn(user, password) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        _this.getData("==" + user, false, 5000)
            .then(function (_user) {
            if (!_user) {
                reject(Error("Unvalid user data"));
                return;
            }
            if ((0, sha256_1.default)(password) !== _user.pass) {
                reject(Error("Invalid password"));
                return;
            }
            (0, decryptWithPass_1.default)((0, fromBase64_1.default)(_user.keys.skpriv), password, (0, base64ToUint8_1.default)(_user.iv)).then(function (decryptedskpriv) {
                (0, decryptWithPass_1.default)((0, fromBase64_1.default)(_user.keys.ekpriv), password, (0, base64ToUint8_1.default)(_user.iv))
                    .then(function (decryptedekpriv) {
                    var parsedKeys = __assign(__assign({}, _user.keys), { skpriv: decryptedskpriv || "", ekpriv: decryptedekpriv || "" });
                    // const jsonKeys = {
                    //   skpub: parsedKeys.skpub,
                    //   skpriv: parsedKeys.skpriv,
                    //   ekpub: parsedKeys.ekpub,
                    //   ekpriv: parsedKeys.ekpriv,
                    // };
                    // localStorage.setItem("keys", JSON.stringify(jsonKeys));
                    function importKeys() {
                        return __awaiter(this, void 0, void 0, function () {
                            var skpub, skpriv, ekpub, ekpriv;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, importKey_1.default)((0, decodeKeyString_1.default)(parsedKeys.skpub), "spki", "ECDSA", ["verify"]).catch(catchReturn_1.default)];
                                    case 1:
                                        skpub = _a.sent();
                                        return [4 /*yield*/, (0, importKey_1.default)((0, decodeKeyString_1.default)(parsedKeys.skpriv), "pkcs8", "ECDSA", ["sign"]).catch(catchReturn_1.default)];
                                    case 2:
                                        skpriv = _a.sent();
                                        return [4 /*yield*/, (0, importKey_1.default)((0, decodeKeyString_1.default)(parsedKeys.ekpub), "spki", "ECDH", []).catch(catchReturn_1.default)];
                                    case 3:
                                        ekpub = _a.sent();
                                        return [4 /*yield*/, (0, importKey_1.default)((0, decodeKeyString_1.default)(parsedKeys.ekpriv), "pkcs8", "ECDH", ["deriveKey", "deriveBits"]).catch(catchReturn_1.default)];
                                    case 4:
                                        ekpriv = _a.sent();
                                        return [2 /*return*/, { skpub: skpub, skpriv: skpriv, ekpub: ekpub, ekpriv: ekpriv }];
                                }
                            });
                        });
                    }
                    importKeys()
                        .then(function (_a) {
                        var skpub = _a.skpub, skpriv = _a.skpriv, ekpub = _a.ekpub, ekpriv = _a.ekpriv;
                        if (!skpub || !skpriv || !ekpub || !ekpriv) {
                            reject(new Error("Could not import keys"));
                        }
                        else {
                            var newKeys = {
                                signKeys: {
                                    publicKey: skpub,
                                    privateKey: skpriv,
                                },
                                encryptionKeys: {
                                    publicKey: ekpub,
                                    privateKey: ekpriv,
                                },
                            };
                            _this.user = {
                                keys: newKeys,
                                name: user,
                                pubKey: _user.keys.skpub,
                            };
                            resolve(newKeys);
                        }
                    })
                        .catch(catchReturn_1.default);
                })
                    .catch(catchReturn_1.default);
            });
        })
            .catch(console.warn);
    });
}
exports.default = toolDbSignIn;
//# sourceMappingURL=toolDbSignIn.js.map