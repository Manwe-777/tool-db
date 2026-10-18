# Nostr-first ToolDB

Branch: `nostr-first`

## Goal

Rebuild ToolDB as a database layer on top of Nostr. Nostr provides the
network (relays), the identity (keys and signers) and the signed data format
(events). ToolDB keeps what Nostr does not have: keys and namespaces, CRDTs,
custom verificators, local storage, subscriptions with a database API, and
server functions.

This replaces ToolDB's own peer protocol (ping/pong, message relaying,
WebRTC, hybrid adapters) and its own identity adapters (web3, ecdsa). Apps get
an existing network of relays, identities that work across apps, and data
that other Nostr tools can read.

## Principles

1. **Same code on Node and browsers.** Node servers and browser clients speak
   the same protocol (Nostr over WebSocket) and use the same libraries. Only
   two things differ by environment: the WebSocket implementation (`ws` on
   Node, native in browsers) and the storage adapter (LevelDB, IndexedDB,
   Redis, memory).
2. **Pure JS dependencies.** Cryptography uses `@noble/curves`,
   `@noble/hashes` (and `@noble/ciphers` when needed): audited, no native
   code, identical on every platform. No Node built ins (`crypto`, `buffer`)
   in the core.
3. **Relays are untrusted.** Public relays do not know ToolDB rules. Every
   client verifies everything it receives: signatures, namespaces, CRDT
   authors and custom verificators. ToolDB relay nodes also verify, to keep
   their storage clean, but clients never rely on that.
4. **Local first.** Data is written to local storage and relays; reads use
   local data and merge what relays return.

## Architecture

```
 browser / node client            relays                   ToolDB relay node
 ┌──────────────────┐        ┌─────────────────┐        ┌──────────────────────┐
 │ ToolDB API       │  WS    │ public Nostr    │        │ NIP-01 relay         │
 │ verification     │◄──────►│ relays          │        │ + ToolDB validation  │
 │ local storage    │        └─────────────────┘        │ + storage adapter    │
 │ signer (keys)    │◄─────────────────────────────────►│ + server functions   │
 └──────────────────┘                  WS               └──────────────────────┘
```

- **Clients** (browser or Node) connect to a set of relays, publish events to
  all of them, and read from all of them.
- **Relays** can be any public Nostr relay, or a ToolDB relay node.
- **A ToolDB server is a Nostr relay** (NIP-01) running on Node, with ToolDB
  validation, a storage adapter for durability, and server functions. It is
  just another relay to clients, so apps can mix public relays (reach,
  redundancy) with their own nodes (durability, functions, policies).

The relay pool is part of the core (`RelayPool`, used by `ToolDb` through
the `relays` option); there are no network adapters anymore. The ToolDB relay
node is `ToolDbRelay` in `@tool-db/nostr-relay`.

## Identity

- **Every identity is a Nostr key** (secp256k1, BIP-340 Schnorr). The ToolDB
  address is the hex public key.
- **Signers** sign events, ToolDB never needs the private key directly:
  - local key: generated or imported (`nsec`), for servers, tests and apps
    that manage keys themselves,
  - NIP-07: browser extensions (`window.nostr`), the user's existing identity
    (`ToolDbNip07User`); the events they return are checked to be exactly
    what was asked to sign,
  - NIP-46: remote signers ("bunkers"), for multi device use. This is the
    supported way of delegating signing in Nostr; NIP-26 delegation is marked
    as unrecommended by the Nostr protocol.
- **Verification is fixed**: every event is checked with Schnorr, so it no
  longer depends on which signer the author used.
- **Usernames**: the `==username` frozen namespace (first come, timestamp
  based, hijackable by backdating) is removed. Names come from Nostr
  profiles (kind 0, `putProfile` and `getProfile`) and NIP-05 identifiers
  (`name@domain`, `verifyProfileName`), which are backed by DNS instead of
  timestamps.
- **Passwords**: encrypted keystores are no longer published to the network
  (anyone could brute force them offline). A local key can be stored
  encrypted with a password using NIP-49 (scrypt + XChaCha20-Poly1305),
  locally only. Signing in from another device uses NIP-07, NIP-46 or an
  exported key.

## Data model

All ToolDB keys live under a topic (the app namespace, `options.topic`), so
apps sharing relays do not collide.

### Values: kind 30078 (NIP-78, application data)

