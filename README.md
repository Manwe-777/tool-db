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
UserNamespaced will check for the user namespace, so it will transform the key used to ":user.key", This way all peers reading this entry will understand the key belongs to this user and will enforce the verifications required to namespaced entries.

To listen for a value you can set up a listener on a key. Beware the listener will check for all keys *starting with* the supplied key, so for example, if you use "value." as your listener if will execute on every key that starts with "value.". This is useful for checking against a public key or use namespace.
```
const listenerId = client.addKeyListener("value", console.log);
client.removeKeyListener(listenerId);
```

Similarly, for using a custom verification on a key (or subset of keys) you can create a new function that returns a Promise;

```
const validateDn = (msg) => {
  return new Promise((resolve) => {
    console.log("Custom verif", msg);
    if (typeof msg.value === "string") resolve(true);
    else resolve(false);
  });
}

const validatorId = client.addCustomVerification("value", validateFn);

// You will not usually need to remove validators, but we provide a function anyway.
client.removeCustomVerification(validatorId);
```

Keep in mind validators should run on all client nodes, and even trough the nodes not running your validator will be able to store and relay invalid messages its up to each client and peer to check these messages on arrival. ToolDb does this automatically when using the custom validation, but its important to make sure every peer runs the same code to avoid issues.