"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function fromBase64(str) {
    return decodeURIComponent(escape(window.atob(str)));
}
exports.default = fromBase64;
