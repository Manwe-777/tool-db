import ToolDb from "./tooldb";
import encodeKeyString from "./utils/crypto/encodeKeyString";
import exportKey from "./utils/crypto/exportKey";
import generateKeysComb from "./utils/crypto/generateKeysComb";
import randomAnimal from "./utils/randomAnimal";

export default function toolDbAnonSignIn(this: ToolDb): Promise<{
  signKeys: CryptoKeyPair;
  encryptionKeys: CryptoKeyPair;
}> {
  return generateKeysComb().then((newKeys) =>
    exportKey("spki", newKeys.signKeys.publicKey as CryptoKey)
      .then((skpub) => encodeKeyString(skpub as ArrayBuffer))
      .then((pubKey) => {
        this.user = {
          keys: newKeys,
          name: `Anonymous ${randomAnimal()}`,
          pubKey,
        };
        return newKeys;
      })
  );
}
