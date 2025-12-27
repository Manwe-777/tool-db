import { ToolDb } from ".";

export default async function toolDbAnonSignIn(this: ToolDb): Promise<void> {
  await this.userAccount.anonUser();
}
