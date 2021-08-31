# Tool Chain

## WIP

ToolChain is a peer-to-peer model for a decentralized database, inspired by the work made of Mark Nadal at https://gun.eco/

Base usage;
```
// Namespace of our app, make sure its unique
const client = new ToolChainClient(host, debug?);

client.anonSignIn().then();

client.signUp(user, pass).then();

client.signIn(user, pass).then(keys);

client.anonSignIn().then();

client.getPubKey().then(pubKey);

// userNamespaced will check for the user namespace, so it will transform the key used to "~user.key",
// This way all peers reading this entry will understand the key belongs to this user and will enforce
// the verifications required to namespaced entries.
client.getData("key", userNamespaced?, timeout?).then();

client.putData("key", value, userNamespaced?).then();

// Initialize service, used for validation and storage.
// Preferrably used on verification servers or alike, but can be used in p2p hybrid structures as well.
const service = new ToolChainService(debug?);

// Change these methods to use the storage engine you want.
service.dbInit = () => {}
service.dbRead = (key) => {}
service.dbWrite = (key, val) => {}

// Handles a message received, does all verification and sends it to dbWrite if sucessful.
service.messageWrapper(value).then()

// Add custom verification for all messages at the given key.
// This can be used in public spaces to enforce certain structures or only specific changes from being made.
service.addVerification(key, cb(prevous, incoming) => boolean)
```

The main motivator is to create an efficient p2p database with the lesser cost of deployment as possible, that can easily grow or be seeded by its communities. I tried some of them (OrbitDb, IPFS), and eventually landed on Gun. I really really liked the concepts behind it but found it had some issues (or rather, things I really disliked about it)

## Legacy code
First of all, the codebase of Gun is designed with old browsers in mind. This is both a strength and a weakness. Editing and understanding the code is complicated and painful at times, especially when attempting to view specific functions to see how they work at the lowest level.

## Cryptographic security
Gun does not enforce security, they solved this adding SEA and User modules, and the solution was nice. Credit for solving peer to peer user/password authentication in a safe and scalable manner goes to them, and I replicated their methods here. But this was not enforced troughout the network and public spaces are impossible to secure without a central authority, defeating the purpose of the database being truly decentralized.
Here, each value in the db belongs to someone who created it, we store some data in each message so that all peers who recieve the message can validate authenticity of the data and compare with previous values if needed. Each message has a public key, signature, hash of the data with a small POW and a timestamp. Public spaces can be managed by adding a validator function to each peer, so if the message that saves data to a public space does not pass validation that peer will reject the message and stop relaying it.

## key-value store
In Gun data was restricted to objects or primitives (a restriction of the CRDT model), here data is not forced to have any limits, it can be a number, a string and object or even an array. The only limitation is that it should be possible to JSON encode it, but even that can be fixed if you use a different storage on the toolChainService.

## CRDT
CRDT forces Gun to use a graph or a more granular dataset for it to work properly. If you put an object as a graph then the next logical step is to have each key as a reference and then each one to have a CRDT value that needs to be stored alongside. This makes the entire structure very complicated to store and browse efficiently, resulting in TONS of queries to obtain just one object.
Here, just using a key-value, you can still create such structures by storing this data on each key, as part of the value, then have those keys refer to other keys and storing the metadata needed for CRDT, by removing this layer of complexity out of the basic structure of the database you can create any kind of structure you want. Altrough its not perfect, as it might be more storage intensive to do this for small values, since security will be enforced on each key/value pair, and all that implies (keys, signatures, pow, timespamp).

## Does not depend on a relay server
Gun depends on setting up a relay, or using one of the provided relays that are oftenly very saturated and slow. Here, initially, I was using peerjs, which had its own limitations, but it was harder to saturate. You could easily deploy a master peer your own or use peerjs's defult ones. This proved to be a very hard schema to maintain, messages going from one peer to another, deduplication, DHT-like connections.. I ended up removing this whole logic from the project entirely.
Currently the project is structured as a client-server kind of thing (client/service), but the "servers" can be other clients if you are want to set up the topology yourself. I prefer the multi-server approach, where clients connect to these servers that anyone can easily deploy on any machine, and all understand the same protocol for replicating their databases, that is exactly what I am triying to do here; https://github.com/Manuel-777/chain-swarm
