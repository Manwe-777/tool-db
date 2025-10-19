import EventEmitter from "events";

import {
  Peer,
  randomAnimal,
  ServerFunction,
  ToolDbOptions,
  ToolDbNetworkAdapter,
  ToolDbStorageAdapter,
  ToolDbUserAdapter,
  ToolDbMessage,
  verifyMessage,
  VerificationData,
} from ".";

import toolDbGet from "./toolDbGet";
import toolDbPut from "./toolDbPut";
import toolDbSignIn from "./toolDbSignIn";
import toolDbSignUp from "./toolDbSignUp";
import toolDbCrdtGet from "./toolDbCrdtGet";
import toolDbCrdtPut from "./toolDbCrdtPut";
import toolDbFunction from "./toolDbFunction";

import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbClientOnMessage from "./toolDbClientOnMessage";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

import toolDbQueryKeys from "./toolDbQueryKeys";
import toolDbKeysSignIn from "./toolDbKeysSignIn";
import toolDbSubscribe from "./toolDbSubscribe";

import handleGet from "./messageHandlers/handleGet";
import handlePut from "./messageHandlers/handlePut";
import handlePing from "./messageHandlers/handlePing";
import handlePong from "./messageHandlers/handlePong";
import handleQuery from "./messageHandlers/handleQuery";
import handleFunction from "./messageHandlers/handleFunction";
import handleCrdtGet from "./messageHandlers/handleCrdtGet";
import handleCrdtPut from "./messageHandlers/handleCrdtPut";
import handleSubscribe from "./messageHandlers/handleSubscribe";

import logger from "./logger";

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

export default class ToolDb<T extends ToolDbOptions = ToolDbOptions> extends EventEmitter {
  private _network: ToolDbNetworkAdapter;
  private _store: ToolDbStorageAdapter;
  private _serverPeers: Peer[] = [];
  private _peerAccount: ToolDbUserAdapter;
  private _userAccount: ToolDbUserAdapter;

  public logger = logger;

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

  public doFunction = toolDbFunction;

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
  public handleFunction = handleFunction;

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
    return ":" + (this.userAccount?.getAddress() || "") + "." + key;
  }

  /**
   * Server functions allow the server to define functions to be executed by the clients
   * It is up to the function creator to specify proper security on these.
   * Server functions are meant to execute on data stored on the server, in a way the clients
   * dont have to overload the server, use with caution!
   * Custom functions are expected to be a Promise that resolves to a string, and arguments are
   * passed as an array of values. Type and sanity checking is up to the developer.
   */
  private _functions: Record<string, ServerFunction<any, any>> = {};

  get functions() {
    return this._functions;
  }
  public addServerFunction<A, R>(
    functionName: string,
    fn: ServerFunction<A, R>
  ) {
    this._functions[functionName] = fn;
  }

  /**
   * Key listeners listen for a specific key, as long as the listener remains active
   */
  public _keyListeners: (Listener | null)[] = [];

  public addKeyListener = <T>(
    key: string,
    fn: (msg: VerificationData<T>) => void
  ) => {
    this.logger(`Add key listener: ${key}`);

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
    this._keyListeners.forEach((listener) => {
      if (listener?.key === key) {
        this.logger(`Trigger key listener: ${key}`);
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

  private _options: T = {
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
    networkAdapter: ToolDbNetworkAdapter,
    storageAdapter: ToolDbStorageAdapter,
    userAdapter: ToolDbUserAdapter,
    storageName: "tooldb",
    topic: "tool-db-default",
    serverName: undefined,
    ssl: false,
    modules: {},
  } as unknown as T;

  get options() {
    return this._options;
  }

  get network() {
    return this._network;
  }

  get serverPeers() {
    return this._serverPeers;
  }

  get store() {
    return this._store;
  }

  get userAccount() {
    return this._userAccount;
  }

  get peerAccount() {
    return this._peerAccount;
  }

  constructor(options: Partial<T> = {}) {
    super();
    this._options = { ...this.options, ...options };

    this._store = new this.options.storageAdapter(this);
    this._peerAccount = new this.options.userAdapter(this);
    this._userAccount = new this.options.userAdapter(this);

    // Initialize userAccount with anonymous keys (will be replaced on signIn)
    this._userAccount.anonUser().catch(() => {
      // Ignore errors during initialization
    });

    this._network = new this.options.networkAdapter(this);

    const DEFAULT_KEYS = "%default-peer%";

    // DO NOT USE THE DEFAULT STORE FOR KEYS
    const tempStore = new this.options.storageAdapter(
      this,
      "_____peer_" + this.options.storageName
    );

    this.logger("ToolDb constructor: Starting peer account initialization");

    tempStore
      .get(DEFAULT_KEYS)
      .then((val) => {
        this.logger("Found existing peer account in storage");
        return this.peerAccount
          .decryptAccount(JSON.parse(val), DEFAULT_KEYS)
          .then((a) => {
            this.logger("Decrypted peer account");
            return this.peerAccount.setUser(a, randomAnimal());
          })
          .then(() => {
            this.logger("Peer account loaded, address:", this.peerAccount.getAddress());
          });
      })
      .catch((_e) => {
        this.logger("No existing peer account, creating new one");
        // No existing peer account - generate new keys first
        return this.peerAccount.anonUser()
          .then(() => {
            this.logger("Generated new peer keys");
            return this.peerAccount.encryptAccount(DEFAULT_KEYS);
          })
          .then((a) => {
            this.logger("Encrypted peer account");
            return tempStore.put(DEFAULT_KEYS, JSON.stringify(a));
          })
          .then(() => {
            this.logger("Saved peer account, address:", this.peerAccount.getAddress());
          })
          .catch((err) => {
            this.logger("Error creating peer account:", err);
          });
      })
      .finally(() => {
        this.logger("Emitting init event");
        this.emit("init", this.userAccount.getAddress());
      });
  }
}
