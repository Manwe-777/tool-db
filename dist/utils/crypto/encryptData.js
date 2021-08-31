"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../../getCrypto"));
var arrayBufferToString_1 = __importDefault(require("../arrayBufferToString"));
var stringToArrayBuffer_1 = __importDefault(require("../stringToArrayBuffer"));
function encryptData(data, publicKey, iv) {
    var crypto = getCrypto_1.default();
    return crypto.subtle
        .encrypt({
        name: "AES-GCM",
        // Don't re-use initialization vectors!
        // Always generate a new iv every time your encrypt!
        // Recommended to use 12 bytes length
        iv: iv,
        // Tag length (optional)
        tagLength: 128, // can be 32, 64, 96, 104, 112, 120 or 128 (default)
    }, publicKey, // from generateKey or importKey above
    stringToArrayBuffer_1.default(data) // ArrayBuffer of data you want to encrypt
    )
        .then(function (encrypted) {
        // returns an ArrayBuffer containing the encrypted data
        return arrayBufferToString_1.default(encrypted);
    })
        .catch(console.error);
}
exports.default = encryptData;
