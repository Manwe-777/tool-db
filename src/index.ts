/* eslint-disable @typescript-eslint/no-unused-vars */
import Peer from "peerjs";
import toolChainAnonSignIn from "./toolChainAnonSignIn";
import toolChainGet from "./toolChainGet";
import toolChainGetPubKey from "./toolChainGetPubKey";
import toolChainPut from "./toolChainPut";
import toolChainSignIn from "./toolChainSignIn";
import toolChainSignUp from "./toolChainSignUp";
import { GraphEntryValue } from "./types/graph";
import { AnyMessage, MessageGet, MessageGetPeerSync, MessagePut, MessageSetPeerSync } from "./types/message";
import { KeyPair } from "./utils/crypto/generateKeyPair";
import localForageInit from "./utils/localForage/localForageInit";
import localForageRead from "./utils/localForage/localForageRead";
import localForageWrite from "./utils/localForage/localForageWrite";
import sha256 from "./utils/sha256";
import verifyMessage from "./utils/verifyMessage";

class ToolChain {
  private currentPeer: Peer | undefined;

  private connectionsList: Record<string, Peer.DataConnection | null> = {};

  private namespace = "";

  private currentPeerId = this.generateNewId();

  private debug = false;

  private peersList: string[] = [];

  /**
   * Basic usage
   */
  public getData = toolChainGet;

  public putData = toolChainPut;

  public getPubKey = toolChainGetPubKey;

  public signIn = toolChainSignIn;

  public anonSignIn = toolChainAnonSignIn;

  public signUp = toolChainSignUp;

  /**
   * These can be customized depending on your db of choice.
   */
  public dbInit = localForageInit;

  public dbRead = localForageRead;

  public dbWrite = localForageWrite;

  /**
   * More customizable stuff
   */
  public onConnected = () => {
    //
  };

  public onPeerConnected = (id: string) => {
    //
  };

  public onMessage = (msg: AnyMessage, peerId: string) => {
    //
  };

  /**
   * Private stuff
   */
  private messagesIndex = {} as Record<string, string[]>;

  private keyListeners = {} as Record<string, (val: any) => void>;

  private keyUpdateListeners = {} as Record<string, (val: any) => void>;

  public user = undefined as
    | undefined
    | {
      keys: {
        signKeys: KeyPair;
        encryptionKeys: KeyPair;
      };
      name: string;
    };

  private _listenForKey = (key: string, fn: (val: any) => void): void => {
    this.keyListeners[key] = fn;
  };

  private _listenForKeyUpdate = (key: string, fn: (val: any) => void): void => {
    this.keyUpdateListeners[key] = fn;
  };

  get listenForKey() {
    return this._listenForKey;
  }

  /**
   * Adds a callback listener for the given key.
   * Can be removed using removeKeyUpdateListener(key)
   */
  get addKeyUpdateListener() {
    return this._listenForKeyUpdate;
  }

  /**
   * Removes the updates listener on the given key, if any.
   * @param key string
   */
  public removeKeyUpdateListener(key: string) {
    delete this.keyUpdateListeners[key];
  }

  private _customPutVerification: Record<
    string,
    (oldMessage: GraphEntryValue | undefined, msg: MessagePut) => boolean
  > = {};

  private _customGetVerification: Record<
    string,
    (oldMessage: GraphEntryValue | undefined, msg: MessageGet) => boolean
  > = {};

  /**
   * Adds an extra verification step for messages of type PUT at the given key.
   * You can compare against a previously stored value using the value given at the callback.
   * The callback should return a boolean for if the message passed the verification step.
   * @param key data key
   * @param fn (stored, incoming) => boolean
   */
  public addPutVerification = (
    key: string,
    fn: (oldMessage: GraphEntryValue | undefined, msg: MessagePut) => boolean
  ) => {
    this._customPutVerification[key] = fn;
  };

  /**
   * Adds an extra verification step for messages of type GET at the given key.
   * You can compare against a previously stored value using the value given at the callback.
   * The callback should return a boolean for if the message passed the verification step.
   * @param key data key
   * @param fn (stored, incoming) => boolean
   */
  public addGetVerification = (
    key: string,
    fn: (oldMessage: GraphEntryValue | undefined, msg: MessageGet) => boolean
  ) => {
    this._customGetVerification[key] = fn;
  };

  private checkMessageIndex(hash: string, peerId: string) {
    if (this.messagesIndex[hash] && !this.messagesIndex[hash].includes(peerId)) {
      this.messagesIndex[hash].push(peerId);
    }
    else {
      this.messagesIndex[hash] = [peerId];
    }
  }

