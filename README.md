# Tool Db

## WIP

ToolDb is a peer-to-peer model for a decentralized database, built on top of Gun, by Mark Nadal: https://gun.eco/

Base usage;

Initializing;
```
const client = new ToolChainClient([peers]);
```
Connect to the selected gun db peers. These can be normal gun relays or tool-db for a tighter protocol enforcement.

You can sign as a guest or create a user;
```
client.anonSignIn().then();
```
```
client.signUp(user, pass).then();
```
```
client.signIn(user, pass).then(keys);
```

To retrieve your public key;
```
client.getPubKey().then(pubKey);
```

Simple put and get:
```
client.getData("key", userNamespaced?, timeout?).then();
```
```
client.putData("key", value, userNamespaced?).then();
```
UserNamespaced will check for the user namespace, so it will transform the key used to "~user.key", This way all peers reading this entry will understand the key belongs to this user and will enforce the verifications required to namespaced entries.
