import { ToolDb, EventTemplate, NostrEvent } from "..";

/**
 * A signer for our identity: a Nostr key, or something holding one (a
 * browser extension, a remote signer). Verification does not depend on it,
 * every event is verified with Schnorr signatures.
 */
export default class ToolDbUserAdapter {
  private _tooldb: ToolDb;

  get tooldb() {
    return this._tooldb;
  }

  constructor(db: ToolDb) {
    this._tooldb = db;
  }

  /**
   * Resolves when the signer is ready, for signers that need to load their
   * public key first (like browser extensions)
   */
  get ready(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Switches to a new random identity
   */
  public async anonUser(): Promise<void> {
    return;
  }

  public async setUser(account: unknown, name: string): Promise<void> {
    return;
  }

  /**
   * Signs a Nostr event with this account.
   */
  public signEvent(event: EventTemplate): Promise<NostrEvent> {
    return Promise.reject(
      new Error("This user adapter can not sign Nostr events")
    );
  }

  /**
   * Encrypts a message for another public key (NIP-44)
   */
  public nip44Encrypt(publicKey: string, plaintext: string): Promise<string> {
    return Promise.reject(new Error("This user adapter can not encrypt"));
  }

  /**
   * Decrypts a message from another public key (NIP-44)
   */
  public nip44Decrypt(publicKey: string, payload: string): Promise<string> {
    return Promise.reject(new Error("This user adapter can not decrypt"));
  }

  public getAccountFromPrivate(privateKey: string): Promise<unknown> {
    return Promise.resolve(undefined);
  }

  public encryptAccount(password: string): Promise<unknown> {
    return Promise.resolve(undefined);
  }

  public decryptAccount(acc: unknown, password: string): Promise<any> {
    return Promise.resolve(undefined);
  }

  /**
   * Our public key (hex)
   */
  public getAddress(): string | undefined {
    return "";
  }

  public getUsername(): string | undefined {
    return "";
  }
}
