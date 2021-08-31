"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var arrayBufferToString_1 = __importDefault(require("../arrayBufferToString"));
var catchReturn_1 = __importDefault(require("../catchReturn"));
var generateKeyFromPassword_1 = __importDefault(require("./generateKeyFromPassword"));
var stringToArrayBuffer_1 = __importDefault(require("../stringToArrayBuffer"));
var getCrypto_1 = __importDefault(require("../../getCrypto"));
function decryptWithPass(data, password, vector) {
    var crypto = (0, getCrypto_1.default)();
    return (0, generateKeyFromPassword_1.default)(password)
        .then(function (keyObject) {
        return crypto.subtle
            .decrypt({ name: "AES-GCM", iv: vector }, keyObject, (0, stringToArrayBuffer_1.default)(data))
            .then(function (result) { return (0, arrayBufferToString_1.default)(result); })
            .catch(catchReturn_1.default);
    })
        .catch(catchReturn_1.default);
}
exports.default = decryptWithPass;
//# sourceMappingURL=decryptWithPass.js.map