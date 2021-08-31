"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var webcrypto_1 = require("@peculiar/webcrypto");
function getCrypto() {
    if (typeof window === "undefined") {
        return require("crypto").webcrypto;
    }
    // eslint-disable-next-line no-undef
    if (process && process.env.JEST_WORKER_ID) {
        global.crypto = new webcrypto_1.Crypto();
    }
    if (global.crypto) {
        return global.crypto;
    }
    return window.crypto;
}
exports.default = getCrypto;
//# sourceMappingURL=getCrypto.js.map