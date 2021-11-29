# Tool Db

## WIP

ToolDb is a peer-to-peer model for a decentralized database, inspired by Gun (Mark Nadal): https://gun.eco/

Unlike Gun we dont rely on CRDTs as a requirement, but rather make them optional using [automerge](https://github.com/automerge/automerge). In my experience, crdts are great, but having to rely on them for every bit of data was making everything much more complex and unreliable.

We push towards of the concept of federated servers, where we set up a p2p mesh network between any servers who want to join the swarm, and have those servers manage the connection and data sharing between them, while allowing client peers to connect to them to push updates to the database.
This setup IS NOT a requirement! It is just what I think is the best and most reliable way of creating a p2p network for dApps using both desktop and web compatible technologies. Any peer has the capability of connecting to any other peer trough websockets, and modifiying the code to allow webRtc connections between web peers is absolutely possible.

Since anyone can join a federated server swarm to help growing the network we use cryptography (basic public and private key authenthication and signature validation) to ensure all messages are coming from the real authors of the data that they intend to modify; this way by joining a swarm all peers in it can help validate without even having full data; even a new server peer can help, because all information is stored on each message and we dont rely on any centralized database to fetch users data.

Please check the [chain-swarm](https://github.com/Manuel-777/chain-swarm) repository to see how a federated server swarm would look like, Tool Db only handles the connection and messaging between peers, but it does not have any logic for peer discovery.
We do that using [discovery-channel](https://www.npmjs.com/package/discovery-channel), but you can use any DHT solution you want! Theoretically, even WebRTC between browsers would work.

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
  // List of peers to connect to (full URL with port like "http://127.0.0.1:9000")
  peers: string[];
  // Max number of tries when a connection fails
  maxRetries: number;
  // How long to wait between retries
  wait: number;
  // If you want to force a Proof of Work on all messages, set how much (zero is no POW)
  pow: number;
  // Weter we are a server or not
  server: boolean;
  // Port to listen incoming connections (server only)
  port: number;
}
```

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
