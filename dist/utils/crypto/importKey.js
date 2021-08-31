"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../../getCrypto"));
// JsonWebKey
function importKey(
// eslint-disable-next-line no-undef
key, type, algorithm, 
// eslint-disable-next-line no-undef
ops) {
    var crypto = (0, getCrypto_1.default)();
    return crypto.subtle.importKey(type, // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    key, {
        name: algorithm,
        namedCurve: "P-256",
    }, true, // whether the key is extractable (i.e. can be used in exportKey)
    ops // "verify" for public key import, "sign" for private key imports
    );
}
exports.default = importKey;
//# sourceMappingURL=importKey.js.map