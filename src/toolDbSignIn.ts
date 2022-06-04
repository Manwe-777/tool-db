import ToolDb from "./tooldb";

import { EncryptedKeystoreV3Json, Account } from "web3-core";

import sha256 from "./utils/sha256";
import randomAnimal from "./utils/randomAnimal";

export default function toolDbSignIn(
  this: ToolDb,
  user: string,
  password: string
): Promise<Account | undefined> {
  return new Promise((resolve, reject) => {
    this.getData<EncryptedKeystoreV3Json>(`==${user}`, false, 5000).then(
      (_user) => {
        if (!_user) {
          reject("Could not find user");
          return;
        }

        try {
          const newAccount = this.web3.eth.accounts.decrypt(
            _user,
            sha256(password)
          );
          this.setUser(newAccount, user || `Anonymous ${randomAnimal()}`);

          resolve(newAccount);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}
