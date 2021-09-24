"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toolDbClientOnMessage(message, socket // Hm browser websocket types??
) {
    return new Promise(function (resolve, reject) {
        // socket.send("something");
        console.log(message);
    });
}
exports.default = toolDbClientOnMessage;
//# sourceMappingURL=toolDbClientOnMessage.js.map