import {
  BoundedSet,
  CRDT_EVENT_KIND,
  CustomVerificator,
  FUNCTION_REQUEST_KIND,
  FUNCTION_RESPONSE_KIND,
  FunctionReturn,
  NostrEvent,
  PROFILE_KIND,
  RelayPool,
  WebSocketConstructor,
  ServerFunction,
  StorageContext,
  ToolDbStorageAdapter,
  VALUE_KIND,
  VerifyContext,
  VerifyResult,
  createFunctionResponse,
  eventToRecord,
  filterValidCrdtEvents,
  finalizeEvent,
  generateSecretKey,
  getCrdtFilters,
  getPublicKey,
  getTagValue,
  getValueFilters,
  parseFunctionRequest,
  parseKeyTag,
  pickNewest,
  toCrdtView,
  verifyCrdtEvent,
  verifyValueEvent,
} from "tool-db";

import { EventStore, MemoryEventStore } from "./eventStore";
import NostrRelay, { NostrRelayOptions } from "./relay";
import { StorageEventStore } from "./storageEventStore";

/**
 * Function requests older than this (in seconds) are ignored, so a request
 * seen on a public relay can not be replayed later
 */
const MAX_REQUEST_AGE = 60;

export interface ToolDbRelayOptions
  extends Omit<NostrRelayOptions, "store" | "acceptEvent"> {
  /**
   * The app topic this node serves
   */
  topic: string;
  /**
   * Storage adapter class for the events, kept in memory if not set
   */
  storageAdapter?: typeof ToolDbStorageAdapter;
  /**
   * Storage name (folder, database name...) for the storage adapter
   */
  storageName?: string;
  /**
   * Secret key of the node (hex), used to sign server function responses.
   * A new one is generated if not set.
   */
  secretKey?: string;
  /**
   * Also store events that are not ToolDB data of our topic, like a regular
   * Nostr relay (default false)
   */
  acceptForeignEvents?: boolean;
  /**
   * Other relays (like public ones) to listen on for function requests
   * addressed to this node, so clients do not need to connect to it
   */
  listenRelays?: string[];
  /**
   * WebSocket implementation to connect to listenRelays, the global one by
   * default (Node 22+)
   */
  WebSocket?: WebSocketConstructor;
  debug?: boolean;
}

/**
 * A ToolDB relay node: a Nostr relay that validates the data of an app with
 * the same rules as ToolDB clients, keeps it in a storage adapter, and runs
 * server functions.
 */
export default class ToolDbRelay extends NostrRelay {
  private relayOptions: ToolDbRelayOptions;

  private secretKey: string;

  private functions: Record<string, ServerFunction<any, any>> = {};

  private customVerificators: (CustomVerificator | null)[] = [];

  /**
   * Ids of the function requests we already ran, since the same request can
   * arrive directly and through other relays
   */
  private handledRequests = new BoundedSet<string>(10000);

  private listenPool: RelayPool | undefined;

  constructor(options: ToolDbRelayOptions) {
    const secretKey = options.secretKey || generateSecretKey();
    const pubkey = getPublicKey(secretKey);

    let store: EventStore = new MemoryEventStore();
    if (options.storageAdapter) {
      const context: StorageContext = {
        options: { storageName: options.storageName || "tooldb-relay" },
        logger: (...args: any[]) => {
          if (options.debug) console.log("[tooldb-relay]", ...args);
        },
      };
      store = new StorageEventStore(new options.storageAdapter(context));
    }

    super({
      ...options,
      store,
      info: {
        pubkey,
        description: `ToolDB node for ${options.topic}`,
        ...options.info,
      },
    });

    this.relayOptions = options;
    this.secretKey = secretKey;
  }

  /**
   * Public key of the node, clients set it in `functionServers`
   */
  public get pubkey(): string {
    return getPublicKey(this.secretKey);
  }

  /**
   * Server functions can be called by clients with doFunction. They get the
   * arguments and the public key of the caller. It is up to the function to
   * check its arguments and permissions.
   */
  public addServerFunction<R, A = any>(name: string, fn: ServerFunction<R, A>) {
    this.functions[name] = fn;
  }

  /**
   * Custom verificators, like the ones of clients, applied to every event
   * the node stores
   */
  public addCustomVerification<T = any>(
    key: string,
    fn: CustomVerificator<T>["fn"]
  ): number {
    this.customVerificators.push({ key, fn });
    return this.customVerificators.length - 1;
  }

  public removeCustomVerification(id: number) {
    this.customVerificators[id] = null;
  }

