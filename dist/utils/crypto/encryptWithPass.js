"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var arrayBufferToString_1 = __importDefault(require("../arrayBufferToString"));
var catchReturn_1 = __importDefault(require("../catchReturn"));
var generateKeyFromPassword_1 = __importDefault(require("./generateKeyFromPassword"));
var stringToArrayBuffer_1 = __importDefault(require("../stringToArrayBuffer"));
function encryptWithPass(secretmessage, password, vector) {
    return generateKeyFromPassword_1.default(password)
        .then(function (keyObject) {
        // encrypt promise
        return window.crypto.subtle
            .encrypt({ name: "AES-GCM", iv: vector }, keyObject, stringToArrayBuffer_1.default(secretmessage))
            .then(function (result) {
            return arrayBufferToString_1.default(result);
        })
            .catch(catchReturn_1.default);
    })
        .catch(catchReturn_1.default);
}
exports.default = encryptWithPass;
