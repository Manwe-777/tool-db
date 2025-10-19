import { ToolDb } from ".";

export default function toolDbAnonSignIn(this: ToolDb): Promise<void> {
  return this.userAccount.anonUser();
}
