"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var sha256_1 = __importDefault(require("./sha256"));
function proofOfWork(value, difficulty) {
    return new Promise(function (resolve) {
        var nonce = 0;
        var hash = "";
        while (hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            nonce += 1;
            hash = (0, sha256_1.default)("" + value + nonce);
        }
        resolve({ nonce: nonce, hash: hash });
    });
}
exports.default = proofOfWork;
//# sourceMappingURL=proofOfWork.js.map