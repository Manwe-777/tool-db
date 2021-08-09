"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function generateIv() {
    return window.crypto.getRandomValues(new Uint8Array(12));
}
exports.default = generateIv;
