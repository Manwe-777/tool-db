"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var message_1 = require("../types/message");
var verifyMessage_1 = __importDefault(require("../utils/verifyMessage"));
var catchReturn_1 = __importDefault(require("../utils/catchReturn"));
jest.mock("../getCrypto.ts");
var putOk = {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
};
it("Can verify PUT", function () {
    return (0, verifyMessage_1.default)(putOk).then(function (result) {
        expect(result).toEqual(message_1.VerifyResult.Verified);
    });
});
var putSig = {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z2fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
};
it("Can catch tampered messages (signature)", function () {
    return (0, verifyMessage_1.default)(putSig).then(function (result) {
        expect(result).toEqual(message_1.VerifyResult.InvalidSignature);
    });
});
it("Can print errors", function () { return __awaiter(void 0, void 0, void 0, function () {
    var rejectPromise, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                rejectPromise = new Promise(function (resolve, reject) {
                    reject();
                }).catch(catchReturn_1.default);
                _a = expect;
                return [4 /*yield*/, rejectPromise];
            case 1:
                _a.apply(void 0, [_b.sent()]).toBe(undefined);
                return [2 /*return*/];
        }
    });
}); });
var putTime = {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 2628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
};
it("Can catch tampered messages (time)", function () {
    return (0, verifyMessage_1.default)(putTime).then(function (result) {
        expect(result).toEqual(message_1.VerifyResult.InvalidTimestamp);
    });
});
var putPow = {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 1628918110150,
    hash: "00a6fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
};
it("Can catch tampered messages (pow)", function () {
    return (0, verifyMessage_1.default)(putPow).then(function (result) {
        expect(result).toEqual(message_1.VerifyResult.NoProofOfWork);
    });
});
var putNonce = {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 111,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
};
it("Can catch tampered messages (nonce)", function () {
    return (0, verifyMessage_1.default)(putNonce).then(function (result) {
        expect(result).toEqual(message_1.VerifyResult.InvalidHashNonce);
    });
});
var putValue = {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "hackerman",
};
it("Can catch tampered messages (value)", function () {
    return (0, verifyMessage_1.default)(putValue).then(function (result) {
        expect(result).toEqual(message_1.VerifyResult.InvalidHashNonce);
    });
});
var privatePut = {
    key: "~MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==.value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==",
    nonce: 1268,
    timestamp: 1628919444909,
    hash: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
    sig: "GcOBWcOLewbDu3HCvMKQAiAWw7XCi3LCrMOVw53Dk3zDn8K/WsKzO8K8MC82S8O9w6MFOcKKwrrCk8K+w7MBVULCh8Oew7nDryoTNhtGwqpHacOvXMOywpXDr3AkEnU=",
    value: { test: "a1AMXh4hZhI2lc5ONBa5" },
};
it("Can verify namespaced PUT", function () {
    return (0, verifyMessage_1.default)(privatePut).then(function (result) {
        expect(result).toEqual(message_1.VerifyResult.Verified);
    });
});
var privatePutPubkey = {
    key: "~MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Gw==.value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==",
    nonce: 1268,
    timestamp: 1628919444909,
    hash: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
    sig: "GcOBWcOLewbDu3HCvMKQAiAWw7XCi3LCrMOVw53Dk3zDn8K/WsKzO8K8MC82S8O9w6MFOcKKwrrCk8K+w7MBVULCh8Oew7nDryoTNhtGwqpHacOvXMOywpXDr3AkEnU=",
    value: { test: "a1AMXh4hZhI2lc5ONBa5" },
};
it("Can catch pubkey replacement", function () {
    return (0, verifyMessage_1.default)(privatePutPubkey).then(function (result) {
        expect(result).toEqual(message_1.VerifyResult.PubKeyMismatch);
    });
});
//# sourceMappingURL=verify.js.map