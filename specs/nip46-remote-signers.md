# Spec: remote signers (NIP-46)

Status: **not started**. Written October 2026 against the NIP-46 text at
https://github.com/nostr-protocol/nips/blob/master/46.md; check it for
changes before implementing.

## Why

ToolDB apps can sign with a local key (`ToolDbNostrUser`) or a browser
extension (`ToolDbNip07User`). Both tie the key to one device and browser:

- mobile browsers do not run extensions, so mobile users have to copy their
  secret key into each app,
- using several devices means copying the key to each of them,
- a lost or shared device has the key on it, and the only fix is a new
  identity, losing groups and history.

NIP-46 ("Nostr Connect") keeps the key in a separate **remote signer**: a
phone app (like Amber), or a signing service ("bunker"). Apps connect to it
and send signing requests over Nostr relays, encrypted with NIP-44. The key
never reaches the app, and the user can revoke an app's access in the signer
without changing identity.

### Example

Alice uses the example chat on her laptop, her phone and a library
computer. Her key lives only in a signer app on her phone. On each device,
the chat shows a QR code; she scans it with the signer and approves, and is
signed in as the same identity everywhere. When she leaves the library, she
revokes that session in the signer. If her laptop is stolen, she revokes the
laptop's session; her identity is untouched, because the key was never on
it.

Servers and bots benefit too: a relay node can sign through a hardened
bunker, instead of keeping its secret key in an environment variable.

## Protocol summary (NIP-46)

Roles:

- **client**: the ToolDB app. It creates a disposable **client keypair**
  for the session.
- **remote signer**: the signer app or bunker, with its own
  **remote-signer pubkey**.
- **user**: the identity whose key the signer holds, the **user pubkey**.
  It can differ from the remote-signer pubkey; the client learns it with
  `get_public_key` after connecting.

Messages are kind `24133` events between the client keypair and the remote
signer pubkey, tagged with `["p", <recipient>]`, with NIP-44 encrypted
content:

```json
// request, from the client
{ "id": "<random>", "method": "<method>", "params": ["<string>", "..."] }

// response, from the remote signer
{ "id": "<request id>", "result": "<string>", "error": "<optional>" }
```

Methods ToolDB needs:

| Method           | Params                                                      | Result                |
| ---------------- | ----------------------------------------------------------- | --------------------- |
| `connect`        | `[remote-signer-pubkey, secret?, perms?, client-metadata?]` | `"ack"` or the secret |
| `get_public_key` | `[]`                                                        | user pubkey           |
| `sign_event`     | `[JSON {kind, content, tags, created_at}]`                  | JSON signed event     |
| `nip44_encrypt`  | `[third party pubkey, plaintext]`                           | ciphertext            |
| `nip44_decrypt`  | `[third party pubkey, ciphertext]`                          | plaintext             |
| `switch_relays`  | `[]`                                                        | relay list, or `null` |
| `ping`           | `[]`                                                        | `"pong"`              |
| `logout`         | `[]`                                                        | `"ack"`               |

`nip04_encrypt` and `nip04_decrypt` are not needed: ToolDB only uses NIP-44.

### Connecting

There are two ways to start a session:

1. **Signer initiated** (`bunker://`): the signer gives the user a token
   ```
   bunker://<remote-signer-pubkey>?relay=wss://...&relay=wss://...&secret=<optional>
   ```
   which the user pastes into the app. The client sends `connect` with the
   secret and its metadata (`{"name","url","image"}`, JSON, fourth param,
   with an empty string for perms if there are none). The secret is single
   use.
2. **Client initiated** (`nostrconnect://`): the app shows a token, usually
   as a QR code
   ```
   nostrconnect://<client-pubkey>?relay=wss://...&secret=<required>&perms=...&name=...&url=...&image=...
   ```
   which the user scans with the signer. The signer answers with a `connect`
   response whose `result` is the secret; the client MUST check it, and
   learns the remote-signer pubkey from the response author.

After connecting, the client calls `get_public_key`, and SHOULD call
`switch_relays` and move to the relays the signer returns.

### Auth challenges

A signer can answer any request with `result: "auth_url"` and a URL in
`error`. The client shows the URL to the user and keeps waiting for a second
response with the same request id, which arrives once the user approves (or
never).

### Ending a session

On logout the client MAY send `logout`, and MUST delete its client keypair
either way.

## Design in ToolDB

### `ToolDbNip46User`

A new user adapter in the core, next to `ToolDbNip07User`. Adapters are
classes that `ToolDb` instantiates, so connection details are bound with
factories, like `redisStore(url)`:

