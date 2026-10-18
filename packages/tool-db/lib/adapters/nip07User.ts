import { ToolDb, EventTemplate, NostrEvent, ToolDbUserAdapter } from "..";

import { verifyEvent } from "../nostr/event";

/**
 * The signer browser extensions expose as `window.nostr` (NIP-07)
 */
export interface Nip07Signer {
  getPublicKey(): Promise<string>;
  signEvent(event: EventTemplate): Promise<NostrEvent>;
  nip44?: {
    encrypt(publicKey: string, plaintext: string): Promise<string>;
    decrypt(publicKey: string, payload: string): Promise<string>;
  };
}

const notSupported = (what: string) =>
  Promise.reject(
    new Error(`${what} is not possible, the key is held by the extension`)
  );

/**
 * Nostr identity held by a browser extension (NIP-07), the app never sees
 * the secret key. Use `db.ready` before signing, the public key is loaded
 * from the extension.
 */
export default class ToolDbNip07User extends ToolDbUserAdapter {
  private _publicKey: string | undefined;

  private _ready: Promise<void>;

  constructor(db: ToolDb) {
    super(db);
    this._ready = this.load();
    // Still rejects for whoever awaits it, without being an unhandled rejection
    this._ready.catch(() => undefined);
  }

  private get signer(): Nip07Signer {
    const signer = (globalThis as any).nostr as Nip07Signer | undefined;
    if (!signer) throw new Error("No Nostr browser extension (NIP-07) found");
    return signer;
  }

  private async load() {
    const publicKey = await this.signer.getPublicKey();
    if (!/^[0-9a-f]{64}$/.test(publicKey)) {
      throw new Error("The extension returned an invalid public key");
    }
    this._publicKey = publicKey;
  }

  get ready(): Promise<void> {
    return this._ready;
  }

  public async signEvent(template: EventTemplate): Promise<NostrEvent> {
    await this._ready;
    const event = await this.signer.signEvent({
      kind: template.kind,
      created_at: template.created_at,
      tags: template.tags,
      content: template.content,
    });

    // Extensions are not trusted to sign what we asked for
    if (
      !verifyEvent(event) ||
      event.pubkey !== this._publicKey ||
      event.kind !== template.kind ||
      event.created_at !== template.created_at ||
      event.content !== template.content ||
      JSON.stringify(event.tags) !== JSON.stringify(template.tags)
    ) {
      throw new Error("The extension returned an invalid event");
    }
    return event;
  }

  public async nip44Encrypt(
    publicKey: string,
    plaintext: string
  ): Promise<string> {
    if (!this.signer.nip44) throw new Error("The extension can not encrypt");
    return this.signer.nip44.encrypt(publicKey, plaintext);
  }

  public async nip44Decrypt(
    publicKey: string,
    payload: string
  ): Promise<string> {
    if (!this.signer.nip44) throw new Error("The extension can not decrypt");
    return this.signer.nip44.decrypt(publicKey, payload);
  }

  public anonUser(): Promise<void> {
    return notSupported("Creating a new identity");
  }

  public setUser(): Promise<void> {
    return notSupported("Changing the identity");
  }

  public getAccountFromPrivate(): Promise<unknown> {
    return notSupported("Signing in with a secret key");
  }

  public encryptAccount(): Promise<unknown> {
    return notSupported("Exporting the account");
  }

  public decryptAccount(): Promise<unknown> {
    return notSupported("Importing an account");
  }

  public getAddress(): string | undefined {
    return this._publicKey;
  }

  public getUsername(): string | undefined {
    return undefined;
  }
}
