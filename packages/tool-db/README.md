# Tool Db

A database on top of Nostr: values and CRDTs signed with Nostr identities,
stored locally and synced through Nostr relays. Runs on Node 22+ and
browsers with the same code.

See the [repository README](https://github.com/Manwe-777/tool-db#readme) and
[NOSTR_FIRST.md](https://github.com/Manwe-777/tool-db/blob/main/NOSTR_FIRST.md)
for the design.

## Install

```
npm install tool-db@next
```

(version 3 is published under the `next` tag while it is tested)

or as a script, which exposes every export in `tooldb`:

```
<script src="https://unpkg.com/tool-db/bundle.js"></script>
```

## Usage

```js
import { ToolDb } from "tool-db";
import { ToolDbIndexedDb } from "@tool-db/indexeddb-store";

const db = new ToolDb({
  relays: ["wss://your-relay.example"],
  topic: "my-app",
  storageAdapter: ToolDbIndexedDb,
});

await db.putData("foo-key", "bar");
await db.getData("foo-key");
```

Options:

- `relays`: Nostr relays to connect to.
- `topic`: app namespace, apps sharing relays only see their own keys.
- `storageAdapter`: local storage (memory only if not set).
- `userAdapter`: the signer, a local Nostr key by default
  (`ToolDbNostrUser`). Sign in with an existing key with
  `db.keysSignIn(nsecOrHex)`.
- `functionServers`: public keys of the relay nodes trusted to run server
  functions.
- `WebSocket`: WebSocket implementation, the global one by default.
