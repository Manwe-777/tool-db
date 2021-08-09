"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var toBase64_1 = __importDefault(require("./toBase64"));
function uint8ToBase64(byteArray) {
    var byteString = "";
    for (var i = 0; i < byteArray.byteLength; i += 1) {
        byteString += String.fromCodePoint(byteArray[i]);
    }
    return toBase64_1.default(byteString);
}
exports.default = uint8ToBase64;
