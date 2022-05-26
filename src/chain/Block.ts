import { sha256 } from "..";
import w3 from "web3";

import BN from "bn.js";

import { MerkleTree } from "merkletreejs";

import getTimestamp from "../utils/getTimestamp";
import { Transactions } from "./Tx";

export type BlockData = Transactions[];

const web3 = new w3(w3.givenProvider);

export function decodeBlock(encoded: string) {
  const arr = JSON.parse(encoded);

  return new Block(arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]);
}

export default class Block {
  private _timestamp = getTimestamp();

  private _lastHash: string;

  private _hash: string;

  private _data: BlockData = [];

  private _height: number;

  private _merkleRoot: string;

  private _nonce: number;

  private _difficulty: string;

  constructor(
    height: number,
    timestamp: number,
    lastHash: string,
    data: BlockData,
    nonce: number,
    difficulty: string
  ) {
    this._height = height;
    this._timestamp = timestamp;
    this._lastHash = lastHash;
    this._data = data;
    this._nonce = nonce;
    this._difficulty = difficulty;

    this._merkleRoot = Block.merkleRoot(this);
    this._hash = Block.blockHash(this);
  }

  encode() {
    return JSON.stringify([
      this._height,
      this._timestamp,
      this._lastHash,
      this._data,
      this._nonce,
      this._difficulty,
    ]);
  }

  get hash() {
    return this._hash;
  }

  get merkleRoot() {
    return this._merkleRoot;
  }

  get height() {
    return this._height;
  }

  get lastHash() {
    return this._lastHash;
  }

  get timestamp() {
    return this._timestamp;
  }

  get data() {
    return this._data;
  }

  get nonce() {
    return this._nonce;
  }

  get difficulty() {
    return this._difficulty;
  }

  static genesis() {
    const initDifficulty = new BN("ffffffff", "hex");

    return new this(
      0,
      getTimestamp(),
      "000000000000000000000000000000000000000000000000000000000000000000000000000000",
      [],
      0,
      initDifficulty.toString(16)
    );
  }

  static merkleRoot(block: Block) {
    const { data } = block;
    const leaves = data.map((v) => v.id);
    const tree = new MerkleTree(leaves, sha256);
    const root = tree.getRoot().toString("hex");

    return root;
  }

  static blockHash(block: Block) {
    const { height, nonce, merkleRoot } = block;
    return sha256(`${nonce}${height}${merkleRoot}`).toString();
  }

  static verifyBlockData(block: Block) {
    let isValid = true;

    block.data.forEach((tx) => {
      const verify = web3.eth.accounts.recover(tx.adress, tx.sig);
      if (verify !== tx.adress) isValid = false;
    });

    const hash = Block.blockHash(block);
    if (hash !== block.hash) isValid = false;

    const hashAsNumber = new BN(block.hash, "hex");
    // console.log("hash number", hashAsNumber.toString(16));

    const difficulty = new BN(block.difficulty, "hex");
    const ffff = new BN("ffff", "hex");

    const _2_254 = new BN(2, "le").pow(new BN(254, "le"));
    // const _2_256 = new BN(2, "le").pow(new BN(256, "le"));
    const _2_48 = new BN(2, "le").pow(new BN(48, "le"));
    // const _2_32 = new BN(2, "le").pow(new BN(32, "le"));

    // (0xffff * 2**254) / D
    const offset = ffff.mul(_2_254).div(difficulty);
    // console.log("offset", offset.toString(16));

    // D * 2**256 / (0xffff * 2**254)   or   D * 2**48 / 0xffff
    // const hashrate = difficulty.mul(_2_48).div(ffff);
    // console.log("hashrate", hashrate.toString(16));

    if (hashAsNumber.gte(offset)) isValid = false;

    return isValid;
  }
}
