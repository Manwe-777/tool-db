import { ToolDb, ToolDbNetworkAdapter, NostrEvent, NostrFilter } from "tool-db";

import RelayPool, { PublishResult, WebSocketConstructor } from "./pool";

/**
 * Uses the global WebSocket (browsers, web workers and Node 22+), or the
 * `ws` package on older Node versions. Bundlers skip `ws` (see the
 * "browser" field of package.json).
 */
function getWebSocket(): WebSocketConstructor {
  if (typeof globalThis.WebSocket !== "undefined") {
    return globalThis.WebSocket as unknown as WebSocketConstructor;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  return require("ws");
}

/**
 * Network adapter using Nostr relays.
 * Relays are set with the `relays` option.
 */
export default class ToolDbNostrNetwork extends ToolDbNetworkAdapter {
  public readonly isNostrNetwork = true;

  private pool: RelayPool;

  constructor(db: ToolDb) {
    super(db);

    this.pool = new RelayPool(db.options.relays, {
      WebSocket: db.options.modules.nostr?.WebSocket || getWebSocket(),
      onStatus: (connected) => this.onStatus(connected),
    });
  }

  private onStatus(connected: number) {
    if (connected > 0 && !this.tooldb.isConnected) {
      this.tooldb.isConnected = true;
      this.tooldb.onConnect();
    } else if (connected === 0 && this.tooldb.isConnected) {
      this.tooldb.isConnected = false;
      this.tooldb.onDisconnect();
    }
  }

  /**
   * Number of relays we are connected to
   */
  get connectedRelays(): number {
    return this.pool.connected;
  }

  public publish(
    event: NostrEvent,
    timeoutMs?: number
  ): Promise<PublishResult> {
    return this.pool.publish(event, timeoutMs);
  }

  public query(
    filters: NostrFilter[],
    timeoutMs?: number
  ): Promise<NostrEvent[]> {
    return this.pool.query(filters, timeoutMs);
  }

  public subscribe(
    filters: NostrFilter[],
    onEvent: (event: NostrEvent) => void
  ): () => void {
    return this.pool.subscribe(filters, onEvent);
  }

  public close() {
    this.pool.close();
  }
}

export { default as RelayPool } from "./pool";
export * from "./pool";
