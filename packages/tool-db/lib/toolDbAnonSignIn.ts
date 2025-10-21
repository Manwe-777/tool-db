import { ToolDb } from ".";

export default async function toolDbAnonSignIn(this: ToolDb): Promise<void> {
  return this.userAccount.anonUser();
}
