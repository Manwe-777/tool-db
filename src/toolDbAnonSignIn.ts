import ToolDb from "./tooldb";

import randomAnimal from "./utils/randomAnimal";

export default function toolDbAnonSignIn(this: ToolDb): void {
  const account = this.web3.eth.accounts.create();
  this.user = {
    account: account,
    name: `Anonymous ${randomAnimal()}`,
  };
}
