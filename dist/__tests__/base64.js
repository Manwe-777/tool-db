"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var arrayBufferToBase64_1 = __importDefault(require("../utils/arrayBufferToBase64"));
var arrayBufferToString_1 = __importDefault(require("../utils/arrayBufferToString"));
var base64ToUint8_1 = __importDefault(require("../utils/base64ToUint8"));
var fromBase64_1 = __importDefault(require("../utils/fromBase64"));
var stringToArrayBuffer_1 = __importDefault(require("../utils/stringToArrayBuffer"));
var toBase64_1 = __importDefault(require("../utils/toBase64"));
var uint8ToBase64_1 = __importDefault(require("../utils/uint8ToBase64"));
var TestValue = "SomeVeryTest-yValue2";
function compare(a, b) {
    for (var i = a.length; -1 < i; i -= 1) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
var testUint8 = new Uint8Array([1, 2, 3, 4, 5, 6]);
var testArayBuffer = new ArrayBuffer(8);
var bufView = new Uint8Array(testArayBuffer);
bufView[0] = 71;
bufView[1] = 35;
bufView[2] = 52;
bufView[3] = 58;
bufView[4] = 62;
bufView[5] = 44;
bufView[6] = 38;
bufView[7] = 47;
it("Converts a string to base64", function () {
    expect((0, toBase64_1.default)(TestValue)).toEqual("U29tZVZlcnlUZXN0LXlWYWx1ZTI=");
    expect((0, toBase64_1.default)("Note, that is an important requirement which did not appear to be included at original Question?")).toEqual("Tm90ZSwgdGhhdCBpcyBhbiBpbXBvcnRhbnQgcmVxdWlyZW1lbnQgd2hpY2ggZGlkIG5vdCBhcHBlYXIgdG8gYmUgaW5jbHVkZWQgYXQgb3JpZ2luYWwgUXVlc3Rpb24/");
});
it("Converts base64 to string", function () {
    expect((0, fromBase64_1.default)("SGVsbG8gV29ybGQh")).toEqual("Hello World!");
    expect((0, fromBase64_1.default)("Tm90ZSwgdGhhdCBpcyBhbiBpbXBvcnRhbnQgcmVxdWlyZW1lbnQgd2hpY2ggZGlkIG5vdCBhcHBlYXIgdG8gYmUgaW5jbHVkZWQgYXQgb3JpZ2luYWwgUXVlc3Rpb24/")).toEqual("Note, that is an important requirement which did not appear to be included at original Question?");
});
it("Converts base64 to uint8", function () {
    var testVal = (0, base64ToUint8_1.default)("AQIDBAUG");
    expect(compare(testVal, testUint8)).toBeTruthy();
});
it("Converts uint8 to base64", function () {
    expect((0, uint8ToBase64_1.default)(new Uint8Array(20))).toEqual("AAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    expect((0, uint8ToBase64_1.default)(testUint8)).toEqual("AQIDBAUG");
});
it("Converts string to arraybuffer", function () {
    expect(compare((0, stringToArrayBuffer_1.default)("G#4:>,&/"), testArayBuffer)).toBeTruthy();
});
it("Converts arraybuffer to string", function () {
    expect((0, arrayBufferToString_1.default)(testArayBuffer)).toStrictEqual("G#4:>,&/");
});
it("Converts arraybuffer to base64", function () {
    expect((0, arrayBufferToBase64_1.default)(testArayBuffer)).toEqual("RyM0Oj4sJi8=");
});
//# sourceMappingURL=base64.js.map