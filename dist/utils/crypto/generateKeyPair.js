"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../../getCrypto"));
function generateKeyPair(mode, extractable) {
    if (extractable === void 0) { extractable = false; }
    var crypto = getCrypto_1.default();
    return crypto.subtle.generateKey({
        name: mode,
        namedCurve: "P-256", // can be "P-256", "P-384", or "P-521"
    }, extractable, // whether the key is extractable (i.e. can be used in exportKey)
    mode === "ECDSA" ? ["sign", "verify"] : ["deriveKey", "deriveBits"]);
}
exports.default = generateKeyPair;
