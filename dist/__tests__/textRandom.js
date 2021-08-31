"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var textRandom_1 = __importDefault(require("../utils/textRandom"));
it("Creates random text", function () {
    expect((0, textRandom_1.default)(10)).toHaveLength(10);
});
it("Creates random text based on charset", function () {
    expect((0, textRandom_1.default)()).toHaveLength(24);
    expect((0, textRandom_1.default)(10)).toHaveLength(10);
    expect((0, textRandom_1.default)(50, "abcd").indexOf("e")).toBe(-1);
    expect((0, textRandom_1.default)(50, "abcdgf").indexOf("1")).toBe(-1);
    expect((0, textRandom_1.default)(50, "abcd1324").indexOf("A")).toBe(-1);
});
//# sourceMappingURL=textRandom.js.map