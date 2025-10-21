/* eslint-disable class-methods-use-this */
import {
  randomAnimal,
  ToolDb,
  ToolDbUserAdapter,
  VerificationData,
} from "tool-db";

import arrayBufferToHex from "./utils/arrayBufferToHex";
import hexToArrayBuffer from "./utils/hexToArrayBuffer";
import base64ToUint8 from "./utils/base64ToUint8";
import uint8ToBase64 from "./utils/uint8ToBase64";

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

  private _initPromise: Promise<void> | null = null;

  constructor(db: ToolDb) {
    super(db);

    // eslint-disable-next-line global-require
    global.Buffer = global.Buffer || require("buffer").Buffer;

    if (typeof window === "undefined") {
      // eslint-disable-next-line global-require
      global.crypto = require("crypto").webcrypto;
    }

    // Don't auto-generate anon user - let the caller decide
    // this.anonUser();
  }

  public anonUser(): Promise<void> {
    if (!this._initPromise) {
      this._initPromise = generateKeysComb().then((keys) => {
        return pubkeyToBase64(keys.publicKey as CryptoKey).then((rawPublic) => {
          this._keys = keys;
          this._address = rawPublic;
          this._username = randomAnimal();
        });
      });
    }
    return this._initPromise;
  }

  public async setUser(account: ECDSAUser, _name: string): Promise<void> {
    const pub = hexToArrayBuffer(account.pub);
    const priv = hexToArrayBuffer(account.priv);

    const spub = await importKey(pub.buffer as ArrayBuffer, "spki", "ECDSA", ["verify"]);
    const spriv = await importKey(priv.buffer as ArrayBuffer, "pkcs8", "ECDSA", ["sign"]);
    
    this._keys = {
      publicKey: spub,
      privateKey: spriv,
    };

    this._username = account.name;
    this._address = await pubkeyToBase64(spub);
    this._initPromise = Promise.resolve();
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

      return verifyData(message.h, hexToArrayBuffer(message.s).buffer as ArrayBuffer, pubKey).then(
        (result) => {
          return result;
        }
      );
    });
  }

  public async encryptAccount(password: string): Promise<EncryptedUserdata> {
    // Wait for initialization to complete if in progress
    if (this._initPromise) {
      await this._initPromise;
    }
    
    if (!this._keys) {
      throw new Error("Cannot encrypt account: keys are not initialized. Call anonUser() or setUser() first.");
    }

    const hexed = await cryptoKeyPairToHexed(this._keys);
    const iv = generateIv();
    
    const keys = await encryptWithPass(JSON.stringify(hexed), password, iv);
    
    if (!keys) {
      throw new Error("Failed to encrypt account: encryptWithPass returned undefined");
    }
    
    return {
      name: this._username || randomAnimal(),
      keys: keys,
      iv: uint8ToBase64(iv),
    };
  }

  public async decryptAccount(
    acc: EncryptedUserdata,
    password: string
  ): Promise<ECDSAUser> {    
    if (!acc.keys || acc.keys === "") {
      throw new Error("Cannot decrypt account: encrypted keys are empty or missing");
    }
    
    const rawIv = base64ToUint8(acc.iv);
    
    const data = await decryptWithPass(acc.keys, password, rawIv);
    
    if (!data) {
      throw new Error("Failed to decrypt account: decryptWithPass returned undefined");
    }
    
    const hexedKeys: HexedKeys = JSON.parse(data);
    
    return {
      name: acc.name,
      pub: hexedKeys.pub,
      priv: hexedKeys.priv,
    };
  }

  public getAddress(): string | undefined {
    return this._address;
  }

  public getUsername(): string | undefined {
    return this._username;
  }
}
