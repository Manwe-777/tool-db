import Block, { BlockData } from "./Block";
import isValidChain from "./isValidChain";

export default class ToolChain {
  private _chain: Block[] = [];

  // private _balances: Record<string, number>;

  constructor() {
    this._chain = [Block.genesis()];
  }

  addBlock(data: BlockData) {
    const block = Block.createBlock(this._chain[this._chain.length - 1], data);
    this._chain.push(block);

    return block;
  }

  pushBlock(block: Block) {
    this._chain.push(block);
  }

  replaceChain(newChain: Block[]) {
    if (newChain.length <= this._chain.length) {
      console.log("Recieved chain is not longer than the current chain");
      return;
    } else if (!isValidChain(newChain)) {
      console.log("Recieved chain is invalid");
      return;
    }

    console.log("Replacing the current chain with new chain");
    this._chain = newChain;
  }

  // getLeader() {
  //   return this._stakes.getMax(this._validators.list);
  // }

  addBlockToState(block: Block) {
    //
  }

  isValidBlock(block: Block) {
    const lastBlock = this._chain[this._chain.length - 1];
    /**
     * check hash
     * check last hash
     * check signature
     * check leader
     */
    if (
      block.lastHash === lastBlock.hash &&
      block.hash === Block.blockHash(block)
      // Block.verifyBlock(block) &&
      // Block.verifyLeader(block, this.getLeader())
    ) {
      console.log("block valid");
      this.pushBlock(block);
      return true;
    } else {
      return false;
    }
  }
}
