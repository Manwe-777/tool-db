"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var gun_1 = __importDefault(require("gun"));
var customGun_1 = __importDefault(require("./customGun"));
var toolDbAnonSignIn_1 = __importDefault(require("./toolDbAnonSignIn"));
var toolDbGet_1 = __importDefault(require("./toolDbGet"));
var toolDbGetPubKey_1 = __importDefault(require("./toolDbGetPubKey"));
var toolDbPut_1 = __importDefault(require("./toolDbPut"));
var toolDbSignIn_1 = __importDefault(require("./toolDbSignIn"));
var toolDbSignUp_1 = __importDefault(require("./toolDbSignUp"));
var ToolDbClient = /** @class */ (function () {
    function ToolDbClient(peers) {
        var _this = this;
        this.debug = false;
        this.getData = toolDbGet_1.default;
        this.putData = toolDbPut_1.default;
        this.getPubKey = toolDbGetPubKey_1.default;
        this.signIn = toolDbSignIn_1.default;
        this.anonSignIn = toolDbAnonSignIn_1.default;
        this.signUp = toolDbSignUp_1.default;
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
        this.user = undefined;
        (0, customGun_1.default)(this, gun_1.default);
        if (typeof window !== "undefined")
            window.toolDb = this;
        if (typeof global !== "undefined")
            global.toolDb = this;
        this._gun = new gun_1.default({
            peers: peers,
        });
    }
    Object.defineProperty(ToolDbClient.prototype, "gun", {
        get: function () {
            return this._gun;
        },
        enumerable: false,
        configurable: true
    });
    return ToolDbClient;
}());
exports.default = ToolDbClient;
//# sourceMappingURL=toolDbClient.js.map