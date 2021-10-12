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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var deduplicator_1 = __importDefault(require("./deduplicator"));
var wss_1 = __importDefault(require("./wss"));
var toolDbGet_1 = __importDefault(require("./toolDbGet"));
var toolDbPut_1 = __importDefault(require("./toolDbPut"));
var toolDbGetPubKey_1 = __importDefault(require("./toolDbGetPubKey"));
var toolDbSignIn_1 = __importDefault(require("./toolDbSignIn"));
var toolDbAnonSignIn_1 = __importDefault(require("./toolDbAnonSignIn"));
var toolDbSignUp_1 = __importDefault(require("./toolDbSignUp"));
var toolDbVerificationWrapper_1 = __importDefault(require("./toolDbVerificationWrapper"));
var toolDbClientOnMessage_1 = __importDefault(require("./toolDbClientOnMessage"));
var indexedb_1 = __importDefault(require("./utils/indexedb"));
var leveldb_1 = __importDefault(require("./utils/leveldb"));
var toolDbSubscribe_1 = __importDefault(require("./toolDbSubscribe"));
var ToolDb = /** @class */ (function () {
    function ToolDb(options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.clientOnMessage = toolDbClientOnMessage_1.default;
        this.subscribeData = toolDbSubscribe_1.default;
        this.getData = toolDbGet_1.default;
        this.putData = toolDbPut_1.default;
        this.getPubKey = toolDbGetPubKey_1.default;
        this.signIn = toolDbSignIn_1.default;
        this.anonSignIn = toolDbAnonSignIn_1.default;
        this.signUp = toolDbSignUp_1.default;
        this.verify = toolDbVerificationWrapper_1.default;
        /**
         * id listeners listen for a specific message ID just once
         */
        this._idListeners = {};
        this.addIdListener = function (id, fn) {
            _this._idListeners[id] = fn;
        };
        this.removeIdListener = function (id) {
            delete _this._idListeners[id];
        };
        /**
         * Key listeners listen for a specific key, as long as the listener remains active
         */
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
        /**
         * Custom verificators can enhance default verification on any key field
         */
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
        this._options = {
            db: "tooldb",
            peers: [],
            maxRetries: 5,
            wait: 2000,
            pow: 0,
            server: false,
            port: 8080,
            debug: false,
        };
        this._options = __assign(__assign({}, this._options), options);
        // These could be made to be customizable by setting the variables as public
        this._deduplicator = new deduplicator_1.default();
        this._websockets = new wss_1.default(this);
        this._store = typeof window === "undefined" ? (0, leveldb_1.default)() : (0, indexedb_1.default)();
    }
    Object.defineProperty(ToolDb.prototype, "options", {
        get: function () {
            return this._options;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ToolDb.prototype, "deduplicator", {
        get: function () {
            return this._deduplicator;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ToolDb.prototype, "websockets", {
        get: function () {
            return this._websockets;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ToolDb.prototype, "store", {
        get: function () {
            return this._store;
        },
        enumerable: false,
        configurable: true
    });
    return ToolDb;
}());
exports.default = ToolDb;
//# sourceMappingURL=tooldb.js.map