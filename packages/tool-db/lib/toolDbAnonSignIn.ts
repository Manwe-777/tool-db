import { ToolDb } from ".";

export default function toolDbAnonSignIn(this: ToolDb): void {
  this.userAccount.anonUser();
}
