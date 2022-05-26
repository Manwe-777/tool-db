import getTimestamp from "../utils/getTimestamp";
import Block, { decodeBlock } from "./Block";
import isValidChain from "./isValidChain";
import { Transactions } from "./Tx";

import BN from "bn.js";

function sortTxs(a: Transactions, b: Transactions) {
  if (a.adress === b.adress) {
    if (a.nonce > b.nonce) return -1;
    if (a.nonce < b.nonce) return 1;
    return 0;
  }
  if (a.timestamp < b.timestamp) return -1;
  if (a.timestamp > b.timestamp) return 1;
  return 0;
}

export default class ToolChain {
  private _chain: string[] = [];

  private _noncesState: Record<string, number> = {};
  private _balancesState: Record<string, number> = {};
  private _namesState: Record<string, string> = {};
  private _dataState: Record<string, any> = {};

  public mempool: Record<string, Transactions> = {};

  private _lastBlockCalculated: number = 0;

  private _noncetest = 0;

  constructor(enableMiner: boolean) {
    this._chain = [Block.genesis().encode()];

    if (enableMiner) {
      // give it 10ms to breathe..
      setInterval(() => {
        this.mineLoop();
      }, 10);
    }
  }

  mineLoop() {
    const lastBlock = decodeBlock(this._chain[this._chain.length - 1]);
    const difficulty = this.calculateNewDifficulty();
    console.log("nonce:", this._noncetest);

    for (let i = 0; i < 1000000; i += 1) {
      this._noncetest += 1;
      const block = new Block(
        this._chain.length,
        new Date().getTime(),
        lastBlock.hash,
        Object.values(this.mempool),
        this._noncetest,
        difficulty
      );

      if (Block.verifyBlockData(block)) {
        console.log(
          "Time elapsed: " +
            (block.timestamp - lastBlock.timestamp) / 1000 +
            " seconds"
        );
        console.log("New block: ", {
          height: block.height,
          hash: block.hash,
          nonce: block.nonce,
          timestamp: block.timestamp,
          difficulty: block.difficulty,
        });
        this._chain.push(block.encode());
        i = 10000000;
        this._noncetest = 0;
      }
    }
  }

  calculateState() {
    this._chain.slice(this._lastBlockCalculated).forEach((block) => {
      const blockObj = decodeBlock(block);
      blockObj.data.sort(sortTxs).forEach((tx) => {
        this._noncesState[tx.adress] = tx.nonce;

        if (tx.type === "tx") {
          if (this._balancesState[tx.adress]) {
            this._balancesState[tx.adress] -= tx.amount;
            this._balancesState[tx.adress] -= tx.fee;
          }
          if (this._balancesState[tx.to]) {
            this._balancesState[tx.to] += tx.amount;
          } else {
            this._balancesState[tx.to] = tx.amount;
          }
        }

        if (tx.type === "name") {
          this._namesState[tx.name] = tx.adress;
        }

        if (tx.type === "put") {
          this._dataState[tx.key] = tx.data;
        }
      });
    });

    this._lastBlockCalculated = this._chain.length;

    return this._balancesState;
  }

  get balances() {
    return this._balancesState;
  }

  get names() {
    return this._namesState;
  }

  get datas() {
    return this._dataState;
  }

  get nonces() {
    return this._noncesState;
  }

  calculateNewDifficulty() {
    // 60 block per adjustment
    const EPOCH = 60;

    // Each block should be mined every 1 minute
    const BLOCK_TIME = 60 * 1000;

    const initBlockN =
      this._chain.length - 1 - ((this._chain.length - 1) % EPOCH);

    const initBlock = decodeBlock(this._chain[initBlockN]);

    const currentDifficulty = initBlock.difficulty;

    const lastTime = decodeBlock(this._chain[this._chain.length - 1]).timestamp;
    // let timesBetweenBlocks: number[] = [];
    // this._chain.slice(-EPOCH).forEach((block) => {
    //   const blockObj = decodeBlock(block);
    //   if (lastTime) {
    //     timesBetweenBlocks.push(blockObj.timestamp - lastTime);
    //   }
    //   lastTime = blockObj.timestamp;
    // });

    // const averageBlockTime =
    //   timesBetweenBlocks.reduce((p: number, c: number) => p + c, 0) /
    //   timesBetweenBlocks.length;

    const elapsed = lastTime - initBlock.timestamp;
    const adjustment = (BLOCK_TIME * EPOCH) / elapsed;

    console.warn(
      initBlockN,
      currentDifficulty,
      elapsed,
      this._chain.length % EPOCH
    );

    const diffBn = new BN(currentDifficulty, "hex");

    if (this._chain.length % EPOCH === 0) {
      console.warn(
        "elapsed:",
        elapsed,
        `Avg block found in ${Math.round(elapsed / EPOCH / 1000)} seconds`
      );
      console.warn("Adjustment multiplier:", adjustment);
    }

    return this._chain.length % EPOCH === 0
      ? diffBn.mul(new BN(adjustment, "le")).toString(16)
      : currentDifficulty;
  }

  pushBlock(block: Block) {
    if (this.isValidBlock(block)) {
      this._chain.push(block.encode());
      this.calculateState();
      return true;
    }
    return false;
  }

  replaceChain(newChain: string[]) {
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

  isValidBlock(block: Block) {
    const lastBlock = decodeBlock(this._chain[this._chain.length - 1]);
    /**
     * check hash
     * check last hash
     * check signatures
     */
    if (
      block.height === lastBlock.height + 1 &&
      block.lastHash === lastBlock.hash &&
      Block.verifyBlockData(block)
    ) {
      return true;
    } else {
      return false;
    }
  }
}