  private async msgPutHandler(msg: MessagePut) {
    const oldValue = await this.dbRead<GraphEntryValue>(msg.val.key);
    // console.log("PUT", msg, oldValue);
    if (this.keyListeners[msg.val.key]) {
      this.keyListeners[msg.val.key](msg.val.value);
      delete this.keyListeners[msg.val.key];
    }
    if (
      !oldValue ||
      (oldValue.timestamp < msg.val.timestamp &&
        (msg.val.key.slice(0, 1) == "~"
          ? oldValue.pub === msg.val.pub
          : true))
    ) {
      this.dbWrite(msg.val.key, msg.val);
      if (this.keyUpdateListeners[msg.val.key]) {
        this.keyUpdateListeners[msg.val.key](msg.val.value);
      }
      // window.chainData[msg.val.key] = msg.val;
    } else {
      // console.warn(`Skip message write!`, oldValue, msg);
    }
  }

  private async msgGetHandler(msg: MessageGet) {
    const oldValue = await this.dbRead<GraphEntryValue>(msg.key);
    // window.chainData[msg.key] = oldValue;
    // console.log("GET", msg, oldValue);
    if (oldValue) {
      const oldConnection = this.connectionsList[msg.source];
      if (oldConnection) {
        // Reply with message data
        oldConnection.send({
          type: "put",
          hash: oldValue.hash,
          val: oldValue,
        } as MessagePut);
      } else {
        // Connect and reply with message data
        this.connectTo(msg.source).then((connection) =>
          connection.send({
            type: "put",
            hash: oldValue.hash,
            val: oldValue,
          } as MessagePut)
        );
      }
    }
  }

  private msgGetPeerSync(msg: MessageGetPeerSync) {
    const peerSyncMsg: MessageSetPeerSync = {
      type: "set-peersync",
      hash: sha256(this.peersList.join(",")),
      peers: this.peersList,
    };
    const oldConnection = this.connectionsList[msg.source];
    if (oldConnection) {
      oldConnection.send(peerSyncMsg);
    } else {
      this.connectTo(msg.source).then((connection) =>
        connection.send(peerSyncMsg)
      );
    }
  }

  private msgSetPeerSync(msg: MessageSetPeerSync) {
    this.peersList = [...this.peersList, ...msg.peers];
  }

  private _onMessageWrapper = async (msg: AnyMessage, peerId: string) => {
    // This wrapper functions filters out those messages we already handled from the listener
    // It also takes care of verification, data persistence and low level handling
    if (!this.messagesIndex[msg.hash]) this.messagesIndex[msg.hash] = [];
    if (!this.messagesIndex[msg.hash].includes(peerId)) {
      this.messagesIndex[msg.hash].push(peerId);
      let verified = await verifyMessage(msg);

      if (verified) {
        if (msg.type === "put" && this._customPutVerification[msg.val.key]) {
          const oldValue = await this.dbRead<GraphEntryValue>(msg.val.key);
          verified = this._customPutVerification[msg.val.key](
            oldValue || undefined,
            msg
          );
        }
        if (msg.type === "get" && this._customPutVerification[msg.key]) {
          console.log(this._customPutVerification[msg.key]);
          const oldValue = await this.dbRead<GraphEntryValue>(msg.key);
          verified = this._customGetVerification[msg.key](
            oldValue || undefined,
            msg
          );
        }
      }

      if (verified) {
        switch (msg.type) {
          case "put": this.msgPutHandler(msg); break;
          case "get": this.msgGetHandler(msg); break;
          case "get-peersync": this.msgGetPeerSync(msg); break;
          case "set-peersync": this.msgSetPeerSync(msg); break;
          default: break;
        }

        this.onMessage(msg, peerId);
        // Relay, should be optional
        this.sendMessage(msg);
      } else if (verified === false) {
        console.warn("Could not verify message integrity;", msg);
        console.warn(
          "This action by should block the peer from reaching us again"
        );
      }
    }
  };

  private generateNewId() {
    return `${this.namespace}-${sha256(
      new Date().getTime() + "-"
      + Math.round(Math.random() * 99999999)
    )}`;
  }

  constructor(namespace: string, debug = false) {
    this.namespace = namespace;
    this.currentPeerId = this.generateNewId();
    this.debug = debug;
    window.chainData = {};
    window.toolchain = this;
  }

  get id() {
    return this.currentPeerId;
  }

  get getPeer() {
    return this.currentPeer;
  }

  get getConnections() {
    return this.connectionsList;
  }

