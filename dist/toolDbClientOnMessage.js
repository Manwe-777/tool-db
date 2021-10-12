"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
            console.log("toolDbClientOnMessage", message_1);
            // Check if we are listening for this ID
            if (message_1.id) {
                var msgId = message_1.id;
                if (_this._idListeners[msgId]) {
                    _this._idListeners[msgId](message_1);
                    _this.removeIdListener(msgId);
                }
            }
            if (message_1.type === "ping") {
                socket.send(JSON.stringify({
                    type: "pong",
                    id: message_1.id,
                }));
            }
            if (message_1.type === "subscribe") {
                _this.addKeyListener(message_1.key, function (msg) {
                    if (msg.type === "put") {
                        socket.send(JSON.stringify(msg));
                    }
                });
                // basically the exact same as GET, below
                _this.store.get(message_1.key, function (err, data) {
                    if (!err) {
                        var oldData = __assign(__assign({}, JSON.parse(data)), { id: message_1.id });
                        socket.send(JSON.stringify(oldData));
                    }
                });
            }
            if (message_1.type === "get") {
                _this.store.get(message_1.key, function (err, data) {
                    if (!err) {
                        // Use the id of the get so the other client knows we are replying
                        var oldData = __assign(__assign({}, JSON.parse(data)), { id: message_1.id });
                        socket.send(JSON.stringify(oldData));
                    }
                    else {
                        // socket.send(data);
                    }
                });
            }
            if (message_1.type === "put") {
                toolDbVerificationWrapper_1.default.call(_this, message_1).then(function (value) {
                    if (value === _1.VerifyResult.Verified) {
                        var key_1 = message_1.k;
                        _this._keyListeners.forEach(function (listener) {
                            if ((listener === null || listener === void 0 ? void 0 : listener.key) === key_1) {
                                listener.timeout = setTimeout(function () { return listener.fn(message_1); }, 100);
                            }
                        });
                        _this.store.put(message_1.k, JSON.stringify(message_1), function (err, data) {
                            //
                        });
                    }
                    else {
                        console.log("unverified message", value, message_1);
                    }
                });
            }
        }
    });
}
exports.default = toolDbClientOnMessage;
//# sourceMappingURL=toolDbClientOnMessage.js.map