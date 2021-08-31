"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function fromBase64(str) {
    return decodeURIComponent(escape(global.atob(str)));
}
exports.default = fromBase64;
//# sourceMappingURL=fromBase64.js.map