"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require(".");
var toolDbVerificationWrapper_1 = __importDefault(require("./toolDbVerificationWrapper"));
function toolDbClientOnMessage(data, socket // Hm browser websocket types??
) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        if (typeof data === "string") {
            var message_1 = JSON.parse(data);
            console.log(message_1);
            // Check if we are listening for this ID
            if (message_1.id) {
                var msgId = message_1.id;
                if (_this._idListeners[msgId]) {
                    _this._idListeners[msgId](message_1);
                    _this.removeIdListener(msgId);
                }
            }
            if (message_1.type === "get") {
                _this.store.get(message_1.key, function (err, data) {
                    if (!err) {
                        socket.send(data);
                    }
                    else {
                        socket.send(data);
                    }
                });
            }
            if (message_1.type === "put") {
                toolDbVerificationWrapper_1.default.call(_this, message_1).then(function (value) {
                    if (value === _1.VerifyResult.Verified) {
                        var key_1 = message_1.key;
                        _this._keyListeners.forEach(function (listener) {
                            if ((listener === null || listener === void 0 ? void 0 : listener.key) === key_1) {
                                listener.timeout = setTimeout(function () { return listener.fn(message_1); }, 100);
                            }
                        });
                        _this.store.put(message_1.key, message_1, function (err, data) {
                            //
                        });
                    }
                });
            }
        }
    });
}
exports.default = toolDbClientOnMessage;
//# sourceMappingURL=toolDbClientOnMessage.js.map