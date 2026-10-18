import EventEmitter from "events";

import {
  ToolDbOptions,
  ToolDbStorageAdapter,
  ToolDbUserAdapter,
  VerificationData,
} from ".";

import ToolDbMemoryStore from "./adapters/memoryStore";
import ToolDbNostrUser from "./adapters/nostrUser";
import RelayPool, { WebSocketConstructor } from "./nostr/pool";
import randomAnimal from "./utils/randomAnimal";
import logger from "./logger";

import {
  getData,
  putData,
  queryKeys,
  subscribeData,
  unsubscribeData,
} from "./data/api";
import { getCrdt, putCrdt, getStoredCrdt, toCrdtView } from "./data/crdts";
import { doFunction } from "./data/functions";
import { eventToRecord, getStoredEvent } from "./data/values";
import { CustomVerificator, VerifyContext } from "./data/verify";

export interface Listener<T = any> {
  key: string;
  timeout: ReturnType<typeof setTimeout> | null;
  fn: (msg: VerificationData<T>) => void;
}

function getWebSocket(): WebSocketConstructor {
  if (typeof globalThis.WebSocket === "undefined") {
    throw new Error(
      "No WebSocket available, use Node 22+ or set the WebSocket option"
    );
  }
  return globalThis.WebSocket as unknown as WebSocketConstructor;
}

export default class ToolDb extends EventEmitter {
  private _options: ToolDbOptions = {
    debug: false,
    relays: [],
    topic: "tool-db-default",
    functionServers: [],
    triggerDebouce: 100,
    storageName: "tooldb",
    storageAdapter: ToolDbMemoryStore,
    userAdapter: ToolDbNostrUser,
    WebSocket: undefined,
  };

  private _store: ToolDbStorageAdapter;

  private _userAccount: ToolDbUserAdapter;

  private _relays: RelayPool;

  private _readyPromise: Promise<void>;

  public logger = logger;

  /**
   * Whether we are connected to at least one relay
   */
  public isConnected = false;

  /**
   * Called when we connect to the first relay
   */
  public onConnect = () => {
    //
  };

  /**
   * Called when we are not connected to any relay anymore
   */
  public onDisconnect = () => {
    //
  };

  public putData = putData;

  public getData = getData;

  public subscribeData = subscribeData;

  public unsubscribeData = unsubscribeData;

  public putCrdt = putCrdt;

  public getCrdt = getCrdt;

  public queryKeys = queryKeys;

  public doFunction = doFunction;

  /**
   * Open relay subscriptions, by key
   */
  public _subscriptions: Record<string, () => void> = {};

  constructor(options: Partial<ToolDbOptions> = {}) {
    super();
    this._options = { ...this._options, ...options };

    this._store = new this._options.storageAdapter(this);
    this._userAccount = new this._options.userAdapter(this);

    this._relays = new RelayPool(this._options.relays, {
      WebSocket: this._options.WebSocket || getWebSocket(),
      onStatus: (connected) => this.onRelayStatus(connected),
    });

    this._readyPromise = Promise.all([
      this._store.ready,
      this._userAccount.ready,
    ]).then(() => {
      this.emit("init", this._userAccount.getAddress());
    });
    // Still rejects for whoever awaits it, without being an unhandled rejection
    this._readyPromise.catch((e) => this.logger("Could not initialize", e));
  }

  get options() {
    return this._options;
  }

  get store() {
    return this._store;
  }

  get userAccount() {
    return this._userAccount;
  }

  /**
   * The relays we are connected to
   */
  get relays() {
    return this._relays;
  }

  /**
   * Promise that resolves when the database is fully initialized.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  private onRelayStatus(connected: number) {
    if (connected > 0 && !this.isConnected) {
      this.isConnected = true;
      this.onConnect();
    } else if (connected === 0 && this.isConnected) {
      this.isConnected = false;
      this.onDisconnect();
    }
  }

  /**
   * Switches to a new random identity
   */
  public anonSignIn(): Promise<void> {
    return this._userAccount.anonUser();
  }

  /**
   * Signs in with a secret key (hex or nsec)
   */
  public async keysSignIn(
    privateKey: string,
    username?: string
  ): Promise<unknown> {
    const account = await this._userAccount.getAccountFromPrivate(privateKey);
    await this._userAccount.setUser(account, username || randomAnimal());
    return account;
  }

  public getUserNamespacedKey(key: string) {
    return ":" + (this._userAccount.getAddress() || "") + "." + key;
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
    this._keyListeners.push({ key, timeout: null, fn });
    return this._keyListeners.length - 1;
  };

  public removeKeyListener = (id: number) => {
    const listener = this._keyListeners[id];
    if (listener?.timeout) clearTimeout(listener.timeout);
    this._keyListeners[id] = null;
  };

  public triggerKeyListener = <T = any>(
    key: string,
    message: VerificationData<T>
  ) => {
    this._keyListeners.forEach((listener) => {
      if (listener?.key === key) {
        this.logger(`Trigger key listener: ${key}`);
        if (listener.timeout) clearTimeout(listener.timeout);
        listener.timeout = setTimeout(
          () => listener.fn(message),
          this._options.triggerDebouce
        );
      }
    });
  };

  /**
   * Custom verificators can enhance default verification on any key prefix
   */
  public _customVerificator: (CustomVerificator | null)[] = [];

  public addCustomVerification = <T = any>(
    key: string,
    fn: (msg: VerificationData<T>, previous: any) => Promise<boolean>
  ) => {
    this._customVerificator.push({ key, fn });
    return this._customVerificator.length - 1;
  };

  public removeCustomVerification = (id: number) => {
    this._customVerificator[id] = null;
  };

  /**
   * What verification needs from us
   */
  get verifyContext(): VerifyContext {
    return {
      topic: this._options.topic,
      customVerificators: this._customVerificator,
      loadPrevious: async (finalKey) => {
        const stored = await getStoredEvent(this._store, finalKey);
        if (stored) return eventToRecord(stored, finalKey);
        const crdt = await getStoredCrdt(this._store, finalKey);
        return crdt ? toCrdtView(crdt) : undefined;
      },
    };
  }

  private _keyLocks: Record<string, Promise<unknown>> = {};

  /**
   * Runs the given function once all the previous calls for this key finished.
   * Used to avoid losing data when reading, merging and writing the same key
   * concurrently.
   */
  public withKeyLock<R>(key: string, fn: () => Promise<R>): Promise<R> {
    const previous = this._keyLocks[key] || Promise.resolve();
    const result = previous.then(fn);
    const lock = result.catch(() => undefined);
    this._keyLocks[key] = lock;
    lock.then(() => {
      if (this._keyLocks[key] === lock) delete this._keyLocks[key];
    });
    return result;
  }

  /**
   * Closes the relay connections and the store.
   * Call this when you're done with the database instance.
   */
  public async close(): Promise<void> {
    Object.values(this._subscriptions).forEach((close) => close());
    this._subscriptions = {};
    this._relays.close();
    if (typeof (this._store as any).close === "function") {
      await (this._store as any).close();
    }
  }
}
