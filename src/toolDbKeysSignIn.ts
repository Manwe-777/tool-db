import { randomAnimal } from ".";
import ToolDb from "./tooldb";

export default function toolDbKeysSignIn(
  this: ToolDb,
  privateKey: string,
  username?: string
) {
  const newAccount = this.getAccountFromPrivate(privateKey);

  this.setUser(newAccount, username || randomAnimal());
  return newAccount;
}
