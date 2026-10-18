import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

import sha256 from "../utils/sha256";

/**
 * A signed Nostr event (NIP-01)
 */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * An event before it is signed
 */
export interface EventTemplate {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
}

const isHex = (value: any, length: number) =>
  typeof value === "string" &&
  value.length === length &&
  /^[0-9a-f]*$/.test(value);

/**
 * Serializes an event for hashing, as defined in NIP-01
 */
export function serializeEvent(pubkey: string, event: EventTemplate): string {
  return JSON.stringify([
    0,
    pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}

/**
 * The id of an event, the sha256 of its serialization
 */
export function getEventHash(pubkey: string, event: EventTemplate): string {
  return sha256(serializeEvent(pubkey, event));
}

export function generateSecretKey(): string {
  return bytesToHex(schnorr.utils.randomPrivateKey());
}

export function getPublicKey(secretKey: string): string {
  return bytesToHex(schnorr.getPublicKey(hexToBytes(secretKey)));
}

/**
 * Signs an event template with a secret key
 */
export function finalizeEvent(
  event: EventTemplate,
  secretKey: string
): NostrEvent {
  const pubkey = getPublicKey(secretKey);
  const id = getEventHash(pubkey, event);
  const sig = bytesToHex(schnorr.sign(hexToBytes(id), hexToBytes(secretKey)));
  return {
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    created_at: event.created_at,
    pubkey,
    id,
    sig,
  };
}

/**
 * Checks the shape of an event, without verifying it
 */
export function isEventShape(event: any): event is NostrEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    isHex(event.id, 64) &&
    isHex(event.pubkey, 64) &&
    isHex(event.sig, 128) &&
    Number.isInteger(event.created_at) &&
    Number.isInteger(event.kind) &&
    typeof event.content === "string" &&
    Array.isArray(event.tags) &&
    event.tags.every(
      (tag: any) =>
        Array.isArray(tag) && tag.every((item) => typeof item === "string")
    )
  );
}

/**
 * Verifies the id and signature of an event
 */
export function verifyEvent(event: any): event is NostrEvent {
  if (!isEventShape(event)) return false;
  if (getEventHash(event.pubkey, event) !== event.id) return false;
  try {
    return schnorr.verify(
      hexToBytes(event.sig),
      hexToBytes(event.id),
      hexToBytes(event.pubkey)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Returns the value of the first tag with the given name
 */
export function getTagValue(
  event: Pick<NostrEvent, "tags">,
  name: string
): string | undefined {
  const tag = event.tags.find((t) => t[0] === name);
  return tag ? tag[1] : undefined;
}
