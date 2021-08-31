"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var webcrypto_1 = require("@peculiar/webcrypto");
exports.default = jest.fn(function () {
    return new webcrypto_1.Crypto();
});
//# sourceMappingURL=getCrypto.js.map