<div align="center">

# 🛠️ Tool Db

### A Peer-to-Peer Decentralized Database

[![CI](https://github.com/Manwe-777/tool-db/actions/workflows/main.yml/badge.svg)](https://github.com/Manwe-777/tool-db/actions/workflows/main.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)

**[📖 Documentation](https://manwe-777.github.io/tool-db-docs/)** · **[🚀 Live Demo](https://manwe-777.github.io/tool-db-chat-example/)** · **[💬 Report Bug](https://github.com/Manwe-777/tool-db/issues)**

---

</div>

## 💡 Philosophy

ToolDb is designed as **open, permissionless infrastructure**.

It enables peer-to-peer data exchange without centralized custody, accounts, or trust anchors. Identity is cryptographic, data ownership is local-first, and connectivity emerges from the network itself.

This project is intentionally permissive. Commercial use, private deployments, and derivative systems are welcome. ontributions, attribution, and community participation are very appreciated but not required.

**ToolDb favors adoption, interoperability, and resilience**

---

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

## 🚀 Quick Start

```bash
npm install tool-db
```

```javascript
import { ToolDb, ToolDbWebrtc } from "tool-db";

const db = new ToolDb({
  networkAdapter: ToolDbWebrtc,
});

// Put and get data
await db.putData("foo-key", "bar");
const value = await db.getData("foo-key");

// Subscribe to real-time updates
db.subscribeData("foo-key", (data) => {
  console.log("Data updated:", data);
});
```

📖 **[Read the full documentation →](https://manwe-777.github.io/tool-db-docs/)**

---

## 📦 Packages

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

## 🧪 Development

```bash
npm run demo           # Run the demo
npm test               # Run all tests
```

---

## 📄 License

Apache-2.0 © [Manuel Etchegaray](mailto:manuel.etchegaray7@gmail.com)

---

<div align="center">

**[📖 Read the full documentation →](https://manwe-777.github.io/tool-db-docs/)**

_CRDTs • User Authentication • Namespaces • Network Adapters • And much more!_

</div>
