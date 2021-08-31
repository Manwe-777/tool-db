"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../../getCrypto"));
function exportKey(format, key) {
    var crypto = getCrypto_1.default();
    return crypto.subtle.exportKey(format, // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    key // can be a publicKey or privateKey, as long as extractable was true,
    );
}
exports.default = exportKey;