  private connectTo(id: string): Promise<Peer.DataConnection> {
    return new Promise((resolve, reject) => {
      if (!this.currentPeer) {
        reject();
        return;
      }

      const newConn = this.currentPeer.connect(id, {
        reliable: true,
      });

      newConn.on("data", (d) => this._onMessageWrapper(d, id));

      newConn.on("error", (err) => {
        if (this.debug) console.log("ERR", err);
      });

      newConn.on("close", () => {
        delete this.connectionsList[id];
        if (this.debug) console.error(`Connection to ${id} closed`);
        if (Object.keys(this.connectionsList).length < 1) {
          this.findNewPeers();
        }
      });

      newConn.on("open", () => {
        this.connectionsList[id] = newConn;
        if (this.debug) console.info(`Connected to ${id}`);
        resolve(newConn);
      });
    });
  }

  private findNewPeers() {
    if (!this.currentPeer) return;
    this.currentPeer.listAllPeers((peers) => {
      // List all peers from server and chose some of them randomly to connect to
      // Make sure we dont select ourselves!
      const myIndex = peers.indexOf(this.currentPeerId || "");
      peers.splice(myIndex, 1);
      // console.log("All peers: ", peers);

      const selected: string[] = [];

      // Get the max ammount of connections we need
      // We use a cubic root since we expect to have a lot of peers.
      let maxConnections =
        peers.length > 2 ? Math.floor(Math.log(peers.length) / Math.log(3)) : 1;
      if (peers.length === 0) maxConnections = 0;

      // position to start the picking loop
      // Pick the one at half the list, deterministic values help
      const pos = Math.floor(peers.length / 2); // Math.floor(Math.random() * peers.length);

      // Start picks
      let n = 0;
      while (n < maxConnections) {
        // advance as cubic then start from zero (mod) if we exceed the array size
        const index = (pos + 3 ** n) % peers.length;
        if (!selected.includes(peers[index])) {
          selected.push(peers[index]);
        }
        n += 1;
      }

      if (this.debug) {
        console.log("Peers to connect to", selected);
      }
      selected.forEach((id) => this.connectTo(id));
    });
  }

  private finishInitPeer() {
    if (this.currentPeer) {
      this.findNewPeers();

      // On Peer disconnection
      this.currentPeer.on("disconnected", () => {
        if (this.debug) console.info("Disconnected");
      });

      this.currentPeer.on("close", () => {
        if (this.debug) console.info("Client closed");
      });

      // Incoming Peer connection
      this.currentPeer.on("connection", (c: Peer.DataConnection) => {
        // connection incoming, nothing is set yet
        // console.log(`${c.peer} attempting to connect..`);

        c.on("open", () => {
          if (this.debug) {
            console.log(`Connection with peer ${c.peer} established.`);
          }
          this.onPeerConnected(c.peer);
          this.connectionsList[c.peer] = c;
        });

        c.on("data", (d) => this._onMessageWrapper(d, c.peer));

        c.on("close", () => {
          delete this.connectionsList[c.peer];
          if (this.debug) {
            console.info(` > ${c.peer} disconnected.`);
          }
          if (Object.keys(this.connectionsList).length < 1) {
            this.findNewPeers();
          }
        });
      });
    }
  }

  public initialize() {
    this.dbInit();
    const id = this.currentPeerId;
    if (this.debug) console.log(`|| initialize with id: ${id}`);

    this.currentPeer = new Peer(id, {
      host: "api.mtgatool.com",
      port: 9000,
      path: "peer",
    });

    // On Peer open to peerserver
    this.currentPeer.on("open", (_id: string) => {
      console.log("✔ Connected to peerserver as", _id);
      this.finishInitPeer();
      this.onConnected();
    });

    this.currentPeer.on("error", (err: any) => {
      if (this.debug) console.error(err, err.type);
      if (err.type === "network" || err.type === "server-error") {
        this.disconnect();
        this.currentPeerId = this.generateNewId();
        setTimeout(() => this.initialize(), 3000);
      }
    });
  }

  public disconnect(): void {
    if (this.currentPeer) {
      this.currentPeer.disconnect();
      this.currentPeer.destroy();
    }
  }

  public sendMessage(msg: AnyMessage) {
    this.checkMessageIndex(msg.hash, this.currentPeerId);


    if (msg.type === "put") {
      this.dbWrite(msg.val.key, msg.val);
      if (this.keyUpdateListeners[msg.val.key]) {
        this.keyUpdateListeners[msg.val.key](msg.val.value);
      }
      // window.chainData[msg.val.key] = msg.val;
    }

    Object.values(this.connectionsList).forEach((conn) => {
      // console.log(conn);
      if (conn) {
        this.checkMessageIndex(msg.hash, conn.peer);
        conn.send(msg);
      }
    });
  }
}

export default ToolChain;
