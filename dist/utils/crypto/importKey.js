"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// JsonWebKey
function importKey(
// eslint-disable-next-line no-undef
key, type, algorithm, 
// eslint-disable-next-line no-undef
ops) {
    return window.crypto.subtle.importKey(type, // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    key, {
        name: algorithm,
        namedCurve: "P-256",
    }, true, // whether the key is extractable (i.e. can be used in exportKey)
    ops // "verify" for public key import, "sign" for private key imports
    );
}
exports.default = importKey;
