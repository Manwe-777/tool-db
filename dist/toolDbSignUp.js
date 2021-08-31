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
var axios_1 = __importDefault(require("axios"));
var encryptWithPass_1 = __importDefault(require("./utils/crypto/encryptWithPass"));
var generateKeysComb_1 = __importDefault(require("./utils/crypto/generateKeysComb"));
var saveKeysComb_1 = __importDefault(require("./utils/crypto/saveKeysComb"));
var generateIv_1 = __importDefault(require("./utils/generateIv"));
var proofOfWork_1 = __importDefault(require("./utils/proofOfWork"));
var sha256_1 = __importDefault(require("./utils/sha256"));
var signData_1 = __importDefault(require("./utils/signData"));
var toBase64_1 = __importDefault(require("./utils/toBase64"));
var uint8ToBase64_1 = __importDefault(require("./utils/uint8ToBase64"));
function toolDbSignUp(user, password) {
    return __awaiter(this, void 0, void 0, function () {
        var userRoot;
        var _this = this;
        return __generator(this, function (_a) {
            userRoot = "@" + user;
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    _this.getData(userRoot, false, 5000)
                        .then(function (data) {
                        if (data === null) {
                            (0, generateKeysComb_1.default)()
                                .then(function (keys) {
                                if (keys) {
                                    (0, saveKeysComb_1.default)(keys.signKeys, keys.encryptionKeys)
                                        .then(function (savedKeys) {
                                        var iv = (0, generateIv_1.default)();
                                        var encskpriv = "";
                                        var encekpriv = "";
                                        // Encrypt sign key
                                        (0, encryptWithPass_1.default)(savedKeys.skpriv, password, iv)
                                            .then(function (skenc) {
                                            (0, encryptWithPass_1.default)(savedKeys.ekpriv, password, iv)
                                                .then(function (ekenc) {
                                                if (skenc)
                                                    encskpriv = skenc;
                                                if (ekenc)
                                                    encekpriv = ekenc;
                                                var userData = {
                                                    keys: {
                                                        skpub: savedKeys.skpub,
                                                        skpriv: (0, toBase64_1.default)(encskpriv),
                                                        ekpub: savedKeys.ekpub,
                                                        ekpriv: (0, toBase64_1.default)(encekpriv),
                                                    },
                                                    iv: (0, uint8ToBase64_1.default)(iv),
                                                    pass: (0, sha256_1.default)(password),
                                                };
                                                var timestamp = new Date().getTime();
                                                var userDataString = "" + JSON.stringify(userData) + savedKeys.skpub + timestamp;
                                                (0, proofOfWork_1.default)(userDataString, 3)
                                                    .then(function (_a) {
                                                    var hash = _a.hash, nonce = _a.nonce;
                                                    (0, signData_1.default)(hash, keys.signKeys.privateKey).then(function (signature) {
                                                        var signupMessage = {
                                                            key: userRoot,
                                                            pub: savedKeys.skpub,
                                                            nonce: nonce,
                                                            timestamp: timestamp,
                                                            hash: hash,
                                                            sig: (0, toBase64_1.default)(signature),
                                                            value: userData,
                                                        };
                                                        axios_1.default
                                                            .post(_this.host + "/api/put", signupMessage)
                                                            .then(function (value) {
                                                            resolve(value.data);
                                                        })
                                                            .catch(reject);
                                                    });
                                                })
                                                    .catch(reject);
                                            })
                                                .catch(reject);
                                        })
                                            .catch(reject);
                                    })
                                        .catch(function () { return reject(new Error("")); });
                                }
                                else {
                                    reject(new Error("Could not generate keys"));
                                }
                            })
                                .catch(function () { return reject(new Error("Could not generate keys")); });
                        }
                        else {
                            reject(new Error("User already exists!"));
                        }
                    })
                        .catch(function () {
                        reject(new Error("Could not fetch user"));
                    });
                })];
        });
    });
}
exports.default = toolDbSignUp;
//# sourceMappingURL=toolDbSignUp.js.map