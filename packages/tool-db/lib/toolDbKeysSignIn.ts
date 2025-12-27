import { ToolDb, randomAnimal } from ".";

export default async function toolDbKeysSignIn(
  this: ToolDb,
  privateKey: string,
  username?: string
): Promise<unknown> {
  if (!this.userAccount) return Promise.resolve(undefined);

  const newAccount = await this.userAccount.getAccountFromPrivate(privateKey);
  await this.userAccount.setUser(newAccount, username || randomAnimal());
  return newAccount;
}
