import Block, { BlockData } from "./Block";
import isValidChain from "./isValidChain";
import Tx from "./Tx";

export default class ToolChain {
  private _chain: Block[] = [];

  private _balancesState: Record<string, number> = {};
  private _lastBlockCalculated: number = 0;

  constructor() {
    this._chain = [Block.genesis()];
  }

  calculateState() {
    this._chain.slice(this._lastBlockCalculated).forEach((block) => {
      block.data.sort(Tx.sortTxJson).forEach((tx) => {
        if (this._balancesState[tx.from]) {
          this._balancesState[tx.from] -= tx.amount;
        }
        if (this._balancesState[tx.to]) {
          this._balancesState[tx.to] += tx.amount;
        } else {
          this._balancesState[tx.to] = tx.amount;
        }
      });
    });

    this._lastBlockCalculated = this._chain.length;

    return this._balancesState;
  }

  get balances() {
    return this._balancesState;
  }

  pushBlock(block: Block) {
    if (this.isValidBlock(block)) {
      this._chain.push(block);
      this.calculateState();
      return block;
    }
    return false;
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
      block.hash === Block.blockHash(block) &&
      Block.verifyBlockData(block)
      // Block.verifyLeader(block, this.getLeader())
    ) {
      return true;
    } else {
      return false;
    }
  }
}
