"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function deriveSecret(keys) {
    return window.crypto.subtle.deriveKey({
        name: "ECDH",
        public: keys.publicKey,
    }, keys.privateKey, {
        name: "AES-GCM",
        length: 256,
    }, true, ["encrypt", "decrypt"]);
}
exports.default = deriveSecret;
