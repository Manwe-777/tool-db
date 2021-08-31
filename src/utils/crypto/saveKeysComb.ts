import { ParsedKeys } from "../../types/graph";
import encodeKeyString from "./encodeKeyString";
import exportKey from "./exportKey";

export default async function saveKeysComb(
  signKeys: CryptoKeyPair,
  encryptionKeys: CryptoKeyPair
): Promise<ParsedKeys> {
  const skpub = await exportKey("spki", signKeys.publicKey);
  const skpriv = await exportKey("pkcs8", signKeys.privateKey);
  const ekpub = await exportKey("spki", encryptionKeys.publicKey);
  const ekpriv = await exportKey("pkcs8", encryptionKeys.privateKey);

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
