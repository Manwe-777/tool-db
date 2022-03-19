import ToolDb from "./tooldb";

import decryptWithPass from "./utils/crypto/decryptWithPass";

import sha256 from "./utils/sha256";
import hexToUint8 from "./utils/encoding/hexToUint8";
import hexToArrayBuffer from "./utils/encoding/hexToArrayBuffer";
import { UserRootData } from "./types/tooldb";
import { Account } from "web3-core";

export default function toolDbSignIn(
  this: ToolDb,
  user: string,
  password: string
): Promise<Account | undefined> {
  return new Promise((resolve, reject) => {
    this.getData<UserRootData>(`==${user}`, false, 5000)
      .then((_user) => {
        if (!_user) {
          reject("Could not find user");
          return;
        }

        if (sha256(password) !== _user.pass) {
          reject("Invalid password");
          return;
        }

        decryptWithPass(
          hexToArrayBuffer(_user.privateKey),
          password,
          hexToUint8(_user.iv)
        ).then((decryptedSKpriv) => {
          if (decryptedSKpriv) {
            const newAccount = this.keysSignIn(decryptedSKpriv, user);
            resolve(newAccount);
          }
        });
      })
      .catch(console.warn);
  });
}
