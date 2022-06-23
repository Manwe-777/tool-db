import ToolDb from "./tooldb";

import sha256 from "./utils/sha256";
import randomAnimal from "./utils/randomAnimal";

export default function toolDbSignIn(
  this: ToolDb,
  user: string,
  password: string
): Promise<unknown | undefined> {
  return new Promise((resolve, reject) => {
    this.getData<unknown>(`==${user}`, false, 5000).then((_user) => {
      if (!_user) {
        reject("Could not find user");
        return;
      }

      try {
        const newAccount = this.userAccount.decryptAccount(
          _user,
          sha256(password)
        );
        this.userAccount.setUser(
          newAccount,
          user || `Anonymous ${randomAnimal()}`
        );

        resolve(newAccount);
      } catch (e) {
        reject(e);
      }
    });
  });
}
