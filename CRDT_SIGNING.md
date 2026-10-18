# CRDT Authentication: Issues and Proposal

## Summary

Regular keys are signed end to end: every stored record carries the author's
signature over a hash of its value, and every peer can verify it. CRDT
documents are not. Servers merge changes from several authors into a single
record and store it under the signature of whoever sent the last change, so
the stored record can not be verified, and the author of each change is just
a field anyone can write.

This document describes the current model, the issues it causes, and a
proposal to sign every change (or every change set) so CRDT data is
authenticated the same way regular keys are.

The issues are covered by tests in `__tests__/crdt-network.ts`, marked with
`it.failing` until they are fixed.

## Current model

1. A client builds a CRDT locally (`MapCrdt`, `ListCrdt`, `CounterCrdt`) and
   calls `putCrdt`. The message value `v` is the **full change list** of the
   document, including changes the client merged from other authors.
2. The message is signed once, by the sender, over
   `sha256(JSON.stringify(v) + a + t + n)` (see `getMessageHash`).
3. A server receiving it (`handleCrdtPut`) verifies the signature, merges `v`
   into its stored document, and stores the merged changes **with the
   incoming message's `h`, `s`, `a` and `t`**.
4. Other clients get the stored record through `crdtGet` or `subscribe`.

Each change identifies its author with a plain field:

| CRDT          | Author field                          |
| ------------- | ------------------------------------- |
| `MapCrdt`     | `a`                                   |
| `CounterCrdt` | `a`                                   |
| `ListCrdt`    | prefix of `i` (`author-00000001`)     |

## Issues

### 1. Merged documents can not be verified

The stored value is the merge of several authors' changes, but the hash and
signature belong to a single incoming message whose value was different. Any
peer that verifies the stored record gets `InvalidHash`.

Before the hash was always checked (commit "Remove proof of work and always
verify the message hash"), this went unnoticed because the hash was never
compared to the value. Since then, peers reject merged documents they receive
from servers: `getCrdt` still merges the reply into the caller's CRDT (see
issue 3), but `handleCrdtPut` refuses to store it or trigger key listeners.

Test: _Stores CRDT documents merged from several authors in a verifiable way_.

### 2. Change authorship is not authenticated

A `crdtPut` signature proves who **sent** the change list, not who **made**
each change in it. Since the list contains changes from other authors, a
signer can include changes attributed to anyone:

```js
[
  { t: "SET", k: "alice", a: "<Alice's address>", v: "never written by Alice", i: 9 },
  { t: "SET", k: "bob", a: "<Bob's address>", v: "b", i: 1 },
];
```

Bob's signature is valid and the first change is accepted as Alice's. Custom
verificators that rely on change authors (like `ownedMapVerificator` in the
example app, which checks `ch.a === ch.k`) are fooled by this.

Combined with issue 1, today a relay does not even need to sign anything: it
can add changes to a stored document and serve it.

User namespaced keys (`:address.key`) are affected too: the namespace check
only applies to the message author, not to the authors of the changes inside.

### 3. CRDT GET replies are merged without verification

`toolDbCrdtGet` merges the changes of the first reply straight into the
caller's CRDT, before any verification. Any peer can answer a `crdtGet` with
forged changes. (`getData` had the same problem and was fixed, but the same
fix can not be applied here until issue 1 is solved, since valid merged
documents would be rejected too.)

Test: _Does not merge forged changes from a CRDT GET reply_.

### 4. `handleCrdtPut` mutates the incoming message

`newMessage = { ...finalMessage }` is a shallow copy, so
`newMessage.data.v = changesMerged` replaces the value of the original
message too, after it was already emitted to `crdtput`, `data` and `verified`
listeners.

### 5. Older timestamps discard merged changes

The merged document is only stored when the incoming message is newer than
the stored one (`parsedOldData.t < finalMessage.data.t`). A message with new
changes but an older timestamp (clock skew, offline client syncing later) is
merged and then thrown away. For CRDTs the timestamp should not decide
anything: the merge is always correct, it should be stored whenever it added
changes.

