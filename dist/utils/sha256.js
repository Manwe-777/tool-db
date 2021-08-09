"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = __importDefault(require("crypto"));
function sha256(str, hex) {
    if (hex === void 0) { hex = true; }
    var hash = crypto_1.default.createHash("sha256");
    hash.update(str);
    return hash.digest(hex ? "hex" : "base64");
}
exports.default = sha256;
