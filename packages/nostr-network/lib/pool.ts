import {
  BoundedSet,
  NostrEvent,
  NostrFilter,
  textRandom,
  verifyEvent,
} from "tool-db";

/**
 * The parts of the WebSocket API we use, implemented by browsers, Node 22+
 * and the `ws` package.
 */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onmessage: ((event: { data: any }) => void) | null;
}

export type WebSocketConstructor = new (url: string) => WebSocketLike;

const OPEN = 1;

export interface PublishResult {
  accepted: string[];
  rejected: { url: string; reason: string }[];
}

interface RelaySubscription {
  filters: NostrFilter[];
  onEvent: (event: NostrEvent, url: string) => void;
  onEose?: (url: string) => void;
}

export interface RelayPoolOptions {
  WebSocket: WebSocketConstructor;
  /**
   * Called when the number of connected relays changes
   */
  onStatus?: (connected: number) => void;
  /**
   * Reconnection backoff, in milliseconds
   */
  minRetryMs?: number;
  maxRetryMs?: number;
}

/**
 * A single relay connection, reconnecting with backoff and restoring
 * subscriptions after reconnecting.
 */
class RelayConnection {
  public readonly url: string;

  private socket: WebSocketLike | undefined;

  private closed = false;

  private retryMs: number;

  private retryTimeout: ReturnType<typeof setTimeout> | undefined;

  public subscriptions = new Map<string, RelaySubscription>();

  private pendingOk = new Map<string, (ok: boolean, reason: string) => void>();

  constructor(
    url: string,
    private options: RelayPoolOptions,
    private onStatusChange: () => void
  ) {
    this.url = url;
    this.retryMs = options.minRetryMs ?? 1000;
    this.connect();
  }

  get connected() {
    return this.socket?.readyState === OPEN;
  }

  private connect() {
    if (this.closed) return;

    let socket: WebSocketLike;
    try {
      socket = new this.options.WebSocket(this.url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.retryMs = this.options.minRetryMs ?? 1000;
      this.subscriptions.forEach((sub, subId) =>
        this.send(["REQ", subId, ...sub.filters])
      );
      this.onStatusChange();
    };

    socket.onmessage = (event) => this.onMessage(event.data);

    socket.onerror = () => {
      // onclose follows
    };

    socket.onclose = () => {
      this.pendingOk.forEach((resolve) => resolve(false, "connection closed"));
      this.pendingOk.clear();
      this.onStatusChange();
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.closed) return;
    this.retryTimeout = setTimeout(() => this.connect(), this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, this.options.maxRetryMs ?? 60000);
  }

  private send(message: unknown[]) {
    if (this.connected) this.socket!.send(JSON.stringify(message));
  }

  private onMessage(data: any) {
    let message: any;
    try {
      message = JSON.parse(typeof data === "string" ? data : data.toString());
    } catch (e) {
      return;
    }
    if (!Array.isArray(message)) return;

    const [type, ...args] = message;
    if (type === "EVENT") {
      const sub = this.subscriptions.get(args[0]);
      // Relays are untrusted, every event is verified
      if (sub && verifyEvent(args[1])) sub.onEvent(args[1], this.url);
    } else if (type === "EOSE") {
      this.subscriptions.get(args[0])?.onEose?.(this.url);
    } else if (type === "CLOSED") {
      const sub = this.subscriptions.get(args[0]);
      this.subscriptions.delete(args[0]);
      sub?.onEose?.(this.url);
    } else if (type === "OK") {
      const resolve = this.pendingOk.get(args[0]);
      this.pendingOk.delete(args[0]);
      resolve?.(args[1] === true, args[2] || "");
    }
  }

  public publish(event: NostrEvent): Promise<{ ok: boolean; reason: string }> {
    if (!this.connected) {
      return Promise.resolve({ ok: false, reason: "not connected" });
    }
    return new Promise((resolve) => {
      this.pendingOk.set(event.id, (ok, reason) => resolve({ ok, reason }));
      this.send(["EVENT", event]);
    });
  }

  public subscribe(subId: string, sub: RelaySubscription) {
    this.subscriptions.set(subId, sub);
    this.send(["REQ", subId, ...sub.filters]);
  }

  public unsubscribe(subId: string) {
    if (this.subscriptions.delete(subId)) this.send(["CLOSE", subId]);
  }

  public close() {
    this.closed = true;
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.socket?.close();
  }
}

/**
 * Connects to several relays: publishes to all of them, and reads from all
 * of them, verifying and deduplicating every event.
 */
export default class RelayPool {
  private relays: RelayConnection[];

  private lastConnected = 0;

  constructor(urls: string[], private options: RelayPoolOptions) {
    this.relays = urls.map(
      (url) => new RelayConnection(url, options, () => this.onStatusChange())
    );
  }

  get connected(): number {
    return this.relays.filter((relay) => relay.connected).length;
  }

  get urls(): string[] {
    return this.relays.map((relay) => relay.url);
  }

  private onStatusChange() {
    const connected = this.connected;
    if (connected !== this.lastConnected) {
      this.lastConnected = connected;
      this.options.onStatus?.(connected);
    }
  }

  /**
   * Publishes an event to every connected relay
   * @returns which relays accepted or rejected it, once all answered or the timeout
   */
  public async publish(
    event: NostrEvent,
    timeoutMs = 5000
  ): Promise<PublishResult> {
    const result: PublishResult = { accepted: [], rejected: [] };

    const answers = this.relays.map((relay) =>
      relay.publish(event).then(({ ok, reason }) => {
        if (ok) result.accepted.push(relay.url);
        else result.rejected.push({ url: relay.url, reason });
      })
    );

    await Promise.race([
      Promise.all(answers),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);

    return result;
  }

  /**
   * Subscribes to events matching the filters, on every relay, including
   * relays that reconnect later.
   * @returns a function to close the subscription
   */
  public subscribe(
    filters: NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    onEose?: (url: string) => void
  ): () => void {
    const subId = textRandom(16);
    const seen = new BoundedSet<string>(5000);

    this.relays.forEach((relay) =>
      relay.subscribe(subId, {
        filters,
        onEvent: (event) => {
          if (seen.has(event.id)) return;
          seen.add(event.id);
          onEvent(event);
        },
        onEose,
      })
    );

    return () => this.relays.forEach((relay) => relay.unsubscribe(subId));
  }

  /**
   * Gets the stored events matching the filters from every connected relay
   * @returns once every connected relay sent EOSE, or the timeout
   */
  public query(
    filters: NostrFilter[],
    timeoutMs = 3000
  ): Promise<NostrEvent[]> {
    return new Promise((resolve) => {
      const events: NostrEvent[] = [];
      const pending = new Set(
        this.relays.filter((relay) => relay.connected).map((relay) => relay.url)
      );

      let close = () => {
        // assigned below
      };
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        close();
        resolve(events);
      };
      const timeout = setTimeout(finish, timeoutMs);

      if (pending.size === 0) {
        finish();
        return;
      }

      close = this.subscribe(
        filters,
        (event) => events.push(event),
        (url) => {
          pending.delete(url);
          if (pending.size === 0) finish();
        }
      );
    });
  }

  public close() {
    this.relays.forEach((relay) => relay.close());
  }
}
