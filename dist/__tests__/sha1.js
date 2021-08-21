"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var sha1_1 = __importDefault(require("../utils/sha1"));
it("Hashes with sha1/hex", function () {
    var TestValue = "SomeVeryTest-yValue2";
    expect(sha1_1.default(TestValue, true)).toEqual("11d5bececd3082b8b1d5d97c544337f208673ec5");
    expect(sha1_1.default(TestValue)).toEqual("11d5bececd3082b8b1d5d97c544337f208673ec5");
});
it("Hashes with sha1/base64", function () {
    var TestValue = "SomeVeryTest-yValue2";
    expect(sha1_1.default(TestValue, false)).toEqual("EdW+zs0wgrix1dl8VEM38ghnPsU=");
});
