import http, { IncomingMessage, Server as HTTPServer } from "http";
import { AddressInfo } from "net";
import WebSocket, { WebSocketServer } from "ws";

import { NostrEvent, NostrFilter, matchFilters, verifyEvent } from "tool-db";

import { EventStore, MemoryEventStore } from "./eventStore";

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
  /**
   * Relay information document (NIP-11)
   */
  info?: Record<string, unknown>;
}

interface Subscription {
  socket: WebSocket;
  filters: NostrFilter[];
}

const DEFAULT_MAX_MESSAGE_SIZE = 128 * 1024;

/**
 * A Nostr relay (NIP-01) running on Node, with its information document
 * (NIP-11) served over HTTP.
 */
export default class NostrRelay {
  protected options: NostrRelayOptions;

  private httpServer: HTTPServer | undefined;

  private wss: WebSocketServer | undefined;

  protected store: EventStore;

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
      const { port = 0, host = "127.0.0.1" } = this.options;
      const maxPayload =
        this.options.maxMessageSize || DEFAULT_MAX_MESSAGE_SIZE;

      const server = this.options.server || http.createServer();
      if (!this.options.server) {
        // Our own server answers the information document, an existing
        // server keeps handling its own requests
        this.httpServer = server;
        server.on("request", (request, response) =>
          this.onHttpRequest(request, response)
        );
      }

      this.wss = new WebSocketServer({ server, maxPayload });
      this.wss.on("connection", (socket) => this.onConnection(socket));

      if (this.httpServer) {
        this.httpServer.once("error", reject);
        this.httpServer.listen(port, host, () => resolve());
      } else {
        resolve();
      }
    });
  }

  public get port(): number {
    const address = (this.options.server || this.httpServer)?.address();
    return address && typeof address === "object"
      ? (address as AddressInfo).port
      : 0;
  }

  public get url(): string {
    return `ws://${this.options.host || "127.0.0.1"}:${this.port}`;
  }

  /**
   * The relay information document (NIP-11)
   */
  public getInfo(): Record<string, unknown> {
    return {
      supported_nips: [1, 11],
      software: "https://github.com/Manwe-777/tool-db",
      limitation: {
        max_message_length:
          this.options.maxMessageSize || DEFAULT_MAX_MESSAGE_SIZE,
      },
      ...this.options.info,
    };
  }

  private onHttpRequest(
    request: IncomingMessage,
    response: http.ServerResponse
  ) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET",
    };

    if (request.headers.accept?.includes("application/nostr+json")) {
      response.writeHead(200, {
        ...headers,
        "Content-Type": "application/nostr+json",
      });
      response.end(JSON.stringify(this.getInfo()));
      return;
    }

    response.writeHead(200, { ...headers, "Content-Type": "text/plain" });
    response.end("Please use a Nostr client to connect.");
  }

  /**
   * Disconnects every client, stops listening and closes the store
   */
  public async close(): Promise<void> {
    if (!this.wss) return;
    this.wss.clients.forEach((socket) => socket.terminate());
    this.subscriptions.clear();
    await new Promise((resolve) => this.wss!.close(resolve));
    if (this.httpServer) {
      await new Promise((resolve) => this.httpServer!.close(resolve));
    }
    this.wss = undefined;
    await this.store.close?.();
  }

  protected send(socket: WebSocket, message: unknown[]) {
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

  /**
   * Extra validation of incoming events, after their signature was verified.
   * @returns true to accept the event, or a reason to reject it
   */
  protected async accept(event: NostrEvent): Promise<true | string> {
    return this.options.acceptEvent ? this.options.acceptEvent(event) : true;
  }

  /**
   * Lets subclasses handle events themselves, after they were verified and
   * accepted.
   * @returns true if the event was handled, so it is not stored nor broadcast
   */
  protected async interceptEvent(event: NostrEvent): Promise<boolean> {
    return false;
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

    const accepted = await this.accept(event);
    if (accepted !== true) {
      this.send(socket, ["OK", event.id, false, `blocked: ${accepted}`]);
      return;
    }

    if (await this.interceptEvent(event)) {
      this.send(socket, ["OK", event.id, true, ""]);
      return;
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

  /**
   * Sends an event to every open subscription matching it
   */
  protected broadcast(event: NostrEvent) {
    this.subscriptions.forEach((subs) => {
      subs.forEach((sub, subId) => {
        if (matchFilters(sub.filters, event)) {
          this.send(sub.socket, ["EVENT", subId, event]);
        }
      });
    });
  }
}
