import { randomAnimal } from ".";
import ToolDb from "./tooldb";

export default function toolDbKeysSignIn(
  this: ToolDb,
  privateKey: string,
  username?: string
) {
  if (!this.userAccount) return;

  const newAccount = this.userAccount.getAccountFromPrivate(privateKey);

  this.userAccount.setUser(newAccount, username || randomAnimal());
  return newAccount;
}
