"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fromBase64_1 = __importDefault(require("./fromBase64"));
var stringToArrayBuffer_1 = __importDefault(require("./stringToArrayBuffer"));
function base64ToArrayBuffer(str) {
    return (0, stringToArrayBuffer_1.default)((0, fromBase64_1.default)(str));
}
exports.default = base64ToArrayBuffer;
//# sourceMappingURL=base64ToArrayBuffer.js.map