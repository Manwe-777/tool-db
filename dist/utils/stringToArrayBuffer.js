"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function stringToArrayBuffer(str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i += 1) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}
exports.default = stringToArrayBuffer;
//# sourceMappingURL=stringToArrayBuffer.js.map