import { exportKeyAsHex, randomAnimal } from ".";
import ToolDb from "./tooldb";

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
  return exportKeyAsHex(keys.signKeys.publicKey as CryptoKey).then((pubKey) => {
    this.user = {
      keys: keys,
      name: username || `Anonymous ${randomAnimal()}`,
      adress: pubKey,
    };
    return keys;
  });
}
