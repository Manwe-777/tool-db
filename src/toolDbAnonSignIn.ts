import ToolDb from "./tooldb";

import randomAnimal from "./utils/randomAnimal";

export default function toolDbAnonSignIn(this: ToolDb): void {
  const account = this.createAccount();
  this.setUser(account, randomAnimal());
}
