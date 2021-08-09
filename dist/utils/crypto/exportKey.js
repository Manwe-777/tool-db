"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function exportKey(format, key) {
    return window.crypto.subtle.exportKey(format, // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    key // can be a publicKey or privateKey, as long as extractable was true,
    );
}
exports.default = exportKey;
