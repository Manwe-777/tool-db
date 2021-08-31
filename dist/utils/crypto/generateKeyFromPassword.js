"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../../getCrypto"));
var stringToArrayBuffer_1 = __importDefault(require("../stringToArrayBuffer"));
function generateKeyFromPassword(password) {
    var crypto = (0, getCrypto_1.default)();
    return crypto.subtle
        .importKey("raw", (0, stringToArrayBuffer_1.default)(password), { name: "PBKDF2" }, false, ["deriveKey"])
        .then(function (importedPassword) {
        return crypto.subtle.deriveKey({
            name: "PBKDF2",
            salt: (0, stringToArrayBuffer_1.default)("t6sa@8d7!2ñs?=adjq2ng"),
            iterations: 100000,
            hash: "SHA-256",
        }, importedPassword, {
            name: "AES-GCM",
            length: 128,
        }, false, ["encrypt", "decrypt"]);
    });
}
exports.default = generateKeyFromPassword;
//# sourceMappingURL=generateKeyFromPassword.js.map