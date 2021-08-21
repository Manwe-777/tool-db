"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyResult = void 0;
var VerifyResult;
(function (VerifyResult) {
    VerifyResult[VerifyResult["InvalidVerification"] = -6] = "InvalidVerification";
    VerifyResult[VerifyResult["InvalidTimestamp"] = -5] = "InvalidTimestamp";
    VerifyResult[VerifyResult["PubKeyMismatch"] = -4] = "PubKeyMismatch";
    VerifyResult[VerifyResult["NoProofOfWork"] = -3] = "NoProofOfWork";
    VerifyResult[VerifyResult["InvalidHashNonce"] = -2] = "InvalidHashNonce";
    VerifyResult[VerifyResult["InvalidSignature"] = -1] = "InvalidSignature";
    VerifyResult[VerifyResult["Verified"] = 1] = "Verified";
})(VerifyResult = exports.VerifyResult || (exports.VerifyResult = {}));
