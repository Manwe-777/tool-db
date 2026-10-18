import {
  ToolDb,
  sha256,
  CrdtData,
  CrdtView,
  SignedChangeSet,
  VerifyResult,
  CRDT_COUNTER,
  CRDT_LIST,
  CRDT_MAP,
  CRDT_TYPES,
} from "..";

import { runCustomVerificators } from "../toolDbVerificationWrapper";

// Max clock shift allowed, same as regular messages
const MAX_CLOCK_SHIFT = 30000;

const isObject = (value: any) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Hash of a change set, this is what its author signs. It includes the key
 * and type so a change set can not be replayed into another document.
 */
export function getChangeSetHash(
  key: string,
  type: string,
  set: Pick<SignedChangeSet, "a" | "t" | "c">
): string {
  return sha256(JSON.stringify([key, type, set.a, set.t, set.c]));
}

/**
 * Returns the author of a change, or undefined if the change is not valid
 * for the given CRDT type.
 */
export function getChangeAuthor(type: string, change: any): string | undefined {
  if (!isObject(change)) return undefined;

  if (type === CRDT_MAP) {
    if (change.t !== "SET" && change.t !== "DEL") return undefined;
    if (typeof change.k !== "string" || typeof change.i !== "number") {
      return undefined;
    }
    return typeof change.a === "string" ? change.a : undefined;
  }

  if (type === CRDT_COUNTER) {
    if (change.t !== "ADD" && change.t !== "SUB") return undefined;
    if (typeof change.v !== "number" || !isFinite(change.v)) return undefined;
    if (typeof change.i !== "number") return undefined;
    return typeof change.a === "string" ? change.a : undefined;
  }

  if (type === CRDT_LIST) {
    if (change.t !== "INS" && change.t !== "DEL") return undefined;
    if (change.t === "DEL" && typeof change.v !== "string") return undefined;
    if (typeof change.i !== "string") return undefined;
    // List indexes are "author-sequence"
    const separator = change.i.lastIndexOf("-");
    return separator > 0 ? change.i.slice(0, separator) : undefined;
  }

  return undefined;
}

export function isCrdtData(data: any): data is CrdtData {
  return (
    isObject(data) &&
    typeof data.k === "string" &&
    CRDT_TYPES.includes(data.c) &&
    Array.isArray(data.sets)
  );
}

export function flattenChangeSets<C>(sets: SignedChangeSet<C>[]): C[] {
  return sets.reduce<C[]>((changes, set) => changes.concat(set.c), []);
}

export function createCrdtData<C>(
  key: string,
  type: string,
  sets: SignedChangeSet<C>[]
): CrdtData<C> {
  const hashes = sets.map((set) => getChangeSetHash(key, type, set)).sort();
  return { k: key, c: type, h: sha256(hashes.join("")), sets };
}

export function toCrdtView<C>(data: CrdtData<C>): CrdtView<C> {
  return { ...data, v: flattenChangeSets(data.sets) };
}

/**
 * Merges change sets, ignoring the ones we already have.
 * @returns the merged sets, and how many new sets were added
 */
export function mergeChangeSets<C>(
  key: string,
  type: string,
  existing: SignedChangeSet<C>[],
  incoming: SignedChangeSet<C>[]
): { sets: SignedChangeSet<C>[]; added: number } {
  const known: Record<string, boolean> = {};
  existing.forEach((set) => {
    known[getChangeSetHash(key, type, set)] = true;
  });

  const sets = [...existing];
  incoming.forEach((set) => {
    const hash = getChangeSetHash(key, type, set);
    if (!known[hash]) {
      known[hash] = true;
      sets.push(set);
    }
  });

  return { sets, added: sets.length - existing.length };
}

/**
 * Verifies a single change set: its shape, timestamp, that every change is
 * authored by the signer, the namespace, the signature, and custom verificators.
 */
export async function verifyChangeSet(
  tooldb: ToolDb,
  key: string,
  type: string,
  set: SignedChangeSet
): Promise<VerifyResult> {
  if (
    !isObject(set) ||
    typeof set.a !== "string" ||
    typeof set.t !== "number" ||
    typeof set.s !== "string" ||
    !Array.isArray(set.c) ||
    set.c.length === 0
  ) {
    return VerifyResult.InvalidData;
  }

  if (set.t > new Date().getTime() + MAX_CLOCK_SHIFT) {
    return VerifyResult.InvalidTimestamp;
  }

  // User namespaced keys can only contain changes from their owner
  if (key.slice(0, 1) === ":" && key.split(".")[0].slice(1) !== set.a) {
    return VerifyResult.AddressMismatch;
  }

  for (let i = 0; i < set.c.length; i += 1) {
    const author = getChangeAuthor(type, set.c[i]);
    if (author === undefined) return VerifyResult.InvalidData;
    // This is what makes authorship of every change provable
    if (author !== set.a) return VerifyResult.AddressMismatch;
  }

  const hash = getChangeSetHash(key, type, set);
  if (tooldb.verifiedChangeSets.has(hash)) {
    return VerifyResult.Verified;
  }

  const signed = await tooldb.userAccount.verifySignature({
    h: hash,
    a: set.a,
    s: set.s,
  });
  if (!signed) return VerifyResult.InvalidSignature;

  // Custom verificators get the change set as a regular message
  const custom = await runCustomVerificators.call(
    tooldb,
    { k: key, a: set.a, n: 0, t: set.t, h: hash, s: set.s, v: set.c, c: type },
    async () => {
      const previous = JSON.parse(await tooldb.store.get(key));
      return isCrdtData(previous) ? toCrdtView(previous) : undefined;
    }
  );
  if (custom !== VerifyResult.Verified) return custom;

  tooldb.verifiedChangeSets.add(hash);
  return VerifyResult.Verified;
}

/**
 * Verifies all the change sets of a CRDT document.
 * @returns only the change sets that verified
 */
export async function verifyCrdtData(
  tooldb: ToolDb,
  data: CrdtData
): Promise<SignedChangeSet[]> {
  if (!isCrdtData(data)) return [];

  const results = await Promise.all(
    data.sets.map((set) => verifyChangeSet(tooldb, data.k, data.c, set))
  );

  return data.sets.filter(
    (_set, index) => results[index] === VerifyResult.Verified
  );
}
