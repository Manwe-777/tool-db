"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function generateKeyPair(mode, extractable) {
    if (extractable === void 0) { extractable = false; }
    return window.crypto.subtle.generateKey({
        name: mode,
        namedCurve: "P-256", // can be "P-256", "P-384", or "P-521"
    }, extractable, // whether the key is extractable (i.e. can be used in exportKey)
    mode === "ECDSA" ? ["sign", "verify"] : ["deriveKey", "deriveBits"]);
}
exports.default = generateKeyPair;
