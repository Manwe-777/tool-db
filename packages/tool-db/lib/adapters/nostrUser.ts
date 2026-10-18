import { ToolDb, EventTemplate, NostrEvent, ToolDbUserAdapter } from "..";

import { finalizeEvent, generateSecretKey, getPublicKey } from "../nostr/event";
import { normalizeSecretKey, npubEncode, nsecEncode } from "../nostr/nip19";
import { getConversationKey, nip44Decrypt, nip44Encrypt } from "../nostr/nip44";
import { decryptSecretKey, encryptSecretKey } from "../nostr/nip49";
import randomAnimal from "../utils/randomAnimal";

export interface NostrAccount {
  /**
   * Secret key, hex or nsec
   */
  secretKey: string;
  name?: string;
}

export interface EncryptedNostrAccount {
  name: string;
  /**
   * NIP-49 password encrypted secret key
   */
  ncryptsec: string;
}

/**
 * Nostr identity with a local secret key, the default signer.
 * The address is the hex public key.
 */
export default class ToolDbNostrUser extends ToolDbUserAdapter {
  /**
   * scrypt cost used to encrypt accounts (2^logN), see NIP-49
   */
  public static encryptionLogN = 16;

  private _secretKey!: string;

  private _publicKey!: string;

  private _username!: string;

  constructor(db: ToolDb) {
    super(db);
    // Keys are generated synchronously, so the account is usable right away
    this.setKey(generateSecretKey(), randomAnimal());
  }

  private setKey(secretKey: string, name: string) {
    this._secretKey = normalizeSecretKey(secretKey);
    this._publicKey = getPublicKey(this._secretKey);
    this._username = name;
  }

  public async anonUser(): Promise<void> {
    this.setKey(generateSecretKey(), randomAnimal());
  }

  public async setUser(
    account: NostrAccount | string,
    name: string
  ): Promise<void> {
    const secretKey = typeof account === "string" ? account : account.secretKey;
    this.setKey(secretKey, name);
  }

  public async getAccountFromPrivate(
    privateKey: string
  ): Promise<NostrAccount> {
    return { secretKey: normalizeSecretKey(privateKey) };
  }

  public async signEvent(event: EventTemplate): Promise<NostrEvent> {
    return finalizeEvent(event, this._secretKey);
  }

  public async nip44Encrypt(
    publicKey: string,
    plaintext: string
  ): Promise<string> {
    return nip44Encrypt(
      plaintext,
      getConversationKey(this._secretKey, publicKey)
    );
  }

  public async nip44Decrypt(
    publicKey: string,
    payload: string
  ): Promise<string> {
    return nip44Decrypt(
      payload,
      getConversationKey(this._secretKey, publicKey)
    );
  }

  public async encryptAccount(
    password: string
  ): Promise<EncryptedNostrAccount> {
    return {
      name: this._username,
      ncryptsec: await encryptSecretKey(
        this._secretKey,
        password,
        ToolDbNostrUser.encryptionLogN
      ),
    };
  }

  public async decryptAccount(
    account: EncryptedNostrAccount,
    password: string
  ): Promise<NostrAccount> {
    return {
      name: account.name,
      secretKey: await decryptSecretKey(account.ncryptsec, password),
    };
  }

  public getAddress(): string {
    return this._publicKey;
  }

  public getUsername(): string {
    return this._username;
  }

  /**
   * Public key as npub (NIP-19)
   */
  public get npub(): string {
    return npubEncode(this._publicKey);
  }

  /**
   * Exports the secret key as nsec (NIP-19). Handle with care.
   */
  public exportSecretKey(): string {
    return nsecEncode(this._secretKey);
  }
}
