import ToolDb from "./tooldb";

export default function toolDbAnonSignIn(this: ToolDb): void {
  this.userAccount.anonUser();
}
