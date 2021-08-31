"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../getCrypto"));
var arrayBufferToString_1 = __importDefault(require("./arrayBufferToString"));
var stringToArrayBuffer_1 = __importDefault(require("./stringToArrayBuffer"));
function signData(data, privateKey) {
    var crypto = getCrypto_1.default();
    return crypto.subtle
        .sign({
        name: "ECDSA",
        hash: { name: "SHA-256" }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    }, privateKey, // from generateKey or importKey above
    stringToArrayBuffer_1.default(data) // ArrayBuffer of data you want to sign
    )
        .then(function (signature) {
        // returns an ArrayBuffer containing the signature
        return arrayBufferToString_1.default(signature);
    });
}
exports.default = signData;
