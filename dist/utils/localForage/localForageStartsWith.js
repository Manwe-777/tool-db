"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var localforage_1 = __importDefault(require("localforage"));
function localForageStartsWith(key) {
    return localforage_1.default.startsWith(key);
}
exports.default = localForageStartsWith;