  private get verifyContext(): VerifyContext {
    const { topic } = this.relayOptions;
    return {
      topic,
      customVerificators: this.customVerificators,
      loadPrevious: async (finalKey) => {
        const value = pickNewest(
          await this.store.query(getValueFilters(topic, finalKey))
        );
        if (value) return eventToRecord(value, finalKey);

        const changeSets = await this.store.query(
          getCrdtFilters(topic, finalKey)
        );
        if (changeSets.length === 0) return undefined;
        const type = getTagValue(changeSets[0], "c") || "";
        const valid = await filterValidCrdtEvents(
          { ...this.verifyContext, customVerificators: [] },
          changeSets,
          finalKey,
          type
        );
        return toCrdtView({ k: finalKey, c: type, events: valid });
      },
    };
  }

  /**
   * Accepts ToolDB data of our topic only if it passes the same verification
   * clients do, and other events depending on acceptForeignEvents.
   */
  protected async accept(event: NostrEvent): Promise<true | string> {
    const { topic } = this.relayOptions;

    // Function requests and responses are ephemeral, never stored
    if (
      event.kind === FUNCTION_REQUEST_KIND ||
      event.kind === FUNCTION_RESPONSE_KIND
    ) {
      return true;
    }

    // User profiles, apps use them for names
    if (event.kind === PROFILE_KIND) {
      try {
        const profile = JSON.parse(event.content);
        return typeof profile === "object" && profile !== null
          ? true
          : "invalid profile";
      } catch (e) {
        return "invalid profile";
      }
    }

    if (event.kind === VALUE_KIND) {
      const finalKey = parseKeyTag(topic, getTagValue(event, "d") || "");
      if (finalKey !== undefined) {
        const result = await verifyValueEvent(
          this.verifyContext,
          event,
          finalKey
        );
        return result === VerifyResult.Verified || result;
      }
    }

    if (event.kind === CRDT_EVENT_KIND) {
      const finalKey = parseKeyTag(topic, getTagValue(event, "k") || "");
      if (finalKey !== undefined) {
        const result = await verifyCrdtEvent(
          this.verifyContext,
          event,
          finalKey,
          getTagValue(event, "c") || ""
        );
        return result === VerifyResult.Verified || result;
      }
    }

    return this.relayOptions.acceptForeignEvents
      ? true
      : `only ToolDB data of the ${topic} topic`;
  }

  /**
   * Runs a function request addressed to us, once.
   * @returns the signed response, or undefined if the request was already
   * handled, is too old (could be a replay) or is not for us
   */
  private async runFunction(
    event: NostrEvent
  ): Promise<NostrEvent | undefined> {
    const request = parseFunctionRequest(event, this.pubkey);
    if (!request) return undefined;
    if (this.handledRequests.has(event.id)) return undefined;
    if (event.created_at < Math.floor(Date.now() / 1000) - MAX_REQUEST_AGE) {
      return undefined;
    }
    this.handledRequests.add(event.id);

    let response: FunctionReturn<any>;
    const fn = this.functions[request.name];
    if (!fn) {
      response = {
        code: "NOT_FOUND",
        return: `Function ${request.name} not found`,
      };
    } else {
      try {
        response = { code: "OK", return: await fn(request.args, event.pubkey) };
      } catch (e: any) {
        response = { code: "ERR", return: e?.message || String(e) };
      }
    }

    return finalizeEvent(
      createFunctionResponse(event, response),
      this.secretKey
    );
  }

  /**
   * Runs function requests addressed to us, instead of relaying them
   */
  protected async interceptEvent(event: NostrEvent): Promise<boolean> {
    if (!parseFunctionRequest(event, this.pubkey)) return false;

    const response = await this.runFunction(event);
    if (response) this.broadcast(response);
    return true;
  }

  public async start(): Promise<void> {
    await super.start();

    const { listenRelays } = this.relayOptions;
    if (listenRelays && listenRelays.length > 0) {
      const pool = new RelayPool(listenRelays, {
        WebSocket:
          this.relayOptions.WebSocket ||
          ((globalThis as any).WebSocket as WebSocketConstructor),
      });
      this.listenPool = pool;

      pool.subscribe(
        [
          {
            kinds: [FUNCTION_REQUEST_KIND],
            "#p": [this.pubkey],
            since: Math.floor(Date.now() / 1000) - MAX_REQUEST_AGE,
          },
        ],
        (event) => {
          this.runFunction(event).then((response) => {
            if (response) pool.publish(response);
          });
        }
      );
    }
  }

  public async close(): Promise<void> {
    this.listenPool?.close();
    this.listenPool = undefined;
    await super.close();
  }
}
