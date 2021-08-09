"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toBase64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}
exports.default = toBase64;
