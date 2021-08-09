"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var stringToArrayBuffer_1 = __importDefault(require("../stringToArrayBuffer"));
function generateKeyFromPassword(password) {
    return window.crypto.subtle
        .importKey("raw", stringToArrayBuffer_1.default(password), { name: "PBKDF2" }, false, ["deriveKey"])
        .then(function (importedPassword) {
        return window.crypto.subtle.deriveKey({
            name: "PBKDF2",
            salt: stringToArrayBuffer_1.default("t6sa@8d7!2ñs?=adjq2ng"),
            iterations: 100000,
            hash: "SHA-256",
        }, importedPassword, {
            name: "AES-GCM",
            length: 128,
        }, false, ["encrypt", "decrypt"]);
    });
}
exports.default = generateKeyFromPassword;
