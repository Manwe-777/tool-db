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
/* eslint-disable @typescript-eslint/no-unused-vars */
var peerjs_1 = __importDefault(require("peerjs"));
var toolChainAnonSignIn_1 = __importDefault(require("./toolChainAnonSignIn"));
var toolChainGet_1 = __importDefault(require("./toolChainGet"));
var toolChainGetPubKey_1 = __importDefault(require("./toolChainGetPubKey"));
var toolChainPut_1 = __importDefault(require("./toolChainPut"));
var toolChainSignIn_1 = __importDefault(require("./toolChainSignIn"));
var toolChainSignUp_1 = __importDefault(require("./toolChainSignUp"));
var localForageInit_1 = __importDefault(require("./utils/localForage/localForageInit"));
var localForageRead_1 = __importDefault(require("./utils/localForage/localForageRead"));
var localForageWrite_1 = __importDefault(require("./utils/localForage/localForageWrite"));
var sha256_1 = __importDefault(require("./utils/sha256"));
var verifyMessage_1 = __importDefault(require("./utils/verifyMessage"));
var ToolChain = /** @class */ (function () {
    function ToolChain(namespace, debug) {
        var _this = this;
        if (debug === void 0) { debug = false; }
        this.connectionsList = {};
        this.namespace = "";
        this.currentPeerId = this.generateNewId();
        this.debug = false;
        this.peersList = [];
        /**
         * Basic usage
         */
        this.getData = toolChainGet_1.default;
        this.putData = toolChainPut_1.default;
        this.getPubKey = toolChainGetPubKey_1.default;
        this.signIn = toolChainSignIn_1.default;
        this.anonSignIn = toolChainAnonSignIn_1.default;
        this.signUp = toolChainSignUp_1.default;
        /**
         * These can be customized depending on your db of choice.
         */
        this.dbInit = localForageInit_1.default;
        this.dbRead = localForageRead_1.default;
        this.dbWrite = localForageWrite_1.default;
        /**
         * More customizable stuff
         */
        this.onConnected = function () {
            //
        };
        this.onPeerConnected = function (id) {
            //
        };
        this.onMessage = function (msg, peerId) {
            //
        };
        /**
         * Private stuff
         */
        this.messagesIndex = {};
        this.keyListeners = {};
        this.keyUpdateListeners = {};
        this.user = undefined;
        this._listenForKey = function (key, fn) {
            _this.keyListeners[key] = fn;
        };
        this._listenForKeyUpdate = function (key, fn) {
            _this.keyUpdateListeners[key] = fn;
        };
        this._customPutVerification = {};
        this._customGetVerification = {};
        /**
         * Adds an extra verification step for messages of type PUT at the given key.
         * You can compare against a previously stored value using the value given at the callback.
         * The callback should return a boolean for if the message passed the verification step.
         * @param key data key
         * @param fn (stored, incoming) => boolean
         */
        this.addPutVerification = function (key, fn) {
            _this._customPutVerification[key] = fn;
        };
        /**
         * Adds an extra verification step for messages of type GET at the given key.
         * You can compare against a previously stored value using the value given at the callback.
         * The callback should return a boolean for if the message passed the verification step.
         * @param key data key
         * @param fn (stored, incoming) => boolean
         */
        this.addGetVerification = function (key, fn) {
            _this._customGetVerification[key] = fn;
        };
        this._onMessageWrapper = function (msg, peerId) { return __awaiter(_this, void 0, void 0, function () {
            var verified, oldValue, oldValue;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // This wrapper functions filters out those messages we already handled from the listener
                        // It also takes care of verification, data persistence and low level handling
                        if (!this.messagesIndex[msg.hash])
                            this.messagesIndex[msg.hash] = [];
                        if (!!this.messagesIndex[msg.hash].includes(peerId)) return [3 /*break*/, 6];
                        this.messagesIndex[msg.hash].push(peerId);
                        return [4 /*yield*/, verifyMessage_1.default(msg)];
                    case 1:
                        verified = _a.sent();
                        if (!verified) return [3 /*break*/, 5];
                        if (!(msg.type === "put" && this._customPutVerification[msg.val.key])) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.dbRead(msg.val.key)];
                    case 2:
                        oldValue = _a.sent();
                        verified = this._customPutVerification[msg.val.key](oldValue || undefined, msg);
                        _a.label = 3;
                    case 3:
                        if (!(msg.type === "get" && this._customPutVerification[msg.key])) return [3 /*break*/, 5];
                        console.log(this._customPutVerification[msg.key]);
                        return [4 /*yield*/, this.dbRead(msg.key)];
                    case 4:
                        oldValue = _a.sent();
                        verified = this._customGetVerification[msg.key](oldValue || undefined, msg);
                        _a.label = 5;
                    case 5:
                        if (verified) {
                            switch (msg.type) {
                                case "put":
                                    this.msgPutHandler(msg);
                                    break;
                                case "get":
                                    this.msgGetHandler(msg);
                                    break;
                                case "get-peersync":
                                    this.msgGetPeerSync(msg);
                                    break;
                                case "set-peersync":
                                    this.msgSetPeerSync(msg);
                                    break;
                                default: break;
                            }
                            this.onMessage(msg, peerId);
                            // Relay, should be optional
                            this.sendMessage(msg);
                        }
                        else if (verified === false) {
                            console.warn("Could not verify message integrity;", msg);
                            console.warn("This action by should block the peer from reaching us again");
                        }
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        this.namespace = namespace;
        this.currentPeerId = this.generateNewId();
        this.debug = debug;
        window.chainData = {};
        window.toolchain = this;
    }
    Object.defineProperty(ToolChain.prototype, "listenForKey", {
        get: function () {
            return this._listenForKey;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ToolChain.prototype, "addKeyUpdateListener", {
        /**
         * Adds a callback listener for the given key.
         * Can be removed using removeKeyUpdateListener(key)
         */
        get: function () {
            return this._listenForKeyUpdate;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Removes the updates listener on the given key, if any.
     * @param key string
     */
    ToolChain.prototype.removeKeyUpdateListener = function (key) {
        delete this.keyUpdateListeners[key];
    };
    ToolChain.prototype.checkMessageIndex = function (hash, peerId) {
        if (this.messagesIndex[hash] && !this.messagesIndex[hash].includes(peerId)) {
            this.messagesIndex[hash].push(peerId);
        }
        else {
            this.messagesIndex[hash] = [peerId];
        }
    };
    ToolChain.prototype.msgPutHandler = function (msg) {
        return __awaiter(this, void 0, void 0, function () {
            var oldValue;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.dbRead(msg.val.key)];
                    case 1:
                        oldValue = _a.sent();
                        // console.log("PUT", msg, oldValue);
                        if (this.keyListeners[msg.val.key]) {
                            this.keyListeners[msg.val.key](msg.val.value);
                            delete this.keyListeners[msg.val.key];
                        }
                        if (!oldValue ||
                            (oldValue.timestamp < msg.val.timestamp &&
                                (msg.val.key.slice(0, 1) == "~"
                                    ? oldValue.pub === msg.val.pub
                                    : true))) {
                            this.dbWrite(msg.val.key, msg.val);
                            if (this.keyUpdateListeners[msg.val.key]) {
                                this.keyUpdateListeners[msg.val.key](msg.val.value);
                            }
                            // window.chainData[msg.val.key] = msg.val;
                        }
                        else {
                            // console.warn(`Skip message write!`, oldValue, msg);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ToolChain.prototype.msgGetHandler = function (msg) {
        return __awaiter(this, void 0, void 0, function () {
            var oldValue, oldConnection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.dbRead(msg.key)];
                    case 1:
                        oldValue = _a.sent();
                        // window.chainData[msg.key] = oldValue;
                        // console.log("GET", msg, oldValue);
                        if (oldValue) {
                            oldConnection = this.connectionsList[msg.source];
                            if (oldConnection) {
                                // Reply with message data
                                oldConnection.send({
                                    type: "put",
                                    hash: oldValue.hash,
                                    val: oldValue,
                                });
                            }
                            else {
                                // Connect and reply with message data
                                this.connectTo(msg.source).then(function (connection) {
                                    return connection.send({
                                        type: "put",
                                        hash: oldValue.hash,
                                        val: oldValue,
                                    });
                                });
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ToolChain.prototype.msgGetPeerSync = function (msg) {
    };
    ToolChain.prototype.msgSetPeerSync = function (msg) {
    };
    ToolChain.prototype.generateNewId = function () {
        return this.namespace + "-" + sha256_1.default(new Date().getTime() + "-"
            + Math.round(Math.random() * 99999999));
    };
    Object.defineProperty(ToolChain.prototype, "id", {
        get: function () {
            return this.currentPeerId;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ToolChain.prototype, "getPeer", {
        get: function () {
            return this.currentPeer;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ToolChain.prototype, "getConnections", {
        get: function () {
            return this.connectionsList;
        },
        enumerable: false,
        configurable: true
    });
    ToolChain.prototype.connectTo = function (id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.currentPeer) {
                reject();
                return;
            }
            var newConn = _this.currentPeer.connect(id, {
                reliable: true,
            });
            newConn.on("data", function (d) { return _this._onMessageWrapper(d, id); });
            newConn.on("error", function (err) {
                if (_this.debug)
                    console.log("ERR", err);
            });
            newConn.on("close", function () {
                delete _this.connectionsList[id];
                if (_this.debug)
                    console.error("Connection to " + id + " closed");
                if (Object.keys(_this.connectionsList).length < 1) {
                    _this.findNewPeers();
                }
            });
            newConn.on("open", function () {
                _this.connectionsList[id] = newConn;
                if (_this.debug)
                    console.info("Connected to " + id);
                resolve(newConn);
            });
        });
    };
    ToolChain.prototype.findNewPeers = function () {
        var _this = this;
        if (!this.currentPeer)
            return;
        this.currentPeer.listAllPeers(function (peers) {
            // List all peers from server and chose some of them randomly to connect to
            // Make sure we dont select ourselves!
            var myIndex = peers.indexOf(_this.currentPeerId || "");
            peers.splice(myIndex, 1);
            // console.log("All peers: ", peers);
            var selected = [];
            // Get the max ammount of connections we need
            // We use a cubic root since we expect to have a lot of peers.
            var maxConnections = peers.length > 2 ? Math.floor(Math.log(peers.length) / Math.log(3)) : 1;
            if (peers.length === 0)
                maxConnections = 0;
            // position to start the picking loop
            // Pick the one at half the list, deterministic values help
            var pos = Math.floor(peers.length / 2); // Math.floor(Math.random() * peers.length);
            // Start picks
            var n = 0;
            while (n < maxConnections) {
                // advance as cubic then start from zero (mod) if we exceed the array size
                var index = (pos + Math.pow(3, n)) % peers.length;
                if (!selected.includes(peers[index])) {
                    selected.push(peers[index]);
                }
                n += 1;
            }
            if (_this.debug) {
                console.log("Peers to connect to", selected);
            }
            selected.forEach(function (id) { return _this.connectTo(id); });
        });
    };
    ToolChain.prototype.finishInitPeer = function () {
        var _this = this;
        if (this.currentPeer) {
            this.findNewPeers();
            // On Peer disconnection
            this.currentPeer.on("disconnected", function () {
                if (_this.debug)
                    console.info("Disconnected");
            });
            this.currentPeer.on("close", function () {
                if (_this.debug)
                    console.info("Client closed");
            });
            // Incoming Peer connection
            this.currentPeer.on("connection", function (c) {
                // connection incoming, nothing is set yet
                // console.log(`${c.peer} attempting to connect..`);
                c.on("open", function () {
                    if (_this.debug) {
                        console.log("Connection with peer " + c.peer + " established.");
                    }
                    _this.onPeerConnected(c.peer);
                    _this.connectionsList[c.peer] = c;
                });
                c.on("data", function (d) { return _this._onMessageWrapper(d, c.peer); });
                c.on("close", function () {
                    delete _this.connectionsList[c.peer];
                    if (_this.debug) {
                        console.info(" > " + c.peer + " disconnected.");
                    }
                    if (Object.keys(_this.connectionsList).length < 1) {
                        _this.findNewPeers();
                    }
                });
            });
        }
    };
    ToolChain.prototype.initialize = function () {
        var _this = this;
        this.dbInit();
        var id = this.currentPeerId;
        if (this.debug)
            console.log("|| initialize with id: " + id);
        this.currentPeer = new peerjs_1.default(id, {
            host: "api.mtgatool.com",
            port: 9000,
            path: "peer",
        });
        // On Peer open to peerserver
        this.currentPeer.on("open", function (_id) {
            console.log("✔ Connected to peerserver as", _id);
            _this.finishInitPeer();
            _this.onConnected();
        });
        this.currentPeer.on("error", function (err) {
            if (_this.debug)
                console.error(err, err.type);
            if (err.type === "network" || err.type === "server-error") {
                _this.disconnect();
                _this.currentPeerId = _this.generateNewId();
                setTimeout(function () { return _this.initialize(); }, 3000);
            }
        });
    };
    ToolChain.prototype.disconnect = function () {
        if (this.currentPeer) {
            this.currentPeer.disconnect();
            this.currentPeer.destroy();
        }
    };
    ToolChain.prototype.sendMessage = function (msg) {
        var _this = this;
        this.checkMessageIndex(msg.hash, this.currentPeerId);
        if (msg.type === "put") {
            this.dbWrite(msg.val.key, msg.val);
            if (this.keyUpdateListeners[msg.val.key]) {
                this.keyUpdateListeners[msg.val.key](msg.val.value);
            }
            // window.chainData[msg.val.key] = msg.val;
        }
        Object.values(this.connectionsList).forEach(function (conn) {
            // console.log(conn);
            if (conn) {
                _this.checkMessageIndex(msg.hash, conn.peer);
                conn.send(msg);
            }
        });
    };
    return ToolChain;
}());
exports.default = ToolChain;
