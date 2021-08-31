"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../../getCrypto"));
function deriveSecret(keys) {
    var crypto = getCrypto_1.default();
    return crypto.subtle.deriveKey({
        name: "ECDH",
        public: keys.publicKey,
    }, keys.privateKey, {
        name: "AES-GCM",
        length: 256,
    }, true, ["encrypt", "decrypt"]);
}
exports.default = deriveSecret;
