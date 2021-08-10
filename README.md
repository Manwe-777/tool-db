# Tool Chain

## WIP

ToolChain is a peer-to-peer model for a decentralized database, inspired by the work made of Mark Nadal at https://gun.eco/

Base usage;
```
// Namespace of our app, make sure its unique
const chainObj = new ToolChain("namespace");

// Connect to master peers, discover new, etc
chainObj.initialize();

chainObj.anonSignIn().then();

chainObj.signUp(user, pass).then();

chainObj.signIn(user, pass).then(keys);

chainObj.anonSignIn().then();

chainObj.getPubKey().then(pubKey);

// checkRemote will force toolchain to get this value from a peer, even if the data is locally available
// userNamespaced will check for the user namespace, so it will transform the key used to "~user.key",
// This way all peers will understand this key belongs to this user and will enforce the verifications required.
chainObj.getData("key", userNamespaced?, timeout?, checkRemote?).then();

chainObj.putData("key", value, userNamespaced?).then();

// Toolchain uses localforage.WEBSQL as a default, but these methods can be overwriten to use any storage plugin you like.
chainObj.dbInit = () => {}
chainObj.dbRead = (key) => {}
chainObj.dbWrite = (key, val) => {}
```

The main motivator is to create a p2p database, but found Gun had some issues (or rather, things I disliked about it)

## Legacy code
First of all, the codebase of Gun is designed with old browsers in mind. This is both a strength and a weakness. Editing and understanding the code is complicated and painful at times, especially when attempting to view specific functions to see how they work at the lowest level.

## Cryptographic security
Gun does not enforce security, they solved this adding SEA and user modules, and the solution was excellent. Credit for solving peer to peer user/password authentication in a safe and scalable manner goes to them, and I replicated their methods here. But this was not enforced troughout the network and public spaces are impossible to secure without a central authority, defeating the purpose of the database being truly decentralized.
Here, each value in the db belongs to someone who created it, we store some data in each message so that all peers who recieve the message can validate authenticity of the data and compare with previous values if needed. Each message has a public key, signature, hash of the data with a small POW and a timestamp. Public spaces can be managed by adding a validator function to each peer, so if the message that saves data to a public space does not pass validation that peer will reject the message and stop relaying it.

## key-value store
In Gun data was restricted to objects or primitives (a restriction of the CRDT model), here data is not forced to be anything, it can be a number, a string and object or even an array. The only limitation is that it should be possible to JSON encode it.

## CRDT
CRDT forces us to use a graph or a more granular dataset for it to work properly. If you put an object as a graph then the next logical step is to have each key as a reference and then each one to have a CRDT value that needs to be stored alongside. This makes the entire structure very complicated to store and browse efficiently.
Here, just using a key-value, you can still create such structures by storing this data on each key, as part of the value, then have those keys refer to other keys and storing the metadata needed for CRDT, by removing this layer of complexity out of the basic structure of the database you can create any kind of structure you want. It might be more storage intensive to do this, though. since security will be enforced on each key.

## Does not depend need a relay server
Gun depends on setting up a relay, or using one of the provided relays that are oftenly saturated/slow. Here we are using peerjs, which has its own limitations, but it harder to saturate. You can easily deploy a master peer your own or use peerjs's default ones.
Currently the network does not discover peers based on the namespace as it should, but rather pulling the peers list from peerjs. But I am testing a new approach that completely eliminates the need for the master peer to be self-deployed, utilizing other peers as "master peers"

## Topology
Peers connections are not a mesh network, but rather a ring. Hopefully this can be coded to be configurable, but I found this to be the most scalable and failure-safe config, also maintaining as few connections as possible for each peer.
