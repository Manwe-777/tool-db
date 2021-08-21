"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var sha256_1 = __importDefault(require("../utils/sha256"));
it("Hashes with sha256/hex", function () {
    var TestValue = "SomeVeryTest-yValue2";
    expect(sha256_1.default(TestValue, true)).toEqual("d3fd50758c6dc903a8b89afb895bc9224be3c276a0d5f94da315b583b485f4d0");
    expect(sha256_1.default(TestValue)).toEqual("d3fd50758c6dc903a8b89afb895bc9224be3c276a0d5f94da315b583b485f4d0");
});
it("Hashes with sha256/base64", function () {
    var TestValue = "SomeVeryTest-yValue2";
    expect(sha256_1.default(TestValue, false)).toEqual("0/1QdYxtyQOouJr7iVvJIkvjwnag1flNoxW1g7SF9NA=");
});