### Fixed already

- `CounterCrdt` declared `CRDT_LIST` as its type, so servers merged counters
  as lists and dropped equal increments from different authors. Fixed in
  "Fix counter CRDTs being merged as lists"; servers now merge using the
  incoming message type, so counters already stored as `LIST` are handled.

## Proposal: sign changes

Each change carries the signature of its author, so it can be verified on its
own, anywhere, regardless of who relays it or what it is merged with. A merged
document is then just a set of individually verified changes and needs no
signature of its own.

### Option A: sign every change

```ts
interface SignedChange<C> {
  c: C; // the change itself (map, list or counter change)
  a: string; // author address, must be the signer
  s: string; // signature over getChangeHash(...)
}
```

The hash covers everything that gives the change meaning, so it can not be
replayed into another document or type:

```ts
getChangeHash(key, crdtType, change) =
  sha256(JSON.stringify([key, crdtType, change]));
```

### Option B: sign change sets (recommended)

Each `putCrdt` sends only the changes the author made since their last put, as
one signed set:

```ts
interface SignedChangeSet<C> {
  a: string; // author address, must be the signer
  q: number; // sequence number of this set for this author
  c: C[]; // changes, all of them must be authored by `a`
  s: string; // signature over sha256(JSON.stringify([key, crdtType, a, q, c]))
}
```

This gives the same guarantees as option A with one signature per put instead
of one per change, which matters for counters and lists where a single edit
can produce many changes. The rule "every change in a set must be authored by
the set signer" is what closes issue 2.

### Rules (both options)

- A change (or set) is accepted only if its signature verifies for `a`, and
  every change in it is authored by `a` (`a` field for maps and counters, `i`
  prefix for lists).
- For user namespaced keys, every author must be the namespace owner.
- Custom verificators keep working as today, but receive changes whose
  authors are proven, so checks like `ch.a === ch.k` become meaningful.
- Stored CRDT records hold `{ k, c, v: SignedChangeSet[] }` with no record
  level `h` / `s` / `a`. They are verified set by set, not as a message.
- Servers store the merge whenever it added new sets, regardless of
  timestamps (fixes issue 5), building a new object instead of mutating the
  incoming message (fixes issue 4).
- `getCrdt` verifies each set in a reply before merging it (fixes issue 3).
- Peers can cache verified set signatures, so each set is only verified once.

### Migration

The stored format and the wire format change, so this is a protocol version
bump. Suggested approach:

- Use new CRDT type ids (for example `MAP:2`, `LIST:2`, `COUNTER:2`) so old
  and new documents can not be confused, and old peers ignore new documents
  instead of corrupting them.
- Legacy documents (`MAP`, `LIST`, `COUNTER`) can not be authenticated after
  the fact. Either keep serving them read only as untrusted data, or drop
  them; this depends on how much legacy data exists in deployments.

### Costs

- **Size:** roughly 130 hex characters per signature, plus the author
  address, per change (option A) or per put (option B).
- **CPU:** one signature verification per change or set received. WebCrypto
  ECDSA (`ecdsa-user`) is fast; `web3-user` verifies in plain JS and is
  noticeably slower. Both should be benchmarked with realistic documents.
- **Growth:** change logs are never compacted today, signatures make each
  entry bigger. Compaction (snapshots signed by a quorum, or per author
  checkpoints) is out of scope here, but becomes more relevant.

## Interim options

Until the proposal is implemented, CRDT sync between peers through servers is
degraded (issue 1). If that matters before the redesign lands, a temporary
change can skip the hash check for CRDT records (`c !== null`) in
`verifyMessage`. That restores the previous behavior, including its lack of
authentication.

## Open questions

- Option A or option B?
- Who can delete or overwrite what? Signing proves authorship, but whether
  Bob may `DEL` a key Alice set (or tombstone her list item) is an app level
  rule. Should there be a default policy, or is this left to custom
  verificators?
- What to do with legacy CRDT documents in existing deployments?
- Should merged documents be compacted, and how can a compacted snapshot be
  trusted?
