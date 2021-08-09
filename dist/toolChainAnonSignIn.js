"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var generateKeysComb_1 = __importDefault(require("./utils/crypto/generateKeysComb"));
var randomAnimal_1 = __importDefault(require("./utils/randomAnimal"));
function toolChainAnonSignIn() {
    var _this = this;
    return generateKeysComb_1.default().then(function (newKeys) {
        _this.user = { keys: newKeys, name: "Anonymous " + randomAnimal_1.default() };
        return newKeys;
    });
}
exports.default = toolChainAnonSignIn;
