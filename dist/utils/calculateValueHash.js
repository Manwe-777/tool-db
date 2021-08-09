"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var sha256_1 = __importDefault(require("./sha256"));
function calculateValueHash(value, revision, nonce) {
    // const time = new Date().getTime();
    return sha256_1.default("" + value + nonce + revision);
}
exports.default = calculateValueHash;
