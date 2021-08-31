"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var toolChainAnonSignIn_1 = __importDefault(require("./toolChainAnonSignIn"));
var toolChainGet_1 = __importDefault(require("./toolChainGet"));
var toolChainGetPubKey_1 = __importDefault(require("./toolChainGetPubKey"));
var toolChainPut_1 = __importDefault(require("./toolChainPut"));
var toolChainSignIn_1 = __importDefault(require("./toolChainSignIn"));
var toolChainSignUp_1 = __importDefault(require("./toolChainSignUp"));
var ToolChainClient = /** @class */ (function () {
    function ToolChainClient(host, debug) {
        if (debug === void 0) { debug = false; }
        this.debug = false;
        this._host = "";
        this.getData = toolChainGet_1.default;
        this.putData = toolChainPut_1.default;
        this.getPubKey = toolChainGetPubKey_1.default;
        this.signIn = toolChainSignIn_1.default;
        this.anonSignIn = toolChainAnonSignIn_1.default;
        this.signUp = toolChainSignUp_1.default;
        this.user = undefined;
        this._host = host;
        this.debug = debug;
    }
    Object.defineProperty(ToolChainClient.prototype, "host", {
        get: function () {
            return this._host;
        },
        enumerable: false,
        configurable: true
    });
    return ToolChainClient;
}());
exports.default = ToolChainClient;
