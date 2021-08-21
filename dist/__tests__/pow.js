"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var proofOfWork_1 = __importDefault(require("../utils/proofOfWork"));
var sha256_1 = __importDefault(require("../utils/sha256"));
it("Proof of work values are correct", function () {
    var TestValue = "SomeVeryTest-yValue";
    return proofOfWork_1.default(TestValue, 3).then(function (hash) {
        expect(hash.hash.slice(0, 3)).toEqual("000");
        expect(sha256_1.default("" + TestValue + hash.nonce)).toBe(hash.hash);
    });
});
it("Proof of work is hard", function () {
    var TestValue = "SomeVeryTest-yValue";
    var initTime = new Date().getTime();
    return proofOfWork_1.default(TestValue, 5).then(function (hash) {
        expect(hash.hash.slice(0, 5)).toEqual("00000");
        var endTime = new Date().getTime();
        expect(endTime - initTime).toBeGreaterThan(1000);
    });
});
