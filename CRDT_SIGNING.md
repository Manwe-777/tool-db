# CRDT Authentication

## Summary

Regular keys are signed end to end: every stored record carries the author's
signature over a hash of its value, and every peer can verify it. CRDT
documents used to work differently: servers merged changes from several
authors into a single record and stored it under the signature of whoever
sent the last change, so stored documents could not be verified, and the
author of each change was just a field anyone could write.

CRDT documents now use **signed change sets**: every set of changes is
signed by its author, and every change in a set must be authored by the
signer. A document is a collection of change sets, each verified on its own,
so it can be relayed and merged by anyone without losing authentication.

The implementation lives in `packages/tool-db/lib/utils/crdtChangeSets.ts`.
It is covered by `__tests__/crdtChangeSets.ts` (unit tests) and
`__tests__/crdt-network.ts` (attacks over the network).

## Previous issues

1. **Merged documents could not be verified.** The stored value was the
   merge of several authors' changes, but the hash and signature belonged to
   a single incoming message. Once the hash was always checked, peers
   rejected merged documents served by servers.
2. **Change authorship was not authenticated.** A `crdtPut` signature proved
   who sent the change list, not who made each change in it, so a signer
   could include changes attributed to anyone. Custom verificators relying
   on change authors (like `ownedMapVerificator` in the example app) were
   fooled by this, and user namespaces only checked the message author.
3. **CRDT GET replies were merged without verification**, so any peer could
   answer a `crdtGet` with forged changes.
4. **`handleCrdtPut` mutated the incoming message** after emitting it to
   listeners.
5. **Older timestamps discarded merged changes**: the merge was only stored
   if the incoming message was newer, so changes from clients with clock
   skew, or syncing after being offline, were lost.
6. **Counters were merged as lists**, dropping equal increments from
   different authors (fixed separately, before this redesign).

## Format

```ts
interface SignedChangeSet<C> {
  a: string; // author address, every change must be authored by it
  t: number; // timestamp the set was created
  c: C[]; // changes
  s: string; // signature of getChangeSetHash(key, type, set)
}

interface CrdtData<C> {
  k: string; // key
  c: string; // CRDT type: MAP:2, LIST:2 or COUNTER:2
  h: string; // hash of all the sets, only used for deduplication
  sets: SignedChangeSet<C>[];
}
```

The signed hash is `sha256(JSON.stringify([key, type, a, t, c]))`. It
includes the key and type, so a set can not be replayed into another
document.

The author of a change is its `a` field for maps and counters, and the prefix
of its `i` field (`author-00000001`) for lists.

## Rules

A change set is accepted only if:

- its fields are valid and every change has a valid shape for the type,
- its timestamp is not more than 30 seconds in the future,
- every change is authored by the set author,
- for user namespaced keys (`:address.key`), the set author is the owner,
- the signature verifies for the author,
- all matching custom verificators pass.

Peers keep the valid sets of a document and drop the invalid ones, so a
single forged set does not block the valid ones. Verified set hashes are
cached, so each set is only verified once per peer.

Who may modify or delete what (for example, whether Bob can `DEL` a key
Alice set) is left to custom verificators. They receive each change set as a
regular message: `msg.a` is the proven author, `msg.v` the changes, and the
previous value is the stored document with all its changes in `v`.

## Behavior

- **`putCrdt`** signs only the changes authored by us that were not
  published yet, as one new set. Changes by other authors are kept in the
  document only through their own signed sets. The CRDT must be created
  with our address as its author. The document is stored locally too.
- **Servers** (`handleCrdtPut`) verify the incoming sets, merge them with the
  stored ones, and store and relay the result whenever new sets were added,
  regardless of timestamps. Reading, merging and writing a key is done under
  a per-key lock, so concurrent puts do not lose sets.
- **`getCrdt`** merges local data right away. When connected, it still waits
  for a reply from other peers (or the timeout), and only merges the sets in
  the reply that verify. It resolves with a `CrdtView`.
- **Key listeners, `data` events and subscriptions** get a `CrdtView`: the
  stored document plus all of its changes in `v`, so listeners that merge
  `msg.v` keep working.
- **Regular messages** with a CRDT type (`c !== null`) are rejected; CRDT
  data only travels as change sets.

## Breaking changes

- New CRDT type ids (`MAP:2`, `LIST:2`, `COUNTER:2`). Legacy documents
  (`MAP`, `LIST`, `COUNTER`) are ignored: they can not be authenticated after
  the fact. Apps that need the old data must migrate it themselves, by
  reading it and putting it again with the new version.
- CRDTs must be created with the user's address as author, changes by any
  other author are not published by `putCrdt`.
- `getCrdt` resolves with a `CrdtView` instead of a raw record or message.
- The stored and wire formats of CRDT documents changed, so old and new peers
  can not sync CRDTs with each other.

## Open items

- **Verification cost**: one signature verification per new change set.
  WebCrypto ECDSA (`ecdsa-user`) is fast; `web3-user` verifies in plain JS
  and is noticeably slower. Worth benchmarking with realistic documents.
- **Growth**: change logs are never compacted, and signatures make each set
  bigger. Compaction (signed snapshots or per author checkpoints) would need
  its own design to stay verifiable.
- **Default permissions**: there is no built in rule for modifying or
  deleting other authors' entries; apps rely on custom verificators.
