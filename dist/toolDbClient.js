"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var toolDbAnonSignIn_1 = __importDefault(require("./toolDbAnonSignIn"));
var toolDbGet_1 = __importDefault(require("./toolDbGet"));
var toolDbGetPubKey_1 = __importDefault(require("./toolDbGetPubKey"));
var toolDbPut_1 = __importDefault(require("./toolDbPut"));
var toolDbSignIn_1 = __importDefault(require("./toolDbSignIn"));
var toolDbSignUp_1 = __importDefault(require("./toolDbSignUp"));
var ToolDbClient = /** @class */ (function () {
    function ToolDbClient(host, debug) {
        if (debug === void 0) { debug = false; }
        this.debug = false;
        this._host = "";
        this.getData = toolDbGet_1.default;
        this.putData = toolDbPut_1.default;
        this.getPubKey = toolDbGetPubKey_1.default;
        this.signIn = toolDbSignIn_1.default;
        this.anonSignIn = toolDbAnonSignIn_1.default;
        this.signUp = toolDbSignUp_1.default;
        this.user = undefined;
        this._host = host;
        this.debug = debug;
    }
    Object.defineProperty(ToolDbClient.prototype, "host", {
        get: function () {
            return this._host;
        },
        enumerable: false,
        configurable: true
    });
    return ToolDbClient;
}());
exports.default = ToolDbClient;