Kind 30078 is an addressable event: relays keep the latest event per author,
kind and `d` tag, which is exactly ToolDB's "latest value per key" model.

```json
{
  "kind": 30078,
  "tags": [
    ["d", "<topic>:<key>"],
    ["t", "<topic>"]
  ],
  "content": "<JSON encoded value>"
}
```

- **User namespace** (`:pubkey.key`): the value of a key written by its
  owner. Reads filter by author, so nobody else can write it.
- **Shared keys** (no namespace): any author can write the same `d` tag.
  Reads query all authors and keep the newest, so anyone can overwrite a
  shared key. Apps restrict who can write with custom verificators, like
  `onlyAuthors([...])` for admin keys. Rules based on who wrote first can not
  be enforced on an open network (timestamps are chosen by the signer, and
  peers see data in different orders); rules based on who is writing can.
- **Conflicts**: newest `created_at` wins, ties go to the lowest event id,
  the same rule NIP-01 uses for replaceable events.
- **Timestamps** are in seconds (`created_at`), not milliseconds. Events more
  than 30 seconds in the future are rejected, as today.

### CRDTs: signed change sets as regular events

The signed change sets added on `main` map directly to events: the change
set signature becomes the event signature, and its author the event pubkey.

```json
{
  "kind": "<TOOLDB_CRDT_KIND>",
  "tags": [
    ["k", "<topic>:<key>"],
    ["c", "MAP:2"],
    ["t", "<topic>"]
  ],
  "content": "<JSON encoded changes>"
}
```

- Regular events are stored by relays as is (append only), one per set.
- Verification is the same as on `main`: every change must be authored by
  the event pubkey, user namespaces only accept their owner, and custom
  verificators run on each set.
- `getCrdt` asks for all events with the `k` tag and merges the ones that
  verify.

### Reads, queries and subscriptions

- **get**: `REQ` with kind, `#d` (and `authors` for user namespaces) to all
  relays, wait for `EOSE` from every relay or a timeout, verify, keep the
  winner, store it locally.
- **subscribe**: the same `REQ` kept open, so updates arrive live.
- **queryKeys(prefix)**: Nostr filters match tags exactly, so prefix queries
  ask for all keys of the topic (`#t`, optionally by author) and filter by
  prefix locally. Fine for small topics; large ones need path tags (one tag
  per key segment) later.

### Server functions

Requests and responses are ephemeral events (kinds 21078 and 21079 for now,
never stored). The request is signed by the caller and tagged with the
server pubkey (`p`) and the function name (`f`); the content is the JSON
arguments. The relay node runs the function and answers with an event signed
by its own key, referencing the request (`e`) and the caller (`p`), with
`{ code, return }` as content.

- Clients only accept responses signed by the servers in their
  `functionServers` option (or the `server` given to `doFunction`).
- Functions get the arguments and the caller's public key, so they can
  check permissions.
- Requests reach a node directly (clients connected to it), or through the
  relays in its `listenRelays` option, like public relays: they only forward
  the events, and since requests name their server, other nodes ignore them.
- A node runs each request once (it can arrive through several relays), and
  ignores requests older than 60 seconds, so requests seen on public relays
  can not be replayed later.
- Payloads are not encrypted yet; NIP-44 can be added.

### Encryption

NIP-44 (secp256k1 ECDH, ChaCha20 and HMAC), checked against the official
test vectors. Signers encrypt and decrypt for other public keys
(`nip44Encrypt`, `nip44Decrypt`), the same way browser extensions do.

Group keys replace the P-256 utilities of `ecdsa-user`: a group key is a
Nostr secret key, wrapped for each member with NIP-44, and group messages are
encrypted with the group key itself (`createGroupKey`, `wrapGroupKey`,
`unwrapGroupKey`, `encryptForGroup`, `decryptForGroup`).

### Deletion

NIP-09 deletion requests (kind 5). Relays may ignore them, so deletion is
best effort, as on any public network.

## Network

- `options.relays`: list of relay URLs.
- Publish to every connected relay; a write succeeds when at least one relay
  accepts it (`OK`), and is always stored locally.
- Read from every relay and merge, so one slow or malicious relay can not
  hide or forge data (it can only omit it).
- Reconnect with backoff, restoring open subscriptions.
- Respect relay limits (NIP-11: max message size, rate limits).

## Storage

The storage adapter interface is `put`, `get`, `query` (keys by prefix) and
`delete`. Adapters only need a storage name and a logger, so both clients and
relay nodes use them:

