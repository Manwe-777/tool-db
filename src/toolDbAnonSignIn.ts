import ToolDbClient from "./toolDbClient";
import encodeKeyString from "./utils/crypto/encodeKeyString";
import exportKey from "./utils/crypto/exportKey";
import { KeyPair } from "./utils/crypto/generateKeyPair";
import generateKeysComb from "./utils/crypto/generateKeysComb";
import randomAnimal from "./utils/randomAnimal";

export default function toolDbAnonSignIn(this: ToolDbClient): Promise<{
  signKeys: KeyPair;
  encryptionKeys: KeyPair;
}> {
  return generateKeysComb().then((newKeys) =>
    exportKey("spki", newKeys.signKeys.publicKey)
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
