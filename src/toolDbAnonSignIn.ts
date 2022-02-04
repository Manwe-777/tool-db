import ToolDb from "./tooldb";

import exportKeyAsHex from "./utils/crypto/exportKeyAsHex";
import generateKeysComb from "./utils/crypto/generateKeysComb";
import randomAnimal from "./utils/randomAnimal";

export default function toolDbAnonSignIn(this: ToolDb): Promise<{
  signKeys: CryptoKeyPair;
  encryptionKeys: CryptoKeyPair;
}> {
  return generateKeysComb().then((newKeys) =>
    exportKeyAsHex(newKeys.signKeys.publicKey as CryptoKey).then((pubKey) => {
      this.user = {
        keys: newKeys,
        name: `Anonymous ${randomAnimal()}`,
        adress: pubKey,
      };
      return newKeys;
    })
  );
}
