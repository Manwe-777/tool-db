"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var encodeKeyString_1 = __importDefault(require("./utils/crypto/encodeKeyString"));
var exportKey_1 = __importDefault(require("./utils/crypto/exportKey"));
function toolChainGetPubKey() {
    var _a;
    if (!((_a = this.user) === null || _a === void 0 ? void 0 : _a.keys.signKeys.publicKey)) {
        return Promise.reject(new Error("You are not authorized yet."));
    }
    return (0, exportKey_1.default)("spki", this.user.keys.signKeys.publicKey).then(function (skpub) {
        return (0, encodeKeyString_1.default)(skpub);
    });
}
exports.default = toolChainGetPubKey;
//# sourceMappingURL=toolDbGetPubKey.js.map