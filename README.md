<div align="center">

# 🛠️ Tool Db

### A database on top of Nostr

[![CI](https://github.com/Manwe-777/tool-db/actions/workflows/main.yml/badge.svg)](https://github.com/Manwe-777/tool-db/actions/workflows/main.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

**[💬 Report Bug](https://github.com/Manwe-777/tool-db/issues)**

---

</div>

> **Status:** this branch is a rewrite of ToolDB on top of Nostr, see
> [NOSTR_FIRST.md](NOSTR_FIRST.md) for the design and progress. The
> [documentation site](https://manwe-777.github.io/tool-db-docs/) and the
> [chat demo](https://manwe-777.github.io/tool-db-chat-example/) still
> describe the previous peer to peer protocol.

## 💡 Philosophy

ToolDb is designed as **open, permissionless infrastructure**.

It enables data exchange without centralized custody, accounts, or trust anchors. Identity is cryptographic, data ownership is local-first, and connectivity comes from the network itself: Nostr relays, public or your own.

This project is intentionally permissive. Commercial use, private deployments, and derivative systems are welcome. Contributions, attribution, and community participation are very appreciated but not required.

**ToolDb favors adoption, interoperability, and resilience**

---

<table>
<tr>
<td width="50%">

🔐 **Signed data**
<br/>Every value and change is signed by its author

🌐 **Nostr native**
<br/>Nostr identities, events and relays

⚡ **Real-time Updates**
<br/>Subscribe to live data changes

</td>
<td width="50%">

📴 **Offline First**
<br/>Local storage, synced with relays

📦 **Key-Value Storage**
<br/>Shared keys and user namespaces

🔄 **Built-in CRDTs**
<br/>Maps, lists and counters, with provable authors

</td>
</tr>
</table>

---

## 🚀 Quick Start

```bash
npm install tool-db
```

```javascript
import { ToolDb, MapCrdt } from "tool-db";

const db = new ToolDb({
  relays: ["wss://your-relay.example"],
  topic: "my-app",
});

// Values, signed with our Nostr identity
await db.putData("foo-key", "bar");
const value = await db.getData("foo-key");

// User namespaced values, only we can write them
await db.putData("profile", { name: "Alice" }, true);

// Real-time updates
db.addKeyListener("foo-key", (data) => console.log("Updated:", data.v));
db.subscribeData("foo-key");

// CRDTs, every change is signed by its author
const doc = new MapCrdt(db.userAccount.getAddress());
doc.SET("hello", "world");
await db.putCrdt("shared-doc", doc);
await db.getCrdt("shared-doc", doc);
```

Every client verifies everything it receives, so any Nostr relay can be
used. Run a ToolDB relay node to also validate, persist and serve your app's
data, and to run server functions:

```javascript
import { ToolDbRelay } from "@tool-db/nostr-relay";
import ToolDbLeveldb from "@tool-db/leveldb-store";

const relay = new ToolDbRelay({
  topic: "my-app",
  port: 8080,
  storageAdapter: ToolDbLeveldb,
  storageName: "./data",
  secretKey: process.env.RELAY_SECRET_KEY,
});

relay.addServerFunction("add", async ({ a, b }, caller) => a + b);
await relay.start();

// Clients trust the node for functions with its public key
const db = new ToolDb({
  relays: [relay.url],
  topic: "my-app",
  functionServers: [relay.pubkey],
});
await db.doFunction("add", { a: 1, b: 2 }); // { code: "OK", return: 3 }
```

---

## 📦 Packages

| Package                    | Description                                                                   |
| -------------------------- | ----------------------------------------------------------------------------- |
| `tool-db`                  | The database: Nostr identity, relay pool, values and CRDTs                    |
| `@tool-db/nostr-relay`     | Nostr relay and ToolDB relay node (validation, storage, functions), Node only |
| `@tool-db/leveldb-store`   | LevelDB storage adapter for Node                                              |
| `@tool-db/indexeddb-store` | IndexedDB storage adapter for browsers                                        |
| `@tool-db/redis-store`     | Redis storage adapter for Node                                                |

`tool-db` runs on Node 22+ and browsers with the same code; its only
dependencies are pure JS (`@noble`, `@scure/base` and `events`).

---

## 🧪 Development

```bash
npm install
npm run build          # Build every package
npm test               # Run all tests
```

---

## 📄 License

Apache-2.0 © [Manuel Etchegaray](mailto:manuel.etchegaray7@gmail.com)
