"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function textRandom(_l, _c) {
    if (_l === void 0) { _l = 24; }
    var l = _l;
    var s = "";
    var c = _c || "0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz";
    while (l > 0) {
        s += c.charAt(Math.floor(Math.random() * c.length));
        l -= 1;
    }
    return s;
}
exports.default = textRandom;
