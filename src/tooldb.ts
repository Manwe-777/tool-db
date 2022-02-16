import { FreezeObject } from "automerge";
import EventEmitter from "events";

import {
  BaseMessage,
  CrdtMessage,
  encodeKeyString,
  exportKey,
  generateKeyPair,
  PutMessage,
  sha1,
  textRandom,
  ToolDbMessage,
  VerificationData,
  verifyMessage,
} from ".";

import toolDbGet from "./toolDbGet";
import toolDbPut from "./toolDbPut";
import toolDbSignIn from "./toolDbSignIn";
import toolDbSignUp from "./toolDbSignUp";
import toolDbNetwork from "./toolDbNetwork";
import toolDbCrdtGet from "./toolDbCrdtGet";
import toolDbCrdtPut from "./toolDbCrdtPut";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbClientOnMessage from "./toolDbClientOnMessage";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

import leveldb from "./utils/leveldb";
import indexedb from "./utils/indexedb";

import toolDbSubscribe from "./toolDbSubscribe";

import toolDbQueryKeys from "./toolDbQueryKeys";
import loadCrdtDocument from "./loadCrdtDocument";
import toolDbKeysSignIn from "./toolDbKeysSignIn";

import handleGet from "./messageHandlers/handleGet";
import handlePut from "./messageHandlers/handlePut";
import handlePing from "./messageHandlers/handlePing";
import handlePong from "./messageHandlers/handlePong";
import handleCrdt from "./messageHandlers/handleCrdt";
import handleQuery from "./messageHandlers/handleQuery";
import handleCrdtGet from "./messageHandlers/handleCrdtGet";
import handleCrdtPut from "./messageHandlers/handleCrdtPut";
import handleSubscribe from "./messageHandlers/handleSubscribe";

import { Peer, ToolDbOptions } from "./types/tooldb";

export interface Listener {
  key: string;
  timeout: number | null;
  fn: (msg: PutMessage | CrdtMessage) => void;
}

interface Verificator<T> {
  key: string;
  fn: (msg: VerificationData<T> & BaseMessage) => Promise<boolean>;
}

export default class ToolDb extends EventEmitter {
  private _network;
  private _store;
  private _peers: Peer[] = [];

  private _documents: Record<string, FreezeObject<any>> = {};

  public clientOnMessage = toolDbClientOnMessage;

  public verifyMessage = verifyMessage;

  private _subscriptions: string[] = [];

  get subscriptions() {
    return this._subscriptions;
  }

  private _processedIds: Record<string, string[]> = {};

  get processedIds() {
    return this._processedIds;
  }

  private _processedOutHashes: Record<string, string[]> = {};

  get processedOutHashes() {
    return this._processedOutHashes;
  }

  public subscribeData = toolDbSubscribe;

  // Emitted when there are no more server peers connected to
  public onDisconnect = () => {
    //
  };

  // Emitted when a server peer responds with "pong"
  public onConnect = () => {
    //
  };

  public loadCrdtDocument = loadCrdtDocument;

  public getData = toolDbGet;

  public putData = toolDbPut;

  public putCrdt = toolDbCrdtPut;

  public getCrdt = toolDbCrdtGet;

  public queryKeys = toolDbQueryKeys;

  public getPubKey = toolDbGetPubKey;

  public signIn = toolDbSignIn;

  public anonSignIn = toolDbAnonSignIn;

  public keysSignIn = toolDbKeysSignIn;

  public signUp = toolDbSignUp;

  public verify = toolDbVerificationWrapper;

  // All message handlers go here
  public handlePing = handlePing;
  public handlePong = handlePong;
  public handleCrdt = handleCrdt;
  public handleCrdtGet = handleCrdtGet;
  public handleCrdtPut = handleCrdtPut;
  public handleGet = handleGet;
  public handlePut = handlePut;
  public handleQuery = handleQuery;
  public handleSubscribe = handleSubscribe;

