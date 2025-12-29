# Tool Db

ToolDb is a peer-to-peer model for a decentralized database, inspired by GunDB.

It is the mix of a lot of cool concepts into one:

- 🔐 Cryptographically secure
- 📴 Offline first
- 🌐 Fully decentralized
- ⚡ Capable of providing realtime updates
- 📦 Key-value/document storage
- 🔄 Built-in CRDT support for conflict-free data types
- 🖥️ Works in the Browser and Node.js seamlessly

For more detailed documentation head here:

[https://github.com/Manwe-777/tool-db-docs](https://github.com/Manwe-777/tool-db-docs)

_(No live version just yet!, until the protocol is more finalized)_

## Architecture

We push towards the concept of federated servers, where we set up a p2p mesh network between any servers who want to join the swarm, and have those servers manage the connection and data sharing between them, while allowing client peers to connect to them to push updates to the database.

This setup IS NOT a requirement! It is just what we think is the best and most reliable way of creating a p2p network for dApps using both desktop and web compatible technologies. Any peer has the capability of connecting to any other peer through websockets, and modifying the code to allow WebRTC connections between web peers is absolutely possible.

Since anyone can join a federated server swarm to help grow the network, we use cryptography (basic public and private key authentication and signature validation) to ensure all messages are coming from the real authors of the data that they intend to modify. By joining a swarm, all peers in it can help validate without even having full data; even a new server peer can help, because all information is stored on each message and we don't rely on any centralized database to fetch users data.

Please check the [chain-swarm](https://github.com/Manwe-777/chain-swarm) repository to see how a federated server swarm would look like. Tool Db only handles the connection and messaging between peers, but it does not have any logic for peer discovery.
We do that using [discovery-channel](https://www.npmjs.com/package/discovery-channel), but you can use any DHT/networking solution you want! Even WebRTC between browsers works using the `toolDbWebrtc` transport.

## Packages

Tool Db is organized as a monorepo with the following packages:

| Package             | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `tool-db`           | Core database functionality and API                          |
| `ecdsa-user`        | ECDSA-based user authentication and cryptographic operations |
| `web3-user`         | Web3/Ethereum wallet-based user authentication               |
| `leveldb-store`     | LevelDB storage adapter for Node.js                          |
| `indexeddb-store`   | IndexedDB storage adapter for browsers                       |
| `redis-store`       | Redis storage adapter for server deployments                 |
| `websocket-network` | WebSocket network adapter                                    |
| `webrtc-network`    | WebRTC network adapter for browser-to-browser connections    |
| `hybrid-network`    | Hybrid network adapter combining multiple transports         |

## CRDT Support

Tool Db includes built-in support for Conflict-free Replicated Data Types (CRDTs), which allow for automatic conflict resolution in distributed systems:

| CRDT Type       | Operations   | Use Case                                          |
| --------------- | ------------ | ------------------------------------------------- |
| **MapCRDT**     | `SET`, `DEL` | Key-value stores with per-key conflict resolution |
| **ListCRDT**    | `INS`, `DEL` | Ordered lists with concurrent insert support      |
| **CounterCRDT** | `ADD`, `SUB` | Distributed counters that merge correctly         |

CRDTs ensure that all peers eventually converge to the same state, regardless of the order in which updates are received.

## Install

You can install ToolDb via npm or yarn:

```bash
npm install tool-db
```

or use it via script in your html:

```html
<script src="https://unpkg.com/tool-db/bundle.js"></script>
```

That will include all of ToolDb exports in `tooldb`, then you can use it like:

```javascript
const { ToolDb, sha256 } = tooldb;
```

## Requirements

- Node.js >= 16.0.0

## Base Usage

Creating a WebRTC peers network is as easy as:

```javascript
import { ToolDb, ToolDbWebrtc } from "tool-db";

const db = new ToolDb({
  networkAdapter: ToolDbWebrtc,
  debug: true,
});
```

From there you can put and get data using the API:

```javascript
// Simple key-value storage
db.putData("foo-key", "bar").then(console.log);

// Get data
const value = await db.getData("foo-key");

// Subscribe to updates
db.subscribeData("foo-key", (data) => {
  console.log("Data updated:", data);
});
```

### Using CRDTs

```javascript
// Counter CRDT
const counter = await db.getCrdt("my-counter", "COUNTER");
counter.ADD(5);
counter.SUB(2);
console.log(counter.value); // 3

// Map CRDT
const map = await db.getCrdt("my-map", "MAP");
map.SET("name", "Alice");
map.SET("age", 30);
console.log(map.value); // { name: "Alice", age: 30 }

// List CRDT
const list = await db.getCrdt("my-list", "LIST");
list.PUSH("item1");
list.INS(0, "item0"); // Insert at position
console.log(list.value); // ["item0", "item1"]
```

### User Authentication

```javascript
// Anonymous sign in
await db.anonSignIn();

// Sign up with username and password
await db.signUp("username", "password");

// Sign in with credentials
await db.signIn("username", "password");

// Sign in with private key
await db.keysSignIn(privateKey);
```

## Running the Demo

```bash
# Run the demo
npm run demo

# Run demo with fresh database
npm run demo:fresh
```

## Testing

```bash
# Run all tests
npm test

# Run a single test file
npx jest __tests__/filename.ts

# Run tests in watch mode
npm run test:watch
```

## Future Work

While the database is currently functioning as expected, there are many things that could be added or improved:

- Allow data encryption (probably built in), add methods for ECC encryption, shared keys, etc.
- Allow adding Noise/encryption to connections (probably based on the peer identity, requires initial keys exchange on connection)
- Property-based testing for CRDTs using libraries like `fast-check`
- Performance benchmarks with larger datasets
- Metrics for tracking CRDT change arrays growth

## Recent Improvements

### CRDT Bug Fixes & Test Coverage

- Fixed 5 critical bugs in CRDT implementations (MapCRDT, ListCRDT, CounterCRDT)
- Added 48+ comprehensive tests for edge cases and concurrent operations
- See [CRDT_TEST_ANALYSIS.md](./CRDT_TEST_ANALYSIS.md) for details

### Network Reliability

- Fixed WebSocket adapter bug where connections were never removed from awaiting array
- Fixed queryKeys implementation bug preventing proper timeout handling
- Added 126+ network tests covering events, subscriptions, and edge cases
- See [NETWORK_TEST_ANALYSIS.md](./NETWORK_TEST_ANALYSIS.md) for details

### Async/Await Improvements

- Converted callback-based user methods to async/await
- Fixed race conditions in anonymous user generation
- See [RACE_CONDITION_FIX.md](./RACE_CONDITION_FIX.md) for details

### Performance Optimizations

- Replaced time-based polling with event-driven initialization in storage adapters
- Tests run ~50% faster due to event-based waiting instead of arbitrary timeouts
- See [TIMEOUT_REFACTORING_SUMMARY.md](./TIMEOUT_REFACTORING_SUMMARY.md) for details

## License

ISC

## Author

Manwe <manuel.etchegaray7@gmail.com>

---

There is a lot more you can do, like subscribe for updates, built-in user credentials validation based on ECC, create federated networks, run servers on Node.js, auto-replicate data through them, etc. Make sure you read through the [documentation](https://github.com/Manwe-777/tool-db-docs)!
