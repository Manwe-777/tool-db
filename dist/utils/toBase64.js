"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toBase64(str) {
    return global.btoa(unescape(encodeURIComponent(str)));
}
exports.default = toBase64;
//# sourceMappingURL=toBase64.js.map