"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = __importDefault(require("ws"));
var WSS = /** @class */ (function () {
    function WSS(db) {
        var _this = this;
        // eslint-disable-next-line no-undef
        this.wnd = typeof window === "undefined" ? undefined : window;
        this._wss = this.wnd
            ? this.wnd.WebSocket || this.wnd.webkitWebSocket || this.wnd.mozWebSocket
            : ws_1.default;
        this.server = null;
        this._connections = {};
        this._activePeers = [];
        /**
         * Open a connection to a federated server
         * @param url URL of the server (including port)
         * @returns websocket
         */
        this.open = function (url) {
            try {
                var wsUrl = url.replace(/^http/, "ws");
                var wss_1 = new _this._wss(wsUrl);
                wss_1.onclose = function (e) {
                    if (_this._activePeers.includes(url)) {
                        _this._activePeers.splice(_this._activePeers.indexOf(url), 1);
                    }
                    _this.reconnect(url);
                };
                wss_1.onerror = function (_error) {
                    if (_this._activePeers.includes(url)) {
                        _this._activePeers.splice(_this._activePeers.indexOf(url), 1);
                    }
                    _this.reconnect(url);
                };
                wss_1.onopen = function () {
                    if (!_this._activePeers.includes(url)) {
                        _this._activePeers.push(url);
                    }
                    _this._connections[url].tries = 0;
                    // hi peer
                };
                wss_1.onmessage = function (msg) {
                    if (!msg) {
                        return;
                    }
                    _this.tooldb.clientOnMessage(msg, wss_1);
                };
                return wss_1;
            }
            catch (e) {
                console.warn(e);
            }
            return undefined;
        };
        this.reconnect = function (url) {
            var peer = _this._connections[url];
            if (peer.defer) {
                clearTimeout(peer.defer);
            }
            if (peer.tries < _this.options.maxRetries) {
                var defer = function () {
                    peer.tries += 1;
                    console.log("Retry");
                    _this.open(url);
                };
                peer.defer = setTimeout(defer, _this.options.wait);
            }
            else {
                console.warn("Connection attempts to " + url + " exceeded.");
            }
        };
        this._tooldb = db;
        this.options = db.options;
        this.options.peers.forEach(function (url) {
            var conn = _this.open(url);
            _this._connections[url] = { tries: 0, peer: conn, defer: null };
        });
        if (this.options.server) {
            this.server = new ws_1.default.Server({ port: this.options.port });
            this.server.on("connection", function (socket) {
                socket.on("message", function (message) {
                    console.log("received: ", message);
                    _this.tooldb.serverOnMessage(message, socket);
                });
            });
        }
    }
    Object.defineProperty(WSS.prototype, "activePeers", {
        get: function () {
            return this._activePeers;
        },
        enumerable: false,
        configurable: true
    });
    WSS.prototype.send = function (msg) {
        Object.values(this._connections).forEach(function (conn) {
            if (conn.peer) {
                conn.peer.send(JSON.stringify(msg));
            }
        });
    };
    Object.defineProperty(WSS.prototype, "tooldb", {
        get: function () {
            return this._tooldb;
        },
        enumerable: false,
        configurable: true
    });
    return WSS;
}());
exports.default = WSS;
//# sourceMappingURL=wss.js.map