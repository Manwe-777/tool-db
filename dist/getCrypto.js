"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getCrypto() {
    if (typeof window === "undefined") {
        return require("crypto").webcrypto;
    }
    return window.crypto;
}
exports.default = getCrypto;
//# sourceMappingURL=getCrypto.js.map