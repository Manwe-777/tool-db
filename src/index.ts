/* eslint-disable @typescript-eslint/no-unused-vars */
import Peer from "peerjs";
import _, { indexOf } from "lodash";
import toolChainAnonSignIn from "./toolChainAnonSignIn";
import toolChainGet from "./toolChainGet";
import toolChainGetPubKey from "./toolChainGetPubKey";
import toolChainPut from "./toolChainPut";
import toolChainSignIn from "./toolChainSignIn";
import toolChainSignUp from "./toolChainSignUp";
import { GraphEntryValue, ToolChainOptions } from "./types/graph";
import {
  AnyMessage,
  MessageGet,
  MessagePut,
  VerifyResult,
} from "./types/message";
import { KeyPair } from "./utils/crypto/generateKeyPair";
import localForageInit from "./utils/localForage/localForageInit";
import localForageRead from "./utils/localForage/localForageRead";
import localForageWrite from "./utils/localForage/localForageWrite";

import verifyMessage from "./utils/verifyMessage";
import sha1 from "./utils/sha1";

class ToolChain {
  private currentPeer: Peer | undefined;

  private connectionsList: Record<string, Peer.DataConnection | null> = {};

  private namespace = "";

  private currentPeerNumber = 0;

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
    if (
      this.messagesIndex[hash] &&
      !this.messagesIndex[hash].includes(peerId)
    ) {
      this.messagesIndex[hash].push(peerId);
    } else {
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
        (msg.val.key.slice(0, 1) == "~" ? oldValue.pub === msg.val.pub : true))
    ) {
      // 1 if 1 peer
      // 0.1 if 100 or more peers
      const maxDist = Math.ceil(parseInt("ffffffff", 16) * 0.1);
      const ourPlace = parseInt(this.currentPeerId.slice(-8), 16);
      const dataPlace = parseInt(msg.hash.slice(-8), 16);

      if (Math.abs(ourPlace - dataPlace) < maxDist) {
        this.dbWrite(msg.val.key, msg.val);
        if (this.keyUpdateListeners[msg.val.key]) {
          this.keyUpdateListeners[msg.val.key](msg.val.value);
        }
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

  // private msgGetPeerSync(msg: MessageGetPeerSync) {
  //   const peerSyncMsg: MessageSetPeerSync = {
  //     type: "set-peersync",
  //     hash: sha256(this.peersList.join(",")),
  //     peers: this.peersList,
  //   };
  //   const oldConnection = this.connectionsList[msg.source];
  //   if (oldConnection) {
  //     oldConnection.send(peerSyncMsg);
  //   } else {
  //     this.connectTo(msg.source).then((connection) =>
  //       connection.send(peerSyncMsg)
  //     );
  //   }
  // }

  // private msgSetPeerSync(msg: MessageSetPeerSync) {
  //   this.peersList = [...this.peersList, ...msg.peers];
  // }

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
          verified = !this._customPutVerification[msg.val.key](
            oldValue || undefined,
            msg
          )
            ? VerifyResult.InvalidVerification
            : verified;
        }
        if (msg.type === "get" && this._customPutVerification[msg.key]) {
          console.log(this._customPutVerification[msg.key]);
          const oldValue = await this.dbRead<GraphEntryValue>(msg.key);
          verified = !this._customGetVerification[msg.key](
            oldValue || undefined,
            msg
          )
            ? VerifyResult.InvalidVerification
            : verified;
        }
      }

      if (verified === VerifyResult.Verified) {
        switch (msg.type) {
          case "put":
            this.msgPutHandler(msg);
            break;
          case "get":
            this.msgGetHandler(msg);
            break;
          // case "get-peersync":
          //   this.msgGetPeerSync(msg);
          //   break;
          // case "set-peersync":
          //   this.msgSetPeerSync(msg);
          //   break;
          default:
            break;
        }

        this.onMessage(msg, peerId);
        // Relay, should be optional
        this.sendMessage(msg);
      } else {
        console.warn(`Could not verify message integrity: ${verified}`, msg);
        console.warn(
          "This action by should block the peer from reaching us again"
        );
      }
    }
  };

  private generateNewId(root?: number) {
    // return `${this.namespace}-${
    //   root === undefined
    //     ? sha1(
    //         new Date().getTime() + "-" + Math.round(Math.random() * 99999999)
    //       )
    //     : root
    // }`;
    const rand = Math.round(Math.random() * 9999);
    return `${this.namespace}-${sha1(
      root === undefined ? new Date().getTime() + "-" + rand : root + ""
    )}`;
  }

  constructor(namespace: string, debug = false) {
    this.namespace = namespace;
    this.debug = debug;
    window.chainData = {};
    window.toolchain = this;
    this.dbInit();
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
    if (this.debug) {
      console.log("Connect to: ", id);
    }
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
        this.rewirePeers();
      });

      newConn.on("open", () => {
        this.connectionsList[id] = newConn;
        if (this.debug) console.info(`Connected to ${id}`);
        resolve(newConn);
      });
    });
  }

  private _rewirePeers() {
    if (!this.currentPeer) return;

    this.currentPeer.listAllPeers((peers) => {
      this.peersList = peers;

      this.peersList.sort();
      const position = this.peersList.indexOf(this.currentPeerId);
      const next = (position + 1) % this.peersList.length;
      const previous = position < 1 ? this.peersList.length - 1 : position - 1;

      if (this.debug) {
        console.log("All peers (" + this.currentPeerId + "): ", this.peersList);
        console.log("position: ", position);
        console.log("Prev: ", previous, this.peersList[previous]);
        console.log("Next: ", next, this.peersList[next]);
      }

      if (next !== position && !this.connectionsList[this.peersList[next]]) {
        this.connectTo(this.peersList[next]);
      }
      if (
        previous !== position &&
        previous !== next &&
        !this.connectionsList[this.peersList[previous]]
      ) {
        this.connectTo(this.peersList[previous]);
      }

      Object.keys(this.connectionsList).forEach((id) => {
        if (id !== this.peersList[next] && id !== this.peersList[previous]) {
          if (this.connectionsList[id]) {
            this.connectionsList[id]?.close();
            delete this.connectionsList[id];
          }
        }
      });
    });
  }

  // Prevents the re-wiring to run too oftenly
  private rewirePeersIimeout: NodeJS.Timeout | null = null;

  private rewirePeers() {
    if (this.rewirePeersIimeout) {
      clearTimeout(this.rewirePeersIimeout);
    }
    this.rewirePeersIimeout = setTimeout(() => this._rewirePeers(), 1000);
  }

  private reconnectSignalling() {
    if (this.currentPeer) {
      this.currentPeer.reconnect();
    }
  }

  private finishInitPeer() {
    if (this.currentPeer) {
      this.rewirePeers();

      // On Peer disconnection
      this.currentPeer.on("disconnected", () => {
        if (this.debug) {
          console.info("Disconnected from peerserver");
        }
        setTimeout(this.reconnectSignalling, 3000);
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
          this.rewirePeers();
        });

        c.on("data", (d) => this._onMessageWrapper(d, c.peer));

        c.on("close", () => {
          if (this.debug) {
            console.info(` > ${c.peer} disconnected.`);
          }
          this.rewirePeers();
        });
      });
    }
  }

  public initialize() {
    const newId = this.generateNewId(this.currentPeerNumber);
    const tempPeer = new Peer(newId, {
      host: "api.mtgatool.com",
      port: 9000,
      path: "peer",
    });

    tempPeer.on("open", (_id: string) => {
      console.log("✔ Connected to peerserver as", _id);
      this.currentPeerId = _id;
      this.currentPeer = tempPeer;
      this.finishInitPeer();
      this.onConnected();
    });

    tempPeer.on("error", (err: any) => {
      if (err.type === "network" || err.type === "server-error") {
        this.disconnect();
        setTimeout(() => this.initialize(), 3000);
      } else if (err.type === "unavailable-id") {
        this.currentPeerNumber += 1;
        this.disconnect();
        this.initialize();
      } else if (this.debug) {
        console.error(err, err.type);
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

    // Send to the next in the ring
    const allPeers = [...Object.keys(this.connectionsList), this.currentPeerId];
    allPeers.sort();

    const position = allPeers.indexOf(this.currentPeerId) + 1;
    let last = allPeers[position];
    if (position >= allPeers.length) {
      last = allPeers[0];
    }

    if (this.connectionsList[last]) {
      const conn = this.connectionsList[last];
      if (conn) {
        this.checkMessageIndex(msg.hash, conn.peer);
        console.log("Message sent to " + last);
        conn.send(msg);
      }
    }
    // Send to all;
    // Object.values(this.connectionsList).forEach((conn) => {
    //   if (conn && this.connectionsList) {
    //     this.checkMessageIndex(msg.hash, conn.peer);
    //     conn.send(msg);
    //   }
    // });
  }
}

export default ToolChain;
