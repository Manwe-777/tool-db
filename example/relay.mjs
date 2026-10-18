// A ToolDB relay node for the chat, for development:
//   npm run relay
// Data is kept in ./relay-data. Set RELAY_SECRET_KEY to keep the same node
// identity between restarts.
import { ToolDbRelay } from "@tool-db/nostr-relay";
import { ToolDbLeveldb } from "@tool-db/leveldb-store";

import { CHAT_TOPIC, onlyOwnJoinRequests } from "./src/rules.js";

const relay = new ToolDbRelay({
  topic: CHAT_TOPIC,
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || "127.0.0.1",
  storageAdapter: ToolDbLeveldb,
  storageName: process.env.RELAY_DATA || "./relay-data",
  secretKey: process.env.RELAY_SECRET_KEY,
});

// The same rule clients apply, so the node does not store invalid requests
relay.addCustomVerification("requests-", onlyOwnJoinRequests);

await relay.start();
console.log(`ToolDB chat relay on ${relay.url} (${relay.pubkey})`);
