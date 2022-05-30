import EventEmitter from "events";
import w3 from "web3";
import { Account } from "web3-core";

import {
  BaseMessage,
  PutMessage,
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

import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbClientOnMessage from "./toolDbClientOnMessage";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

import leveldb from "./utils/leveldb";
import indexedb from "./utils/indexedb";

import toolDbSubscribe from "./toolDbSubscribe";

import toolDbQueryKeys from "./toolDbQueryKeys";
import toolDbKeysSignIn from "./toolDbKeysSignIn";

import handleGet from "./messageHandlers/handleGet";
import handlePut from "./messageHandlers/handlePut";
import handlePing from "./messageHandlers/handlePing";
import handlePong from "./messageHandlers/handlePong";
import handleQuery from "./messageHandlers/handleQuery";
import handleCrdtGet from "./messageHandlers/handleCrdtGet";
import handleCrdtPut from "./messageHandlers/handleCrdtPut";
import handleSubscribe from "./messageHandlers/handleSubscribe";

import { Peer, ToolDbOptions, ToolDbStore } from "./types/tooldb";
import { CrdtPutMessage } from "./types/message";

export interface Listener<T = any> {
  key: string;
  timeout: number | null;
  fn: (msg: VerificationData<T>) => void;
}

interface Verificator<T> {
  key: string;
  fn: (
    msg: VerificationData<T>,
    previousData: T | undefined
  ) => Promise<boolean>;
}

export default class ToolDb extends EventEmitter {
  private _network;
  private _store: ToolDbStore;
  private _peers: Peer[] = [];

  public web3: w3;

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

  public isConnected = false;

  /**
   * Emitted after a disconnection, when there are no more peers connected to.
   */
  public onDisconnect = () => {
    //
  };

  /**
   * Emitted the first time we are connected to a peer.
   */
  public onConnect = () => {
    //
  };

  public onPeerDisconnect = (peerId: string) => {
    //
  };

  public onPeerConnect = (peerId: string) => {
    //
  };

  public getData = toolDbGet;

  public putData = toolDbPut;

  public putCrdt = toolDbCrdtPut;

  public getCrdt = toolDbCrdtGet;

  public queryKeys = toolDbQueryKeys;

  public signIn = toolDbSignIn;

  public anonSignIn = toolDbAnonSignIn;

  public keysSignIn = toolDbKeysSignIn;

  public signUp = toolDbSignUp;

  public verify = toolDbVerificationWrapper;

  // All message handlers go here
  public handlePing = handlePing;
  public handlePong = handlePong;
  public handleCrdtGet = handleCrdtGet;
  public handleCrdtPut = handleCrdtPut;
  public handleGet = handleGet;
  public handlePut = handlePut;
  public handleQuery = handleQuery;
  public handleSubscribe = handleSubscribe;

  public setUser(account: Account | undefined, name: string): void {
    this._user = account
      ? {
          account: account,
          name: name,
        }
      : undefined;
  }

  public signData(data: string) {
    if (this._user) {
      const signature = this.web3.eth.accounts.sign(
        data,
        this._user.account.privateKey
      );

      return signature;
    }
    return undefined;
  }

  public getAddress(): string | undefined {
    return this._user?.account.address;
  }

  public getUsername(): string | undefined {
    return this._user?.name;
  }

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
    return ":" + (this.getAddress() || "") + "." + key;
  }

  /**
   * Key listeners listen for a specific key, as long as the listener remains active
   */
  public _keyListeners: (Listener | null)[] = [];

  public addKeyListener = <T>(
    key: string,
    fn: (msg: VerificationData<T>) => void
  ) => {
    const newListener: Listener = {
      key,
      timeout: null,
      fn,
    };
    this._keyListeners.push(newListener);

    return this._keyListeners.length - 1;
  };

  public removeKeyListener = (id: number) => {
    if (this._keyListeners[id]?.timeout) {
      clearTimeout(this._keyListeners[id]?.timeout || undefined);
    }

    this._keyListeners[id] = null;
  };

  public triggerKeyListener = <T = any>(
    key: string,
    message: VerificationData<T>
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
    fn: (msg: VerificationData<T>, previous: T | undefined) => Promise<boolean>
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

  private _user = undefined as
    | undefined
    | {
        account: Account;
        name: string;
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
    topic: "tool-db-default",
    peerAccount: undefined as any,
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

  constructor(options: Partial<ToolDbOptions> = {}) {
    super();

    this._options = { ...this.options, ...options };

    this.web3 = new w3(w3.givenProvider);

    const account = this.web3.eth.accounts.create();
    this.options.peerAccount = account;
    this.emit("init", account.address);

    // These could be made to be customizable by setting the variables as public
    this._network = new this.options.networkAdapter(this);
    this._store = this.options.storageAdapter(this.options.storageName);
  }
}
