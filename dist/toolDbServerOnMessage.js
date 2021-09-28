"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var automerge_1 = __importDefault(require("automerge"));
function toolDbServerOnMessage(data, socket) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        console.log("server got:", data);
        if (typeof data === "string") {
            var message = JSON.parse(data);
            if (message.type === "get") {
                var doc_1;
                if (_this.documents[message.key]) {
                    doc_1 = _this.documents[message.key];
                }
                else {
                    _this.store.get(message.key, function (err, data) {
                        if (!err) {
                            console.log("Automerge load data from db", data);
                            doc_1 = automerge_1.default.load(data);
                        }
                    });
                }
                if (doc_1) {
                    socket.send({});
                }
                else {
                    // say we got nothing
                }
            }
            if (message.type === "put") {
                _this.store.put(message.key, message, function (err, data) {
                    //
                });
            }
        }
    });
}
exports.default = toolDbServerOnMessage;
//# sourceMappingURL=toolDbServerOnMessage.js.map