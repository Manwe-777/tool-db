import Deduplicator from "./deduplicator";
import WSS from "./wss";
import Automerge from "automerge";
import { ToolDbOptions } from "./types/tooldb";
import toolDbServerOnMessage from "./toolDbServerOnMessage";
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
import { VerificationData } from ".";

export interface Listener {
  key: string;
  timeout: number | null;
  fn: (msg: any) => void;
}

interface Verificator<T> {
  key: string;
  fn: (msg: VerificationData) => Promise<boolean>;
}

/*

Each document is a automerge doc
Each message applies to a doc and has a hash
The state of the doc is the merkle tree of all hashes
We only store one doc per key

GET: (id, key, to, myMerkle)
  server checks if it has key
  if it has key, check if merkle matches
  if merkle does not match reply with the missing messages (PUTs using id)

PUT: (id, key, to, operation, value)
  check if we have this message or not
  if we dont
    verify validity
    add it to deduplicator
    apply crdt operation on document at key
    relay to other peers not in "to" list

*/
export default class ToolDb {
  private _deduplicator;
  private _websockets;
  private _store;

  private _documents: Record<string, Automerge.FreezeObject<any>> = {};

  // syncstate[peerUrl][key] = syncstate
  private _syncStates: Record<string, Record<string, Automerge.SyncState>> = {};

  public serverOnMessage = toolDbServerOnMessage;

  public clientOnMessage = toolDbClientOnMessage;

  public getData = toolDbGet;

  public putData = toolDbPut;

  public getPubKey = toolDbGetPubKey;

  public signIn = toolDbSignIn;

  public anonSignIn = toolDbAnonSignIn;

  public signUp = toolDbSignUp;

  public verify = toolDbVerificationWrapper;

  public _keyListeners: (Listener | null)[] = [];

  public addKeyListener = <T = any>(key: string, fn: (msg: T) => void) => {
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

  get syncStates() {
    return this._syncStates;
  }

  constructor(options: Partial<ToolDbOptions> = {}) {
    this._options = { ...this._options, ...options };

    // These could be made to be customizable by setting the variables as public
    this._deduplicator = new Deduplicator();
    this._websockets = new WSS(this);
    this._store = typeof window === "undefined" ? indexedb() : leveldb();
  }
}
