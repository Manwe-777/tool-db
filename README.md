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
```
