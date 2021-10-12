import Deduplicator from "./deduplicator";
import WSS from "./wss";

import { ToolDbOptions } from "./types/tooldb";

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
import { CrdtMessage, PutMessage, ToolDbMessage, VerificationData } from ".";
import toolDbSubscribe from "./toolDbSubscribe";
import toolDbCrdtPut from "./toolDbCrdtPut";
import { FreezeObject } from "automerge";

export interface Listener {
  key: string;
  timeout: number | null;
  fn: (msg: any) => void;
}

interface Verificator<T> {
  key: string;
  fn: (msg: VerificationData<T>) => Promise<boolean>;
}

export default class ToolDb {
  private _deduplicator;
  private _websockets;
  private _store;

  private _documents: Record<string, FreezeObject<any>> = {};

  public clientOnMessage = toolDbClientOnMessage;

  public subscribeData = toolDbSubscribe;

  public onConnect = () => {
    //
  };

  public onReconnect = () => {
    //
  };

  public getData = toolDbGet;

  public putData = toolDbPut;

  public putCrdt = toolDbCrdtPut;

  public getPubKey = toolDbGetPubKey;

  public signIn = toolDbSignIn;

  public anonSignIn = toolDbAnonSignIn;

  public signUp = toolDbSignUp;

  public verify = toolDbVerificationWrapper;

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
    wait: 2000,
    pow: 0,
    server: false,
    port: 8080,
    debug: false,
  };

  get options() {
    return this._options;
  }

  get deduplicator() {
    return this._deduplicator;
  }

  get websockets() {
    return this._websockets;
  }

  get store() {
    return this._store;
  }

  get documents() {
    return this._documents;
  }

  constructor(options: Partial<ToolDbOptions> = {}) {
    this._options = { ...this._options, ...options };

    // These could be made to be customizable by setting the variables as public
    this._deduplicator = new Deduplicator();
    this._websockets = new WSS(this);
    this._store = typeof window === "undefined" ? leveldb() : indexedb();
  }
}
