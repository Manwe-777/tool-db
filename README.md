<div align="center">

# 🛠️ Tool Db

### A Peer-to-Peer Decentralized Database

[![CI](https://github.com/Manwe-777/tool-db/actions/workflows/main.yml/badge.svg)](https://github.com/Manwe-777/tool-db/actions/workflows/main.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)

**[📖 Documentation](https://manwe-777.github.io/tool-db-docs/)** · **[🚀 Live Demo](https://manwe-777.github.io/tool-db-chat-example/)** · **[💬 Report Bug](https://github.com/Manwe-777/tool-db/issues)**

---

</div>

## ✨ What is Tool Db?

Tool Db is a peer-to-peer database inspired by GunDB, combining powerful concepts into one cohesive solution:

<table>
<tr>
<td width="50%">

🔐 **Cryptographically Secure**
<br/>Public/private key authentication

🌐 **Fully Decentralized**
<br/>No central point of failure

⚡ **Real-time Updates**
<br/>Subscribe to live data changes

</td>
<td width="50%">

📴 **Offline First**
<br/>Works without connectivity

📦 **Key-Value Storage**
<br/>Document-based data model

🔄 **Built-in CRDTs**
<br/>Conflict-free data types

</td>
</tr>
</table>

<div align="center">

### 🎮 Try it now!

**[Launch the Live Chat Demo →](https://manwe-777.github.io/tool-db-chat-example/)**

_Experience real-time P2P messaging in your browser_

</div>

---

## 🏗️ Architecture

We embrace **federated servers** — a P2P mesh network where servers join a swarm and manage connections and data sharing, while clients connect to push updates.

> **This is not a requirement!** Any peer can connect to any other peer through WebSockets, and WebRTC connections between web peers are fully supported.

Since anyone can join a federated server swarm, we use **cryptographic validation** (public/private key authentication and signature verification) to ensure all messages come from their real authors. All information is stored on each message — no centralized database needed!

📦 Check out [chain-swarm](https://github.com/Manwe-777/chain-swarm) for a federated server implementation.
<br/>
🔍 We use [discovery-channel](https://www.npmjs.com/package/discovery-channel) for peer discovery, but any DHT/networking solution works!

---

## 📦 Packages

Tool Db is organized as a monorepo:

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

---

## 🔄 CRDT Support

Built-in **Conflict-free Replicated Data Types** for automatic conflict resolution:

| Type            | Operations   | Use Case                                          |
| --------------- | ------------ | ------------------------------------------------- |
| **MapCRDT**     | `SET`, `DEL` | Key-value stores with per-key conflict resolution |
| **ListCRDT**    | `INS`, `DEL` | Ordered lists with concurrent insert support      |
| **CounterCRDT** | `ADD`, `SUB` | Distributed counters that merge correctly         |

CRDTs ensure all peers **eventually converge** to the same state, regardless of update order.

---

## 🚀 Quick Start

### Installation

```bash
npm install tool-db
```

Or use via CDN:

```html
<script src="https://unpkg.com/tool-db/bundle.js"></script>
```

```javascript
const { ToolDb, sha256 } = tooldb;
```

### Basic Usage

```javascript
import { ToolDb, ToolDbWebrtc } from "tool-db";

// Create a WebRTC peers network
const db = new ToolDb({
  networkAdapter: ToolDbWebrtc,
  debug: true,
});

// Put and get data
await db.putData("foo-key", "bar");
const value = await db.getData("foo-key");

// Subscribe to real-time updates
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
list.INS(0, "item0");
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

---

## 🧪 Development

### Requirements

- Node.js >= 16.0.0

### Running the Demo

```bash
npm run demo           # Run the demo
npm run demo:fresh     # Run demo with fresh database
```

### Testing

```bash
npm test                           # Run all tests
npx jest __tests__/filename.ts     # Run a single test file
npm run test:watch                 # Run tests in watch mode
```

---

## 🗺️ Roadmap

- [ ] Built-in data encryption with ECC methods and shared keys
- [ ] Noise/encryption for connections based on peer identity
- [ ] Property-based testing for CRDTs using `fast-check`
- [ ] Performance benchmarks with larger datasets
- [ ] Metrics for tracking CRDT change arrays growth

---

## 📝 Recent Improvements

<details>
<summary><strong>🔧 CRDT Bug Fixes & Test Coverage</strong></summary>

- Fixed 5 critical bugs in CRDT implementations (MapCRDT, ListCRDT, CounterCRDT)
- Added 48+ comprehensive tests for edge cases and concurrent operations
- See [CRDT_TEST_ANALYSIS.md](./CRDT_TEST_ANALYSIS.md) for details

</details>

<details>
<summary><strong>🌐 Network Reliability</strong></summary>

- Fixed WebSocket adapter bug where connections were never removed from awaiting array
- Fixed queryKeys implementation bug preventing proper timeout handling
- Added 126+ network tests covering events, subscriptions, and edge cases
- See [NETWORK_TEST_ANALYSIS.md](./NETWORK_TEST_ANALYSIS.md) for details

</details>

<details>
<summary><strong>⚡ Async/Await Improvements</strong></summary>

- Converted callback-based user methods to async/await
- Fixed race conditions in anonymous user generation
- See [RACE_CONDITION_FIX.md](./RACE_CONDITION_FIX.md) for details

</details>

<details>
<summary><strong>🚀 Performance Optimizations</strong></summary>

- Replaced time-based polling with event-driven initialization in storage adapters
- Tests run ~50% faster due to event-based waiting instead of arbitrary timeouts
- See [TIMEOUT_REFACTORING_SUMMARY.md](./TIMEOUT_REFACTORING_SUMMARY.md) for details

</details>

---

## 📄 License

ISC © [Manwe](mailto:manuel.etchegaray7@gmail.com)

---

<div align="center">

**[📖 Read the full documentation →](https://github.com/Manwe-777/tool-db-docs)**

_Federated networks • Node.js servers • Auto-replication • And much more!_

</div>