- Clients store verified events by key as a local cache. The default is an
  in memory store (`ToolDbMemoryStore`); LevelDB (Node) and IndexedDB
  (browsers) keep data across restarts.
- Relay nodes store events with `StorageEventStore`, which keeps indexes by
  kind, author and single letter tag on top of any adapter.

## Breaking changes

- New wire format (Nostr events), no compatibility with current peers.
- Existing data is not migrated automatically; a migration script can read
  old data and republish it with a Nostr identity.
- Removed: `websocket-network`, `webrtc-network`, `hybrid-network`,
  `web3-user`, `ecdsa-user`, the network adapter option, peer ping/pong and
  the peer account, the `==` namespace, published encrypted keystores,
  `signUp`/`signIn` with username and password across devices, the message
  nonce (`n`), and the P-256 ECDH and group key utilities (NIP-44 should
  replace them).
- Removed the example chat app, which was built on the old API, and the CI
  job deploying it.
- Addresses are Nostr public keys; `ToolDbNostrUser` is the default signer.
- Server functions are registered on `ToolDbRelay`, not on `ToolDb`.
- Requires Node 22+ (global `WebSocket`).

## Phases

1. **Foundations**: Nostr event primitives in the core (serialize, id, sign,
   verify), universal hashing, a signer with local keys, and an in-memory
   relay for tests.
2. **Network**: a relay pool; `put`, `get` and `subscribe` on
   kind 30078, tested against the test relay from Node clients.
3. **CRDTs**: change sets as events.
4. **ToolDB relay node**: a Node relay with ToolDB validation and storage
   adapters; Node and browser clients talking through it.
5. **Identity**: NIP-49 local keys, NIP-07 and NIP-46 signers, NIP-05 names.
6. **Functions, encryption and queries**: server functions over ephemeral
   events, NIP-44 encryption and group keys, `queryKeys`.
7. **Cleanup**: remove the old packages, update the README and example app.

## Status

| Phase                             | State                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| 1. Foundations                    | Done: event primitives, local key signer, relay                                           |
| 2. Network                        | Done: relay pool, `putData`, `getData`, `subscribeData`                                   |
| 3. CRDTs                          | Done: change sets as events                                                               |
| 4. ToolDB relay node              | Done: validation, storage, server functions, NIP-11                                       |
| 5. Identity                       | Partly: NIP-49, NIP-19, NIP-07 signer, profiles and NIP-05 names done; NIP-46 not started |
| 6. Functions, encryption, queries | Done: server functions, `queryKeys`, NIP-44 encryption and group keys                     |
| 7. Cleanup                        | Done: old packages, protocol and example removed                                          |

Decisions taken while implementing:

- **Same second writes**: `putData` bumps `created_at` past our previous
  event for the key, so our latest write always wins even within the same
  second (otherwise the lowest id would win the tie).
- **Records**: listeners and custom verificators get records shaped like
  before (`k`, `a`, `t` in milliseconds, `v`), built from the event.
- **CRDT subscriptions**: `subscribeData` listens for both values and CRDT
  change sets of a key, since apps subscribe to CRDT keys with it.
- **Event kinds**: 1078 (CRDT change sets), 21078 and 21079 (function
  requests and responses) are not used by any NIP (checked in October 2026).
  Kinds do not need approval; the NIPs list them only to avoid collisions,
  and ToolDB events are also identified by their topic tags.
- **Verification context**: verification only needs the topic, the custom
  verificators and a way to load the previous value, so relay nodes run the
  exact same checks as clients.
- **Ordering**: relays handle the messages of a connection in order, so a
  request sees the events sent before it; clients also keep their own writes
  locally, so reading them back does not depend on relays.
- **Interop**: event ids and signatures, NIP-19, NIP-49 and the relay are
  checked against `nostr-tools`. The core is bundled with browserify and run
  in a sandbox with only browser globals, syncing with a Node client. The
  example chat app is also tested end to end in Chromium with Playwright
  (IndexedDB, native WebSocket, two users), which is only a development
  dependency.

## Open questions

- **Durability**: which relays to use by default, and should apps be
  encouraged to always run at least one ToolDB relay node?
- **Prefix queries**: is local filtering enough, or are path tags needed
  from the start?
- **Millisecond ordering**: second resolution makes ties more common; is the
  lowest id tie break enough, or should a millisecond tag be added?
