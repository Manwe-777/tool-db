# `@tool-db/nostr-relay`

Nostr relays for Node:

- `NostrRelay`: a NIP-01 relay with its NIP-11 information document, with
  pluggable event storage (`MemoryEventStore`, or `StorageEventStore` on any
  ToolDB storage adapter).
- `ToolDbRelay`: a ToolDB relay node for one app topic. It validates ToolDB
  data with the same rules as clients (plus its own custom verificators),
  stores it, and runs server functions.

```js
import { ToolDbRelay } from "@tool-db/nostr-relay";
import ToolDbLeveldb from "@tool-db/leveldb-store";

const relay = new ToolDbRelay({
  topic: "my-app",
  port: 8080,
  storageAdapter: ToolDbLeveldb,
  storageName: "./data",
  // Keep the same key, clients trust it to run functions
  secretKey: process.env.RELAY_SECRET_KEY,
  // Also answer function requests sent through these relays
  listenRelays: ["wss://relay.example.com"],
});

relay.addServerFunction("add", async ({ a, b }, caller) => a + b);
await relay.start();
console.log(relay.url, relay.pubkey);
```
