import { Keys } from "../../types/tooldb";
import encodeKeyString from "./encodeKeyString";
import exportKey from "./exportKey";

export default async function saveKeysComb(
  signKeys: CryptoKeyPair
): Promise<Keys> {
  const skpub = await exportKey("spki", signKeys.publicKey as CryptoKey);
  const skpriv = await exportKey("pkcs8", signKeys.privateKey as CryptoKey);

  const jsonKeys = {
    pub: encodeKeyString(skpub as ArrayBuffer),
    priv: encodeKeyString(skpriv as ArrayBuffer),
  };

  // ONLY FOR TESTING! NEVER ENABLE IN PROD
  // localStorage.setItem("keys", JSON.stringify(jsonKeys));

  return jsonKeys;
}
