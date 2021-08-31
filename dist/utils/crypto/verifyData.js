"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../../getCrypto"));
var stringToArrayBuffer_1 = __importDefault(require("../stringToArrayBuffer"));
function verifyData(data, signature, publicKey) {
    var crypto = (0, getCrypto_1.default)();
    return crypto.subtle.verify({
        name: "ECDSA",
        hash: { name: "SHA-256" }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    }, publicKey, // from generateKey or importKey above
    (0, stringToArrayBuffer_1.default)(signature), // ArrayBuffer of the signature
    (0, stringToArrayBuffer_1.default)(data) // ArrayBuffer of the data
    );
}
exports.default = verifyData;
//# sourceMappingURL=verifyData.js.map