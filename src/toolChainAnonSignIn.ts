import ToolChain from ".";
import { KeyPair } from "./utils/crypto/generateKeyPair";
import generateKeysComb from "./utils/crypto/generateKeysComb";
import randomAnimal from "./utils/randomAnimal";

export default function toolChainAnonSignIn(this: ToolChain): Promise<{
  signKeys: KeyPair;
  encryptionKeys: KeyPair;
}> {
  return generateKeysComb().then((newKeys) => {
    this.user = { keys: newKeys, name: `Anonymous ${randomAnimal()}` };
    return newKeys;
  });
}
