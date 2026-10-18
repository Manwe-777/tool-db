import { Server as HTTPServer } from "http";
import { AddressInfo } from "net";
import WebSocket, { WebSocketServer } from "ws";

import {
  NostrEvent,
  NostrFilter,
  getKindType,
  getReplaceableAddress,
  isNewerEvent,
  matchFilter,
  matchFilters,
  verifyEvent,
} from "tool-db";

export interface EventStore {
  /**
   * Stores an event, following the rules of its kind.
   * @returns false if the event was a duplicate or older than the stored one
   */
  add(event: NostrEvent): Promise<boolean>;
  /**
   * Returns the stored events matching any of the filters, newest first
   */
  query(filters: NostrFilter[]): Promise<NostrEvent[]>;
}

/**
 * Event store kept in memory, useful for tests and ephemeral relays
 */
export class MemoryEventStore implements EventStore {
  private events: Record<string, NostrEvent> = {};

  private addresses: Record<string, string> = {};

  public async add(event: NostrEvent): Promise<boolean> {
    if (getKindType(event.kind) === "ephemeral") return true;
    if (this.events[event.id]) return false;

    const address = getReplaceableAddress(event);
    if (address) {
      const current = this.events[this.addresses[address]];
      if (current && !isNewerEvent(event, current)) return false;
      if (current) delete this.events[current.id];
      this.addresses[address] = event.id;
    }

    this.events[event.id] = event;
    return true;
  }

  public async query(filters: NostrFilter[]): Promise<NostrEvent[]> {
    const all = Object.values(this.events).sort(
      (a, b) => b.created_at - a.created_at
    );

    const found: Record<string, NostrEvent> = {};
    filters.forEach((filter) => {
      const matches = all.filter((event) => matchFilter(filter, event));
      const limited =
        filter.limit !== undefined ? matches.slice(0, filter.limit) : matches;
      limited.forEach((event) => {
        found[event.id] = event;
      });
    });

    return Object.values(found).sort((a, b) => b.created_at - a.created_at);
  }
}

export interface NostrRelayOptions {
  /**
   * Port to listen on, 0 picks a free port (default)
   */
  port?: number;
  host?: string;
  /**
   * Attach to an existing HTTP server instead of listening on a port
   */
  server?: HTTPServer;
  store?: EventStore;
  /**
   * Max seconds an event can be in the future (default 60)
   */
  maxFutureSeconds?: number;
  /**
   * Max size of a message in bytes (default 128KB)
   */
  maxMessageSize?: number;
  /**
   * Extra validation of incoming events. Return true to accept the event, or
   * a reason to reject it.
   */
  acceptEvent?: (event: NostrEvent) => Promise<true | string> | true | string;
}

interface Subscription {
  socket: WebSocket;
  filters: NostrFilter[];
}

/**
 * A Nostr relay (NIP-01) running on Node.
 */
export default class NostrRelay {
  private options: NostrRelayOptions;

  private wss: WebSocketServer | undefined;

  private store: EventStore;

  private subscriptions = new Map<WebSocket, Map<string, Subscription>>();

  constructor(options: NostrRelayOptions = {}) {
    this.options = options;
    this.store = options.store || new MemoryEventStore();
  }

  /**
   * Starts listening, resolves once the relay accepts connections
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { server, port = 0, host = "127.0.0.1" } = this.options;
      const maxPayload = this.options.maxMessageSize || 128 * 1024;

      this.wss = server
        ? new WebSocketServer({ server, maxPayload })
        : new WebSocketServer({ port, host, maxPayload });

      this.wss.on("connection", (socket) => this.onConnection(socket));
      this.wss.on("error", reject);

      if (server) {
        resolve();
      } else {
        this.wss.on("listening", () => resolve());
      }
    });
  }

  public get port(): number {
    const address = (this.options.server || this.wss)?.address();
    return address && typeof address === "object"
      ? (address as AddressInfo).port
      : 0;
  }

  public get url(): string {
    return `ws://${this.options.host || "127.0.0.1"}:${this.port}`;
  }

  /**
   * Disconnects every client and stops listening
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.clients.forEach((socket) => socket.terminate());
      this.subscriptions.clear();
      this.wss.close(() => resolve());
    });
  }

  private send(socket: WebSocket, message: unknown[]) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private onConnection(socket: WebSocket) {
    this.subscriptions.set(socket, new Map());

    socket.on("message", (data) => {
      this.onMessage(socket, data.toString()).catch((e) => {
        this.send(socket, ["NOTICE", `error: ${e?.message || e}`]);
      });
    });

    socket.on("close", () => {
      this.subscriptions.delete(socket);
    });
  }

  private async onMessage(socket: WebSocket, data: string) {
    let message: any;
    try {
      message = JSON.parse(data);
    } catch (e) {
      this.send(socket, ["NOTICE", "invalid: message is not JSON"]);
      return;
    }

    if (!Array.isArray(message)) {
      this.send(socket, ["NOTICE", "invalid: message is not an array"]);
      return;
    }

    const [type, ...args] = message;
    if (type === "EVENT") {
      await this.onEvent(socket, args[0]);
    } else if (type === "REQ") {
      await this.onReq(socket, args[0], args.slice(1));
    } else if (type === "CLOSE") {
      this.subscriptions.get(socket)?.delete(args[0]);
    } else {
      this.send(socket, ["NOTICE", `invalid: unknown message type ${type}`]);
    }
  }

  private async onEvent(socket: WebSocket, event: any) {
    if (!verifyEvent(event)) {
      const id = typeof event?.id === "string" ? event.id : "";
      this.send(socket, ["OK", id, false, "invalid: bad event or signature"]);
      return;
    }

    const maxFuture = this.options.maxFutureSeconds ?? 60;
    if (event.created_at > Math.floor(Date.now() / 1000) + maxFuture) {
      this.send(socket, [
        "OK",
        event.id,
        false,
        "invalid: created_at is in the future",
      ]);
      return;
    }

    if (this.options.acceptEvent) {
      const accepted = await this.options.acceptEvent(event);
      if (accepted !== true) {
        this.send(socket, ["OK", event.id, false, `blocked: ${accepted}`]);
        return;
      }
    }

    const stored = await this.store.add(event);
    if (!stored) {
      this.send(socket, ["OK", event.id, true, "duplicate: already have it"]);
      return;
    }

    this.send(socket, ["OK", event.id, true, ""]);
    this.broadcast(event);
  }

  private async onReq(socket: WebSocket, subId: any, filters: any[]) {
    if (typeof subId !== "string" || subId.length === 0 || subId.length > 64) {
      this.send(socket, ["NOTICE", "invalid: bad subscription id"]);
      return;
    }

    const validFilters = filters.filter(
      (filter) => typeof filter === "object" && filter !== null
    ) as NostrFilter[];

    this.subscriptions
      .get(socket)
      ?.set(subId, { socket, filters: validFilters });

    const events = await this.store.query(validFilters);
    events.forEach((event) => this.send(socket, ["EVENT", subId, event]));
    this.send(socket, ["EOSE", subId]);
  }

  private broadcast(event: NostrEvent) {
    this.subscriptions.forEach((subs) => {
      subs.forEach((sub, subId) => {
        if (matchFilters(sub.filters, event)) {
          this.send(sub.socket, ["EVENT", subId, event]);
        }
      });
    });
  }
}
