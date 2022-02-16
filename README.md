# Tool Db

ToolDb is a peer-to-peer model for a decentralized database, inspired by Gun (Mark Nadal): https://gun.eco/


It is the mix of a lot of cool concepts into one;
- Cryptographically secure.
- Offline first.
- Fully decentralized.
- Capable of providing realtime updates.
- Key-value/document storage.
- Works in the Browser and Nodejs seamlessly.

We push towards of the concept of federated servers, where we set up a p2p mesh network between any servers who want to join the swarm, and have those servers manage the connection and data sharing between them, while allowing client peers to connect to them to push updates to the database.
This setup IS NOT a requirement! It is just what I think is the best and most reliable way of creating a p2p network for dApps using both desktop and web compatible technologies. Any peer has the capability of connecting to any other peer trough websockets, and modifiying the code to allow webRtc connections between web peers is absolutely possible.

Since anyone can join a federated server swarm to help growing the network we use cryptography (basic public and private key authenthication and signature validation) to ensure all messages are coming from the real authors of the data that they intend to modify; this way by joining a swarm all peers in it can help validate without even having full data; even a new server peer can help, because all information is stored on each message and we dont rely on any centralized database to fetch users data.

Please check the [chain-swarm](https://github.com/Manwe-777/chain-swarm) repository to see how a federated server swarm would look like, Tool Db only handles the connection and messaging between peers, but it does not have any logic for peer discovery.
We do that using [discovery-channel](https://www.npmjs.com/package/discovery-channel), but you can use any DHT/networking solution you want! even WebRTC between browsers works using the `toolDbWebrtc` transport.

# Future work

While the database is currently functioning as expected, there are many things that could be added or improved to make it even better!

- Use a common web3 format for users identity, or a more standarized key pair.
- Allow messages encryption, add methods for Elliptic Curves, shared keys, etc.
- Allow adding Noise/encryption to connections (probably based on the ECC?)

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
Connect to the selected toolDb peers;
```
const client = new ToolDb(options);
```

These are the options you can pass to the constructor:

```
{
  // Database name to use
  db: string;

  // Show debug console logs
  debug: boolean;

  // Array of peers to connect to, each one in the form of { host: "127.0.0.1", port: 9000 }
  peers: { host: "127.0.0.1", port: 9000 }[];

  // Max number of tries when a connection fails
  maxRetries: number;

  // How long to wait (max) for a debounced key listener recv
  triggerDebouce: number;

  // How long to wait between retries
  wait: number;

  // If you want to force a Proof of Work on all messages, set how much (zero is no POW)
  pow: number;

  // Weter we are a server or not
  server: boolean;

  // Our hostname (server only)
  host: string

  // Port to listen incoming connections (server only)
  port: number;

  // A server instance like Express (server only)
  httpServer: HTTPServer | HTTPSServer | undefined;

  // Our storage namespace (default is "tooldb")
  storageName: string;

  // A custom network adapter class
  networkAdapter: typeof ToolDbNetworkAdapter;

  // A custom storage adapter function
  storageAdapter: ToolDbStorageAdapter;

  // Our client ID (defaults to a random ID)
  id: string;

  // The namespace/topic of our app
  topic: string;
  
  // Public and private (ECDSA) keys of our client. In the default network adapter these are used to sign
  // our messages as we join and leave the network, public key should match the client ID (as a base64 exported string).
  publicKey: CryptoKey | undefined;
  privateKey: CryptoKey | undefined;
}
```
Notice you can use your own network and storage modules if you would like to implement custom solutions for peers discovery, connections, storage, etc, the default adapters will work both on nodejs and the browser.


You can create a user, sign in or create a random set of keys for anonymous usage;
```
client.signUp(user, pass).then();
client.signIn(user, pass).then(keys);
client.anonSignIn().then();
```

To retrieve your public key; (only if logged in)
```
client.getPubKey().then(pubKey);
// or
client.user?.pubKey
```

You can check if you are correctly logged in by checking if the user field exists or not;
```
if (client.user) {
  // Ok!
}
```

## Putting and getting data

Core methods are very straighforward:
```
client.getData("key", userNamespaced?, timeout?).then();
client.putData("key", value, userNamespaced?).then();
client.putCrdt("key", documentChanges, userNamespaced?).then();
```
UserNamespaced will check for the user namespace, so it will transform the key used to ":user.key", This way all peers reading this entry will understand the key belongs to this user and will enforce the verifications required to namespaced entries.

You can use `client.getUserNamespacedKey(key)` to convert any key to a private namespaced key of the current logged in user.

Note the third function (putCrdt); For p2p networks some times you want to have conflict resolution on certain documents, to do this we use [automerge](https://github.com/automerge/automerge). Please take a look at it to know how it works in detail! The only thing you need to know on Tool Db is that you have to send an `Automerge.BinaryChange[]` (you get it using `Automerge.change()`). The recieving peer will process the changes, compare it to its stored documents and generate a new document with JSON CRDT applied to it, then relay the final document back to you.

To listen for a value changes you can set up a listener on a key. Beware the listener will check for all keys *starting with* the supplied key, so for example, if you use "value." as your listener if will execute on every key that starts with "value.". This is useful for checking against a public key or namespace.
```
const listenerId = client.addKeyListener("value", console.log);
client.removeKeyListener(listenerId);
```

Similarly, for using a custom verification on a key (or subset of keys) you can create a new function that returns a Promise boolean;
```
const validateFn = (msg) => {
  return new Promise((resolve) => {
    console.log("Custom verification: ", msg);
    if (typeof msg.value === "string") resolve(true);
    else resolve(false);
  });
}

const validatorId = client.addCustomVerification("value", validateFn);

client.removeCustomVerification(validatorId);
```

Keep in mind custom validators should run on all client and server nodes, and even though the nodes not running your validator will be able to store and relay invalid messages its up to each peer to check these messages on arrival. ToolDb does this automatically when using the custom validation, but its important to make sure every peer runs the same code to avoid tampered messages flowing in the network.

## Query

To make queries or just create indexes you can make a query, it simply asks all server or peers connected a list of all keys starting with a prefix. You can later use these keys to get the data itself.

```
client.queryKeys(keyPrefix, userNamespaced?, timeout?).then()
```

Just like previous methods you can configure the namespace and timeout and returns a promise, but in this case the value is always an array with the found keys.
Using for example ":" + publicKey as our prefix would return all keys stored for that specific user namespace; you can also create keys for very specific use cases like "post-1" and query again "post-" to get a list of all available posts.

Keep in mind this can be an intensive thing to do if your indexes are too big, and not recommended to be used very frequently.


## Listen for changes

Some times you want to subscribe to the changes made on a certain key, this is possible via subscribeData;
```
client.subscribeData("key", userNamespaced?);
```

This will relay back to you all Put and CrdtPut messages on that key.

When subscribing to a CRDT document you will need to load the data like so;
```
window.toolDb.addKeyListener("documentKey", handleDocumentKeyCrdt);
function handleDocumentKeyCrdt(msg) {
  if (msg && msg.type === "crdt") {
    // Load the document from the message (msg.doc)
    const incomingDocument = Automerge.load(
      base64ToBinaryDocument(msg.doc)
    );

    if (globalData.myCrdtDocument) {
      // Merge the local doc vs the incoming one and store it somewhere locally
      globalData.myCrdtDocument = Automerge.merge(globalData.myCrdtDocument, incomingDocument);
    } else {
      // New document! Just store it
      globalData.myCrdtDocument = incomingDocument;
    }
  }
}
```

## Events

If you need to check when you are connected to a server peer or not you can use the following method replacements;
```
client.onConnect = () => { /* Your code here */ };
client.onDisconnect = () => { /* Your code here */ };
```
