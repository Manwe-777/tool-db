"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tooldb_1 = __importDefault(require("./tooldb"));
console.log("Starting server..");
var server = new tooldb_1.default({
    port: 8080,
    server: true,
});
//# sourceMappingURL=server.js.map