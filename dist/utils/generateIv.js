"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getCrypto_1 = __importDefault(require("../getCrypto"));
function generateIv() {
    var crypto = (0, getCrypto_1.default)();
    return crypto.getRandomValues(new Uint8Array(12));
}
exports.default = generateIv;
//# sourceMappingURL=generateIv.js.map