  /**
   * id listeners listen for a specific message ID just once
   */
  public _idListeners: Record<string, (msg: ToolDbMessage) => void> = {};

  public addIdListener = (id: string, fn: (msg: ToolDbMessage) => void) => {
    this._idListeners[id] = fn;
  };

  public removeIdListener = (id: string) => {
    delete this._idListeners[id];
  };

  public getUserNamespacedKey(key: string) {
    return ":" + (this.user?.pubKey || "") + "." + key;
  }

  /**
   * Key listeners listen for a specific key, as long as the listener remains active
   */
  public _keyListeners: (Listener | null)[] = [];

  public addKeyListener = <T>(
    key: string,
    fn: (msg: PutMessage<T> | CrdtMessage) => void
  ) => {
    const newListener: Listener = {
      key,
      timeout: null,
      fn,
    };
    this._keyListeners.push(newListener);

    return this._keyListeners.length;
  };

  public removeKeyListener = (id: number) => {
    if (this._keyListeners[id]?.timeout) {
      clearTimeout(this._keyListeners[id]?.timeout || undefined);
    }

    this._keyListeners[id] = null;
  };

  public triggerKeyListener = (
    key: string,
    message: PutMessage | CrdtMessage
  ) => {
    // console.warn(`triggerKeyListener ${key}`);
    this._keyListeners.forEach((listener) => {
      if (listener?.key === key) {
        // console.log(`TRIGGER OK`, message);
        if (listener.timeout) {
          clearTimeout(listener.timeout);
        }
        listener.timeout = setTimeout(
          () => listener.fn(message),
          this.options.triggerDebouce
        ) as any;
      }
    });
  };

  /**
   * Custom verificators can enhance default verification on any key field
   */
  public _customVerificator: (Verificator<any> | null)[] = [];

  public addCustomVerification = <T = any>(
    key: string,
    fn: (msg: VerificationData & BaseMessage) => Promise<boolean>
  ) => {
    const newListener: Verificator<T> = {
      key,
      fn,
    };

    this._customVerificator.push(newListener);
    return this._customVerificator.length;
  };

  public removeCustomVerification = (id: number) => {
    this._customVerificator[id] = null;
  };

  public user = undefined as
    | undefined
    | {
        keys: {
          signKeys: CryptoKeyPair;
          encryptionKeys: CryptoKeyPair;
        };
        name: string;
        pubKey: string;
      };

  private _options: ToolDbOptions = {
    db: "tooldb",
    peers: [],
    maxRetries: 5,
    triggerDebouce: 100,
    wait: 2000,
    pow: 0,
    server: false,
    host: "127.0.0.1",
    port: 8080,
    debug: false,
    httpServer: undefined,
    networkAdapter: toolDbNetwork,
    storageName: "tooldb",
    storageAdapter: typeof window === "undefined" ? leveldb : indexedb,
    id: "",
    topic: "tool-db-default",
    publicKey: undefined,
    privateKey: undefined,
  };

  get options() {
    return this._options;
  }

  get network() {
    return this._network;
  }

  get peers() {
    return this._peers;
  }

  get store() {
    return this._store;
  }

  get documents() {
    return this._documents;
  }

  constructor(options: Partial<ToolDbOptions> = {}) {
    super();

    this._options = { ...this.options, ...options };

    if (this._options.id === "") {
      generateKeyPair("ECDSA", false)
        .then((key) => {
          if (key.publicKey && key.privateKey) {
            this._options.publicKey = key.publicKey;
            this._options.privateKey = key.privateKey;

            exportKey("spki", key.publicKey).then((skpub) => {
              this._options.id = encodeKeyString(skpub as ArrayBuffer);
              this.emit("init", this._options._id);
            });
          }
        })
        .catch(console.warn);
    } else {
      this.emit("init", this._options._id);
    }

    // These could be made to be customizable by setting the variables as public
    this._network = new this.options.networkAdapter(this);
    this._store = this.options.storageAdapter(this.options.storageName);
  }
}
