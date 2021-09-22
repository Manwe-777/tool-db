"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var customGun_1 = __importDefault(require("./customGun"));
var indexedb_1 = __importDefault(require("./gunlib/indexedb"));
var shared_1 = __importDefault(require("./shared"));
var toolDbAnonSignIn_1 = __importDefault(require("./toolDbAnonSignIn"));
var toolDbGet_1 = __importDefault(require("./toolDbGet"));
var toolDbGetPubKey_1 = __importDefault(require("./toolDbGetPubKey"));
var toolDbPut_1 = __importDefault(require("./toolDbPut"));
var toolDbSignIn_1 = __importDefault(require("./toolDbSignIn"));
var toolDbSignUp_1 = __importDefault(require("./toolDbSignUp"));
var toolDbVerificationWrapper_1 = __importDefault(require("./toolDbVerificationWrapper"));
var Gun = require("gun");
var ToolDbClient = /** @class */ (function () {
    function ToolDbClient(peers, gunRef) {
        var _this = this;
        this.debug = false;
        this.getData = toolDbGet_1.default;
        this.putData = toolDbPut_1.default;
        this.getPubKey = toolDbGetPubKey_1.default;
        this.signIn = toolDbSignIn_1.default;
        this.anonSignIn = toolDbAnonSignIn_1.default;
        this.signUp = toolDbSignUp_1.default;
        this.verify = toolDbVerificationWrapper_1.default;
        this._keyListeners = [];
        this.addKeyListener = function (key, fn) {
            var newListener = {
                key: key,
                timeout: null,
                fn: fn,
            };
            _this._keyListeners.push(newListener);
            return _this._keyListeners.length;
        };
        this.removeKeyListener = function (id) {
            var _a, _b;
            if ((_a = _this._keyListeners[id]) === null || _a === void 0 ? void 0 : _a.timeout) {
                clearTimeout(((_b = _this._keyListeners[id]) === null || _b === void 0 ? void 0 : _b.timeout) || undefined);
            }
            _this._keyListeners[id] = null;
        };
        this._customVerificator = [];
        this.addCustomVerification = function (key, fn) {
            var newListener = {
                key: key,
                fn: fn,
            };
            _this._customVerificator.push(newListener);
            return _this._customVerificator.length;
        };
        this.removeCustomVerification = function (id) {
            _this._customVerificator[id] = null;
        };
        this.user = undefined;
        shared_1.default.toolDb = this;
        shared_1.default.gun = gunRef || Gun;
        if (peers) {
            (0, customGun_1.default)(shared_1.default.gun);
            this._gun = new shared_1.default.gun({
                localStorage: false,
                store: (0, indexedb_1.default)(),
                peers: peers,
            });
        }
    }
    Object.defineProperty(ToolDbClient.prototype, "gun", {
        get: function () {
            return this._gun;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ToolDbClient.prototype, "requiredGun", {
        get: function () {
            return shared_1.default.gun;
        },
        enumerable: false,
        configurable: true
    });
    return ToolDbClient;
}());
exports.default = ToolDbClient;
//# sourceMappingURL=toolDbClient.js.map