"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var arrayBufferToString_1 = __importDefault(require("../arrayBufferToString"));
var base64ToUint8_1 = __importDefault(require("../base64ToUint8"));
var catchReturn_1 = __importDefault(require("../catchReturn"));
var stringToArrayBuffer_1 = __importDefault(require("../stringToArrayBuffer"));
function decryptData(data, privateKey, iv) {
    return window.crypto.subtle
        .decrypt({
        name: "AES-GCM",
        iv: base64ToUint8_1.default(iv),
        tagLength: 128, // The tagLength you used to encrypt (if any)
    }, privateKey, // from generateKey or importKey above
    stringToArrayBuffer_1.default(data) // ArrayBuffer of the data
    )
        .then(function (decrypted) {
        // returns an ArrayBuffer containing the decrypted data
        return arrayBufferToString_1.default(decrypted);
    })
        .catch(catchReturn_1.default);
}
exports.default = decryptData;
