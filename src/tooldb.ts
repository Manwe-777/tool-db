import toolDbNetwork from "./toolDbNetwork";

import { Peer, ToolDbOptions } from "./types/tooldb";

import toolDbGet from "./toolDbGet";
import toolDbPut from "./toolDbPut";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbSignIn from "./toolDbSignIn";
import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbSignUp from "./toolDbSignUp";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

import toolDbClientOnMessage from "./toolDbClientOnMessage";
import indexedb from "./utils/indexedb";
import leveldb from "./utils/leveldb";
import {
  CrdtMessage,
  encodeKeyString,
  exportKey,
  generateKeyPair,
  PutMessage,
  sha1,
  textRandom,
  ToolDbMessage,
  VerificationData,
} from ".";
import toolDbSubscribe from "./toolDbSubscribe";
import toolDbCrdtPut from "./toolDbCrdtPut";
import { FreezeObject } from "automerge";
import loadCrdtDocument from "./loadCrdtDocument";
import toolDbKeysSignIn from "./toolDbKeysSignIn";
import toolDbQueryKeys from "./toolDbQueryKeys";
import handlePing from "./messageHandlers/handlePing";
import handlePong from "./messageHandlers/handlePong";
import handleCrdt from "./messageHandlers/handleCrdt";
import handleCrdtGet from "./messageHandlers/handleCrdtGet";
import handleCrdtPut from "./messageHandlers/handleCrdtPut";
import handleGet from "./messageHandlers/handleGet";
import handlePut from "./messageHandlers/handlePut";
import handleQuery from "./messageHandlers/handleQuery";
import handleSubscribe from "./messageHandlers/handleSubscribe";

export interface Listener {
  key: string;
  timeout: number | null;
  fn: (msg: PutMessage | CrdtMessage) => void;
}

interface Verificator<T> {
  key: string;
  fn: (msg: VerificationData<T>) => Promise<boolean>;
}

export default class ToolDb {
  private _network;
  private _store;
  private _peers: Peer[] = [];

  private _documents: Record<string, FreezeObject<any>> = {};

  public clientOnMessage = toolDbClientOnMessage;

  private _subscriptions: string[] = [];

  get subscriptions() {
    return this._subscriptions;
  }

  private _processedIds: Record<string, string[]> = {};

  get processedIds() {
    return this._processedIds;
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
    fn: (msg: VerificationData) => Promise<boolean>
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
    id: sha1(`${textRandom(100)}-${new Date().getTime()}`),
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
    this._options = { ...this.options, ...options };

    generateKeyPair("ECDSA", false)
      .then((key) => {
        if (key.publicKey && key.privateKey) {
          this._options.publicKey = key.publicKey;
          this._options.privateKey = key.privateKey;

          exportKey("spki", key.publicKey).then((skpub) => {
            this._options.id = encodeKeyString(skpub as ArrayBuffer);
            if (this._options.debug) {
              console.log("My ID is:", this._options.id);
            }
          });
        }
      })
      .catch(console.warn);

    // These could be made to be customizable by setting the variables as public
    this._network = new this.options.networkAdapter(this);
    this._store = this.options.storageAdapter(this.options.storageName);
  }
}
