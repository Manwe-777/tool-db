/* eslint-disable class-methods-use-this */
import {
  randomAnimal,
  ToolDb,
  ToolDbUserAdapter,
  VerificationData,
} from "tool-db";

import {
  arrayBufferToHex,
  hexToArrayBuffer,
  base64ToUint8,
  uint8ToBase64,
} from "tool-db";

import cryptoKeyPairToHexed from "./crypto/cryptoKeyPairToHexed";
import generateKeysComb from "./crypto/generateKeysComb";
import decryptWithPass from "./crypto/decryptWithPass";
import encryptWithPass from "./crypto/encryptWithPass";
import pubkeyToBase64 from "./crypto/pubkeyToBase64";
import base64ToPubkey from "./crypto/base64ToPubkey";
import verifyData from "./crypto/verifyData";
import generateIv from "./crypto/generateIv";
import exportKey from "./crypto/exportKey";
import importKey from "./crypto/importKey";
import signData from "./crypto/signData";

import { ECDSAUser, EncryptedUserdata, HexedKeys } from "./types";

const PUBKEY_PREFIX = "3059301306072a8648ce3d020106082a8648ce3d03010703420004";

export default class ToolDbEcdsaUser extends ToolDbUserAdapter {
  private _address!: string;

  private _username!: string;

  private _keys!: globalThis.CryptoKeyPair;

  constructor(db: ToolDb) {
    super(db);

    // eslint-disable-next-line global-require
    global.Buffer = global.Buffer || require("buffer").Buffer;
    // Note: crypto is handled by getCrypto() which supports browser, web worker, and Node.js

    // Initialize with temporary keys for peerAccount to function
    // These will be replaced when anonUser() or setUser() is called explicitly
    this.anonUser();
  }

  public async anonUser() {
    const keys = await generateKeysComb();
    const rawPublic = await pubkeyToBase64(keys.publicKey as CryptoKey);
    this._keys = keys;
    this._address = rawPublic;
    this._username = randomAnimal();
  }

  public async setUser(account: ECDSAUser, _name: string): Promise<void> {
    const pub = hexToArrayBuffer(account.pub);
    const priv = hexToArrayBuffer(account.priv);

    const spub = await importKey(pub, "spki", "ECDSA", ["verify"]);
    const spriv = await importKey(priv, "pkcs8", "ECDSA", ["sign"]);

    this._keys = {
      publicKey: spub,
      privateKey: spriv,
    };

    this._username = account.name;
    this._address = await pubkeyToBase64(spub);
  }

  public signData(data: string): Promise<string> {
    return signData(data, this._keys.privateKey as CryptoKey).then(
      (signature) => {
        return arrayBufferToHex(signature);
      }
    );
  }

  public async getPublic() {
    const jwkPrivate = await crypto.subtle.exportKey(
      "jwk",
      this._keys.privateKey as CryptoKey
    );

    delete jwkPrivate.d;
    jwkPrivate.key_ops = ["verify"];

    const reimportedPubkey = await crypto.subtle.importKey(
      "jwk",
      jwkPrivate,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"]
    );

    const addr = await exportKey("spki", reimportedPubkey).then((rawPublic) => {
      return arrayBufferToHex(rawPublic as ArrayBuffer).slice(
        PUBKEY_PREFIX.length
      );
    });
    return addr;
  }

  public verifySignature(
    message: Partial<VerificationData<any>>
  ): Promise<boolean> {
    if (!message.h || !message.a || !message.s) return Promise.resolve(false);

    return base64ToPubkey(message.a).then((pubKey) => {
      if (!message.h || !message.a || !message.s) return false;

      return verifyData(message.h, hexToArrayBuffer(message.s), pubKey).then(
        (result) => {
          return result;
        }
      );
    });
  }

  public encryptAccount(password: string): Promise<EncryptedUserdata> {
    return new Promise((resolve) => {
      // Wait for keys if undefined
      if (this._keys === undefined) {
        setTimeout(() => {
          resolve(this.encryptAccount(password));
        }, 10);
      } else {
        resolve(
          cryptoKeyPairToHexed(this._keys).then((hexed) => {
            const iv = generateIv();
            this.tooldb.logger("cryptoKeyPairToHexed", hexed);
            return encryptWithPass(JSON.stringify(hexed), password, iv).then(
              (keys) => {
                this.tooldb.logger("encryptWithPass", keys);
                return {
                  name: this._username || randomAnimal(),
                  keys: keys || "",
                  iv: uint8ToBase64(iv),
                };
              }
            );
          })
        );
      }
    });
  }

  public decryptAccount(
    acc: EncryptedUserdata,
    password: string
  ): Promise<ECDSAUser> {
    return new Promise((resolve) => {
      // Wait for keys if undefined
      if (this._keys === undefined) {
        setTimeout(() => {
          resolve(this.decryptAccount(acc, password));
        }, 10);
      } else {
        const rawIv = base64ToUint8(acc.iv);
        resolve(
          decryptWithPass(acc.keys, password, rawIv).then((data) => {
            const hexedKeys: HexedKeys = JSON.parse(data || "");

            return {
              name: acc.name,
              pub: hexedKeys.pub,
              priv: hexedKeys.priv,
            };
          })
        );
      }
    });
  }

  public getAddress(): string | undefined {
    return this._address;
  }

  public getUsername(): string | undefined {
    return this._username;
  }
}

// ECDH encryption utilities
export { default as generateECDHKeyPair } from "./crypto/generateECDHKeyPair";
export type { ECDHKeyPair } from "./crypto/generateECDHKeyPair";
export { default as importECDHPublicKey } from "./crypto/importECDHPublicKey";
export { default as importECDHPrivateKey } from "./crypto/importECDHPrivateKey";
export { default as deriveSharedKey } from "./crypto/deriveSharedKey";

// AES-GCM encryption utilities
export { default as encryptWithKey } from "./crypto/encryptWithKey";
export { default as decryptWithKey } from "./crypto/decryptWithKey";
export type { EncryptedData } from "./crypto/encryptWithKey";
export { default as importAESKey } from "./crypto/importAESKey";

// Group key wrapping utilities
export { default as wrapGroupKey } from "./crypto/wrapGroupKey";
export { default as unwrapGroupKey } from "./crypto/unwrapGroupKey";
export type { WrappedGroupKey } from "./crypto/wrapGroupKey";

// Re-export existing utilities for convenience
export { default as generateIv } from "./crypto/generateIv";
export { default as getCrypto } from "./crypto/getCrypto";
export { default as generateKeyPair } from "./crypto/generateKeyPair";

// Password-based encryption utilities
export { default as encryptWithPass } from "./crypto/encryptWithPass";
export { default as decryptWithPass } from "./crypto/decryptWithPass";
export { default as generateKeyFromPassword } from "./crypto/generateKeyFromPassword";
