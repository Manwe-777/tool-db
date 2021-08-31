"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function arrayBufferToString(arr) {
    var byteArray = new Uint8Array(arr);
    var byteString = "";
    for (var i = 0; i < byteArray.byteLength; i += 1) {
        byteString += String.fromCodePoint(byteArray[i]);
    }
    return byteString;
}
exports.default = arrayBufferToString;
//# sourceMappingURL=arrayBufferToString.js.map