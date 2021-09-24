"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
function toolDbServerOnMessage(message, socket) {
    return new Promise(function (resolve, reject) {
        // socket.send("something");
        console.log(message);
    });
}
exports.default = toolDbServerOnMessage;
//# sourceMappingURL=toolDbServerOnMessage.js.map