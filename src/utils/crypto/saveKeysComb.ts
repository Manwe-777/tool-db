import { ParsedKeys } from "../../types/tooldb";
import encodeKeyString from "./encodeKeyString";
import exportKey from "./exportKey";

export default async function saveKeysComb(
  signKeys: CryptoKeyPair,
  encryptionKeys: CryptoKeyPair
): Promise<ParsedKeys> {
  const skpub = await exportKey("spki", signKeys.publicKey as CryptoKey);
  const skpriv = await exportKey("pkcs8", signKeys.privateKey as CryptoKey);
  const ekpub = await exportKey("spki", encryptionKeys.publicKey as CryptoKey);
  const ekpriv = await exportKey(
    "pkcs8",
    encryptionKeys.privateKey as CryptoKey
  );

  const jsonKeys = {
    skpub: encodeKeyString(skpub as ArrayBuffer),
    skpriv: encodeKeyString(skpriv as ArrayBuffer),
    ekpub: encodeKeyString(ekpub as ArrayBuffer),
    ekpriv: encodeKeyString(ekpriv as ArrayBuffer),
  };

  // ONLY FOR TESTING! NEVER ENABLE IN PROD
  // localStorage.setItem("keys", JSON.stringify(jsonKeys));

  return jsonKeys;
}
