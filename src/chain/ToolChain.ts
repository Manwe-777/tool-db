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

  /**
   * Simple loop to mine new blocks
   * This is not meant for real world usage!
   */
  mineLoop() {
    const lastBlock = decodeBlock(this._chain[this._chain.length - 1]);
    const difficulty = this.calculateNewDifficulty();
    console.log("nonce:", this._noncetest);

    const block = new Block(
      this._chain.length,
      new Date().getTime(),
      lastBlock.hash,
      Object.values(this.mempool),
      this._noncetest,
      difficulty
    );

    for (let i = 0; i < 1000000; i += 1) {
      this._noncetest += 1;

      block.nonce = this._noncetest;

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
          data: block.data,
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

    // Adapt POW every 10 minutes
    const ADAPTIVE_POW_TIME = 60 * 1000 * 10;

    // Get the first block in this epoch, with new difficulty
    const initBlockN =
      this._chain.length - 1 - ((this._chain.length - 1) % EPOCH);
    const initBlock = decodeBlock(this._chain[initBlockN]);

    // Difficulty of the epoch
    const currentDifficulty = initBlock.difficulty;

    // Last block timestamp
    const lastTime = decodeBlock(this._chain[this._chain.length - 1]).timestamp;

    // Get the multiplier
    const elapsed = lastTime - initBlock.timestamp;
    const adjustment = (BLOCK_TIME * EPOCH) / elapsed;

    // console.warn(
    //   initBlockN,
    //   currentDifficulty,
    //   elapsed,
    //   this._chain.length % EPOCH
    // );

    // Dont divide by zero
    if (elapsed === 0) return currentDifficulty;

    // Convert to hex
    const diffBn = new BN(currentDifficulty, "hex");

    // Multiply adjustment * 1000
    // Not sure if there is a better way to make float multiplication in bn.js
    const adjustmentBn = new BN(Math.round(adjustment * 1000), "le");
    const _1000Bn = new BN(1000, "le");

    // Divide by 1000 (float point fix)
    let newDiff = diffBn.mul(adjustmentBn).div(_1000Bn);

    /**
     * Adaptive proof of work
     * This will fix the instance in which a poweful miner, or a group of miners
     * leave the network, either by a diff stranding attack or just coincidence.
     * The difficulty will decreased based on the delay there is to create a new block
     * Every "APoW time" will cause the difficulty to drop 50%
     * The APoW time should be a lot more than the average block time, 10x should be good
     */
    const apowValue = Math.floor(elapsed / ADAPTIVE_POW_TIME);
    if (apowValue > 0) {
      // Adaptive POW adjustment
      const _2Bn = new BN(2, "le");
      // Divide by 2 for each factor of apow
      // over 10 mins = x / 2
      // over 20 mins = x / 2 / 2
      // over 30 mins = x / 2 / 2 / 2 (etc)
      for (let ii = 0; ii < apowValue; ii += 1) {
        newDiff = newDiff.div(_2Bn);
      }
    }

    const newDiffHex = newDiff.toString(16);

    if (apowValue > 0) {
      console.warn("APoW triggered: x", apowValue);
      console.warn("Base adjustment multiplier:", adjustment);
    }
    if (this._chain.length % EPOCH === 0) {
      console.warn(
        "elapsed:",
        elapsed,
        `Avg block found in ${Math.round(elapsed / EPOCH / 1000)} seconds`
      );
      console.warn("Adjustment multiplier:", adjustment);
    }

    // Recalculate difficulty for every 60th block (one epoch) or if apow is triggered
    return this._chain.length % EPOCH === 0 || apowValue > 0
      ? newDiffHex
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
