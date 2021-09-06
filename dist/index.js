"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolDbClient = exports.ToolDbService = exports.customGun = exports.verifyData = exports.saveKeysComb = exports.loadKeysComb = exports.importKey = exports.generateKeysComb = exports.generateKeyPair = exports.generateKeyFromPassword = exports.exportKey = exports.encryptWithPass = exports.encryptData = exports.encodeKeyString = exports.deriveSecret = exports.decryptWithPass = exports.decryptData = exports.decodeKeyString = exports.verifyMessage = exports.uint8ToBase64 = exports.toBase64 = exports.textRandom = exports.stringToArrayBuffer = exports.randomAnimal = exports.generateIv = exports.fromBase64 = exports.base64ToUint8 = exports.base64ToArrayBuffer = exports.arrayBufferToString = exports.arrayBufferToBase64 = exports.signData = exports.sha256 = exports.sha1 = exports.proofOfWork = void 0;
/* eslint-disable no-undef */
/* eslint-disable global-require */
__exportStar(require("./types/graph"), exports);
__exportStar(require("./types/message"), exports);
global.Buffer = global.Buffer || require("buffer").Buffer;
if (typeof btoa === "undefined") {
    global.btoa = function (str) {
        return Buffer.from(str, "binary").toString("base64");
    };
}
if (typeof atob === "undefined") {
    global.atob = function (b64Encoded) {
        return Buffer.from(b64Encoded, "base64").toString("binary");
    };
}
if (typeof window === "undefined") {
    global.crypto = require("crypto").webcrypto;
}
var proofOfWork_1 = require("./utils/proofOfWork");
Object.defineProperty(exports, "proofOfWork", { enumerable: true, get: function () { return __importDefault(proofOfWork_1).default; } });
var sha1_1 = require("./utils/sha1");
Object.defineProperty(exports, "sha1", { enumerable: true, get: function () { return __importDefault(sha1_1).default; } });
var sha256_1 = require("./utils/sha256");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return __importDefault(sha256_1).default; } });
var signData_1 = require("./utils/signData");
Object.defineProperty(exports, "signData", { enumerable: true, get: function () { return __importDefault(signData_1).default; } });
var arrayBufferToBase64_1 = require("./utils/arrayBufferToBase64");
Object.defineProperty(exports, "arrayBufferToBase64", { enumerable: true, get: function () { return __importDefault(arrayBufferToBase64_1).default; } });
var arrayBufferToString_1 = require("./utils/arrayBufferToString");
Object.defineProperty(exports, "arrayBufferToString", { enumerable: true, get: function () { return __importDefault(arrayBufferToString_1).default; } });
var base64ToArrayBuffer_1 = require("./utils/base64ToArrayBuffer");
Object.defineProperty(exports, "base64ToArrayBuffer", { enumerable: true, get: function () { return __importDefault(base64ToArrayBuffer_1).default; } });
var base64ToUint8_1 = require("./utils/base64ToUint8");
Object.defineProperty(exports, "base64ToUint8", { enumerable: true, get: function () { return __importDefault(base64ToUint8_1).default; } });
var fromBase64_1 = require("./utils/fromBase64");
Object.defineProperty(exports, "fromBase64", { enumerable: true, get: function () { return __importDefault(fromBase64_1).default; } });
var generateIv_1 = require("./utils/generateIv");
Object.defineProperty(exports, "generateIv", { enumerable: true, get: function () { return __importDefault(generateIv_1).default; } });
var randomAnimal_1 = require("./utils/randomAnimal");
Object.defineProperty(exports, "randomAnimal", { enumerable: true, get: function () { return __importDefault(randomAnimal_1).default; } });
var stringToArrayBuffer_1 = require("./utils/stringToArrayBuffer");
Object.defineProperty(exports, "stringToArrayBuffer", { enumerable: true, get: function () { return __importDefault(stringToArrayBuffer_1).default; } });
var textRandom_1 = require("./utils/textRandom");
Object.defineProperty(exports, "textRandom", { enumerable: true, get: function () { return __importDefault(textRandom_1).default; } });
var toBase64_1 = require("./utils/toBase64");
Object.defineProperty(exports, "toBase64", { enumerable: true, get: function () { return __importDefault(toBase64_1).default; } });
var uint8ToBase64_1 = require("./utils/uint8ToBase64");
Object.defineProperty(exports, "uint8ToBase64", { enumerable: true, get: function () { return __importDefault(uint8ToBase64_1).default; } });
var verifyMessage_1 = require("./utils/verifyMessage");
Object.defineProperty(exports, "verifyMessage", { enumerable: true, get: function () { return __importDefault(verifyMessage_1).default; } });
var decodeKeyString_1 = require("./utils/crypto/decodeKeyString");
Object.defineProperty(exports, "decodeKeyString", { enumerable: true, get: function () { return __importDefault(decodeKeyString_1).default; } });
var decryptData_1 = require("./utils/crypto/decryptData");
Object.defineProperty(exports, "decryptData", { enumerable: true, get: function () { return __importDefault(decryptData_1).default; } });
var decryptWithPass_1 = require("./utils/crypto/decryptWithPass");
Object.defineProperty(exports, "decryptWithPass", { enumerable: true, get: function () { return __importDefault(decryptWithPass_1).default; } });
var deriveSecret_1 = require("./utils/crypto/deriveSecret");
Object.defineProperty(exports, "deriveSecret", { enumerable: true, get: function () { return __importDefault(deriveSecret_1).default; } });
var encodeKeyString_1 = require("./utils/crypto/encodeKeyString");
Object.defineProperty(exports, "encodeKeyString", { enumerable: true, get: function () { return __importDefault(encodeKeyString_1).default; } });
var encryptData_1 = require("./utils/crypto/encryptData");
Object.defineProperty(exports, "encryptData", { enumerable: true, get: function () { return __importDefault(encryptData_1).default; } });
var encryptWithPass_1 = require("./utils/crypto/encryptWithPass");
Object.defineProperty(exports, "encryptWithPass", { enumerable: true, get: function () { return __importDefault(encryptWithPass_1).default; } });
var exportKey_1 = require("./utils/crypto/exportKey");
Object.defineProperty(exports, "exportKey", { enumerable: true, get: function () { return __importDefault(exportKey_1).default; } });
var generateKeyFromPassword_1 = require("./utils/crypto/generateKeyFromPassword");
Object.defineProperty(exports, "generateKeyFromPassword", { enumerable: true, get: function () { return __importDefault(generateKeyFromPassword_1).default; } });
var generateKeyPair_1 = require("./utils/crypto/generateKeyPair");
Object.defineProperty(exports, "generateKeyPair", { enumerable: true, get: function () { return __importDefault(generateKeyPair_1).default; } });
var generateKeysComb_1 = require("./utils/crypto/generateKeysComb");
Object.defineProperty(exports, "generateKeysComb", { enumerable: true, get: function () { return __importDefault(generateKeysComb_1).default; } });
var importKey_1 = require("./utils/crypto/importKey");
Object.defineProperty(exports, "importKey", { enumerable: true, get: function () { return __importDefault(importKey_1).default; } });
var loadKeysComb_1 = require("./utils/crypto/loadKeysComb");
Object.defineProperty(exports, "loadKeysComb", { enumerable: true, get: function () { return __importDefault(loadKeysComb_1).default; } });
var saveKeysComb_1 = require("./utils/crypto/saveKeysComb");
Object.defineProperty(exports, "saveKeysComb", { enumerable: true, get: function () { return __importDefault(saveKeysComb_1).default; } });
var verifyData_1 = require("./utils/crypto/verifyData");
Object.defineProperty(exports, "verifyData", { enumerable: true, get: function () { return __importDefault(verifyData_1).default; } });
var customGun_1 = require("./customGun");
Object.defineProperty(exports, "customGun", { enumerable: true, get: function () { return __importDefault(customGun_1).default; } });
var toolDbService_1 = require("./toolDbService");
Object.defineProperty(exports, "ToolDbService", { enumerable: true, get: function () { return __importDefault(toolDbService_1).default; } });
var toolDbClient_1 = require("./toolDbClient");
Object.defineProperty(exports, "ToolDbClient", { enumerable: true, get: function () { return __importDefault(toolDbClient_1).default; } });
//# sourceMappingURL=index.js.map