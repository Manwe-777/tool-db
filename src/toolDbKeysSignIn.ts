import { randomAnimal } from ".";
import ToolDb from "./tooldb";

export default function toolDbKeysSignIn(
  this: ToolDb,
  privateKey: string,
  username?: string
) {
  const newAccount = this.web3.eth.accounts.privateKeyToAccount(privateKey);

  this.setUser(newAccount, username || `Anonymous ${randomAnimal()}`);
  return newAccount;
}
