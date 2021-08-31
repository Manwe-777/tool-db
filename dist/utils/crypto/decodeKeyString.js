"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var stringToArrayBuffer_1 = __importDefault(require("../stringToArrayBuffer"));
function decodeKeyString(keydataB64) {
    var keydataS = global.atob(keydataB64);
    var keydata = stringToArrayBuffer_1.default(keydataS);
    return keydata;
}
exports.default = decodeKeyString;
