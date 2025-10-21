import { ToolDb, randomAnimal } from ".";

export default function toolDbKeysSignIn(
  this: ToolDb,
  privateKey: string,
  username?: string
): Promise<unknown> {
  if (!this.userAccount) return Promise.resolve(undefined);

  return this.userAccount
    .getAccountFromPrivate(privateKey)
    .then(async (newAccount) => {
      await this.userAccount.setUser(newAccount, username || randomAnimal());
      return newAccount;
    });
}
