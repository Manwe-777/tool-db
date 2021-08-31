"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var arrayBufferToString_1 = __importDefault(require("../arrayBufferToString"));
function encodeKeyString(keydata) {
    var keydataS = arrayBufferToString_1.default(keydata);
    var keydataB64 = global.btoa(keydataS);
    return keydataB64;
}
exports.default = encodeKeyString;
