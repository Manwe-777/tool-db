"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var encodeKeyString_1 = __importDefault(require("./utils/crypto/encodeKeyString"));
var exportKey_1 = __importDefault(require("./utils/crypto/exportKey"));
var generateKeysComb_1 = __importDefault(require("./utils/crypto/generateKeysComb"));
var randomAnimal_1 = __importDefault(require("./utils/randomAnimal"));
function toolDbAnonSignIn() {
    var _this = this;
    return (0, generateKeysComb_1.default)().then(function (newKeys) {
        return (0, exportKey_1.default)("spki", newKeys.signKeys.publicKey)
            .then(function (skpub) { return (0, encodeKeyString_1.default)(skpub); })
            .then(function (pubKey) {
            _this.user = {
                keys: newKeys,
                name: "Anonymous " + (0, randomAnimal_1.default)(),
                pubKey: pubKey,
            };
            return newKeys;
        });
    });
}
exports.default = toolDbAnonSignIn;
//# sourceMappingURL=toolDbAnonSignIn.js.map