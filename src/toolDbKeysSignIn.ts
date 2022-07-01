import { ToolDb, randomAnimal } from ".";

export default function toolDbKeysSignIn(
  this: ToolDb,
  privateKey: string,
  username?: string
): Promise<unknown> {
  if (!this.userAccount) return Promise.resolve(undefined);

  return this.userAccount
    .getAccountFromPrivate(privateKey)
    .then((newAccount) => {
      this.userAccount.setUser(newAccount, username || randomAnimal());
      return newAccount;
    });
}
