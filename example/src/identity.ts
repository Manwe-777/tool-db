import {
  EncryptedNostrAccount,
  ToolDb,
  ToolDbNip07User,
  ToolDbNostrUser,
} from "tool-db";
import { ToolDbIndexedDb } from "@tool-db/indexeddb-store";

import { CHAT_TOPIC, onlyOwnJoinRequests } from "./rules.js";

const ACCOUNT_KEY = "tooldb-chat-account";

export const RELAYS: string[] = (
  import.meta.env.VITE_RELAYS || "ws://127.0.0.1:8080"
)
  .split(",")
  .map((relay: string) => relay.trim())
  .filter(Boolean);

function createDb(
  userAdapter: typeof ToolDbNostrUser | typeof ToolDbNip07User
) {
  const db = new ToolDb({
    relays: RELAYS,
    topic: CHAT_TOPIC,
    storageAdapter: ToolDbIndexedDb,
    storageName: "tooldb-chat",
    userAdapter,
  });
  db.addCustomVerification("requests-", onlyOwnJoinRequests);
  return db;
}

/**
 * The account saved in this browser: the secret key, encrypted with the
 * user's password (NIP-49). It never leaves the browser.
 */
export function getSavedAccount(): EncryptedNostrAccount | undefined {
  try {
    const saved = localStorage.getItem(ACCOUNT_KEY);
    return saved ? JSON.parse(saved) : undefined;
  } catch (e) {
    return undefined;
  }
}

export function forgetAccount() {
  localStorage.removeItem(ACCOUNT_KEY);
}

async function saveAccount(db: ToolDb, password: string) {
  const encrypted = await db.userAccount.encryptAccount(password);
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(encrypted));
}

/**
 * A new identity, saved encrypted with the password
 */
export async function createAccount(name: string, password: string) {
  const db = createDb(ToolDbNostrUser);
  await db.ready;
  // The signer starts with a new random key, keep it with our name
  const user = db.userAccount as ToolDbNostrUser;
  await db.keysSignIn(user.exportSecretKey(), name);
  await saveAccount(db, password);
  await db.putProfile({ name });
  return db;
}

/**
 * The identity saved in this browser
 */
export async function unlockAccount(password: string) {
  const saved = getSavedAccount();
  if (!saved) throw new Error("There is no account in this browser");

  const db = createDb(ToolDbNostrUser);
  await db.ready;
  // Rejects with a wrong password
  const account = await db.userAccount.decryptAccount(saved, password);
  await db.userAccount.setUser(account, saved.name);
  return db;
}

/**
 * An existing Nostr identity (nsec), saved encrypted with the password
 */
export async function importAccount(
  nsec: string,
  name: string,
  password: string
) {
  const db = createDb(ToolDbNostrUser);
  await db.ready;
  await db.keysSignIn(nsec, name);
  await saveAccount(db, password);
  await db.putProfile({ name });
  return db;
}

/**
 * The identity of a Nostr browser extension (NIP-07)
 */
export async function connectExtension() {
  const db = createDb(ToolDbNip07User);
  await db.ready;
  return db;
}

export function hasExtension() {
  return typeof (window as any).nostr !== "undefined";
}
