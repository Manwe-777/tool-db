import ToolDb from "./tooldb";
import encodeKeyString from "./utils/crypto/encodeKeyString";
import exportKey from "./utils/crypto/exportKey";

import randomAnimal from "./utils/randomAnimal";

export default function toolDbKeysSignIn(
  this: ToolDb,
  keys: {
    signKeys: CryptoKeyPair;
    encryptionKeys: CryptoKeyPair;
  },
  username?: string
): Promise<{
  signKeys: CryptoKeyPair;
  encryptionKeys: CryptoKeyPair;
}> {
  return exportKey("spki", keys.signKeys.publicKey as CryptoKey)
    .then((skpub) => encodeKeyString(skpub as ArrayBuffer))
    .then((pubKey) => {
      this.user = {
        keys: keys,
        name: username || `Anonymous ${randomAnimal()}`,
        pubKey,
      };
      return keys;
    });
}