```ts
import { ToolDb, nip46Signer, nostrConnect } from "tool-db";

// Signer initiated: the user pastes a bunker:// token
const db = new ToolDb({
  relays,
  topic: "my-app",
  userAdapter: nip46Signer({ bunker: "bunker://...", metadata }),
});
await db.ready; // connected, user pubkey known

// Client initiated: show a QR code, wait for the signer
const pairing = nostrConnect({
  relays: ["wss://relay.nsec.app"],
  perms: [
    "sign_event:30078",
    "sign_event:1078",
    "sign_event:0",
    "nip44_encrypt",
    "nip44_decrypt",
  ],
  metadata: { name: "ToolDB Chat", url: "https://..." },
});
showQrCode(pairing.uri); // nostrconnect://...
const db = new ToolDb({
  relays,
  topic: "my-app",
  userAdapter: pairing.userAdapter,
});
await db.ready; // resolves once the user approved in the signer
```

- `perms` defaults to the kinds ToolDB signs: values `30078`, CRDT change
  sets `1078`, profiles `0`, function requests `21078`, plus
  `nip44_encrypt` and `nip44_decrypt`. A helper exports this list.
- `ready` resolves after `connect` (and secret check), `get_public_key` and
  `switch_relays`; it rejects on timeout or a wrong secret.

### Sessions

Pairing every time the app opens would be unusable, so sessions can be saved
and resumed:

```ts
const session = (db.userAccount as ToolDbNip46User).getSession();
// { clientSecretKey, remoteSignerPubkey, userPubkey, relays }
localStorage.setItem("nip46-session", JSON.stringify(session));

// Later
userAdapter: nip46Signer({ session: JSON.parse(saved) });
```

- The session holds the client secret key: it can not sign as the user, but
  it can send requests the signer may auto approve, so apps should store it
  like a credential (encrypted with a password via NIP-49 where it makes
  sense).
- On resume, `ready` sends `ping` to check the session is still valid, and
  rejects if the signer revoked it.
- `logout()` sends `logout` and forgets the session.

### Transport

- A dedicated `RelayPool` for the signer relays, separate from the data
  relays (they are often different).
- One subscription:
  `{ kinds: [24133], "#p": [clientPubkey], authors: [remoteSignerPubkey] }`
  (without `authors` while waiting for a `nostrconnect://` response).
- Pending requests by id, each with a timeout (default 60 s, since a person
  may have to approve), resolved by the first valid response.
- `auth_url` responses call an `onAuthUrl(url)` option (the app opens it)
  and keep the request pending with a fresh timeout.

### Security

- Responses must come from the remote-signer pubkey (filtered and checked
  again), decrypt with the client key, and match a pending request id;
  anything else is ignored.
- `nostrconnect://` responses must return the exact secret.
- Events returned by `sign_event` get the same checks as with NIP-07: valid
  signature, signed by the user pubkey, and exactly the requested kind,
  content, tags and timestamp.
- If `get_public_key` ever returns a different user pubkey during a session,
  the adapter fails instead of switching identity.
- `anonUser`, `setUser`, `getAccountFromPrivate`, `encryptAccount` and
  `decryptAccount` reject, as the key belongs to the signer.

### Performance

Every signature is a round trip through a relay, plus a manual approval
unless the user allowed it for this app; expect hundreds of milliseconds per
write at best. This is inherent to NIP-46:

- request the right `perms` at connect, so signers can auto approve,
- show pending signatures in the UI (`putData` stays pending until signed),
- ToolDB already signs one event per `putCrdt`, however many changes it has.

## Testing

- **Fake bunker** in the tests: a remote signer built on `RelayPool` and a
  local key, against `NostrRelay`, supporting both connection flows, auth
  challenges, revocation and wrong secrets.
- **Interoperability**: nostr-tools' `BunkerSigner` (the client side)
  against the fake bunker, so the bunker speaks real NIP-46, and our client
  against it.
- **Attacks**: responses from other pubkeys, wrong secrets, replayed or
  unknown response ids, signed events that differ from the request, a user
  pubkey that changes.
- **Manual**: a real signer (Amber on Android, or nsec.app) with the example
  chat app.

## Example app and docs

- Login: "Connect a signer app", showing the `nostrconnect://` QR code (a
  small QR library in the example only), and "Paste a bunker:// link".
- Save the session, and resume it on reload.
- Docs: a NIP-46 section in Identity, and the pairing flow.

## Open questions

- Which signer relays to suggest by default in the example (signers usually
  publish their own, and `switch_relays` moves to them).
- Whether to also discover signers through NIP-89 (`kind 31990` with a `k`
  tag of `24133`) to pre-build `nostrconnect://` links for known signers.
- Whether relay nodes should be able to act as bunkers for their operators
  (out of scope here).
