"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var arrayBufferToString_1 = __importDefault(require("./arrayBufferToString"));
var toBase64_1 = __importDefault(require("./toBase64"));
function arrayBufferToBase64(arr) {
    return toBase64_1.default(arrayBufferToString_1.default(arr));
}
exports.default = arrayBufferToBase64;
