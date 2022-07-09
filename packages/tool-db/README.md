# Tool Db

ToolDb is a peer-to-peer model for a decentralized database, inspired by GundB


It is the mix of a lot of cool concepts into one;
- Cryptographically secure.
- Offline first.
- Fully decentralized.
- Capable of providing realtime updates.
- Key-value/document storage.
- Works in the Browser and Nodejs seamlessly.

For a more detailed documentation head here;

[https://github.com/Manwe-777/tool-db-docs](https://github.com/Manwe-777/tool-db-docs)

_(No live version just yet!, until the protocol is more finalized)_

We push towards of the concept of federated servers, where we set up a p2p mesh network between any servers who want to join the swarm, and have those servers manage the connection and data sharing between them, while allowing client peers to connect to them to push updates to the database.
This setup IS NOT a requirement! It is just what I think is the best and most reliable way of creating a p2p network for dApps using both desktop and web compatible technologies. Any peer has the capability of connecting to any other peer trough websockets, and modifiying the code to allow webRtc connections between web peers is absolutely possible.

Since anyone can join a federated server swarm to help growing the network we use cryptography (basic public and private key authenthication and signature validation) to ensure all messages are coming from the real authors of the data that they intend to modify; this way by joining a swarm all peers in it can help validate without even having full data; even a new server peer can help, because all information is stored on each message and we dont rely on any centralized database to fetch users data.

Please check the [chain-swarm](https://github.com/Manwe-777/chain-swarm) repository to see how a federated server swarm would look like, Tool Db only handles the connection and messaging between peers, but it does not have any logic for peer discovery.
We do that using [discovery-channel](https://www.npmjs.com/package/discovery-channel), but you can use any DHT/networking solution you want! even WebRTC between browsers works using the `toolDbWebrtc` transport.

# Future work

While the database is currently functioning as expected, there are many things that could be added or improved to make it even better!

- Allow data encryption (proably built in), add methods for ECC encryption, shared keys, etc.
- Allow adding Noise/encryption to connections (probably based on the peer identity, requires initial keys exchange on connection)

# Install

You can install ToolDb via npm or yarn;

```
npm install tool-db
```

or use it via script in your html;

```
<script src="https://unpkg.com/tool-db/bundle.js"></script>
```

That will include all of ToolDb exports in `tooldb`, then you can use it like;

```
const { ToolDb, sha256 } = tooldb;
```

## Base usage

Creating a webrtc peers network is as easy as;

```
import { ToolDb } from "tool-db";
import ToolDbWebrtc from "@tool-db/webrtc-network";
import ToolDbECDSA from "@tool-db/ecdsa-user";
import ToolDbIndexedDb from "@tool-db/indexeddb-store";

const db = new ToolDb({
  debug: true,
  networkAdapter: ToolDbWebrtc,
  storageAdapter: ToolDbIndexedDb,
  userAdapter: ToolDbECDSA,
});
```

Notice we imported the required adapter modules; All three adapters are required and they are not included in this module by default; You should import each of them separately.


From there you can put and get data using the api;

```
db.putData("foo-key", "var").then(console.log);
```

There is a lot more you can do, like subscribe for updates, built-in users credentials validation based on ECC, create federated networks, run servers on Nodejs, auto-replicate data trough them, etc. Make sure more you read trough the [documentation](https://github.com/Manwe-777/tool-db-docs)!