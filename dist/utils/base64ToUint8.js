"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fromBase64_1 = __importDefault(require("./fromBase64"));
function base64ToUint8(based) {
    var str = (0, fromBase64_1.default)(based);
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i += 1) {
        bufView[i] = str.charCodeAt(i);
    }
    return bufView;
}
exports.default = base64ToUint8;
//# sourceMappingURL=base64ToUint8.js.map