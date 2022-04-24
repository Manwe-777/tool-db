import { sha256 } from "..";
import w3 from "web3";

import getTimestamp from "../utils/getTimestamp";
import { TxJson } from "./Tx";

export type BlockData = TxJson[];

const web3 = new w3(w3.givenProvider);

export default class Block {
  private _timestamp = getTimestamp();

  private _lastHash: string;

  private _hash: string;

  private _data: BlockData = [];

  private _validator: string;

  private _signature: string;

  constructor(
    timestamp: number,
    lastHash: string,
    hash: string,
    data: BlockData,
    validator: string,
    signature: string
  ) {
    this._timestamp = timestamp;
    this._lastHash = lastHash;
    this._hash = hash;
    this._data = data;
    this._validator = validator;
    this._signature = signature;
  }

  toString() {
    return `Block - 
        Timestamp : ${this._timestamp}
        Last Hash : ${this._lastHash}
        Hash      : ${this._hash}
        Data      : ${this._data}
        Validator : ${this._validator}
        Signature : ${this._signature}`;
  }

  get hash() {
    return this._hash;
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

  static genesis() {
    return new this(getTimestamp(), "0", "0", [], "0", "0");
  }

  static hash(timestamp: number, lastHash: string, data: BlockData) {
    // data should be a merkle root of all tx!
    return sha256(`${timestamp}${lastHash}${JSON.stringify(data)}`).toString();
  }

  static blockHash(block: Block) {
    const { timestamp, lastHash, data } = block;
    return Block.hash(timestamp, lastHash, data);
  }

  static createBlock(lastBlock: Block, data: BlockData) {
    const lastHash = lastBlock.hash;
    const time = getTimestamp();
    const hash = Block.hash(time, lastHash, data);
    return new this(time, lastHash, hash, data, "0", "0");
  }

  static verifyBlockData(block: Block) {
    let isValid = true;

    block.data.forEach((tx) => {
      const verify = web3.eth.accounts.recover(tx.txid, tx.sig);
      if (verify !== tx.from) isValid = false;
    });

    return isValid;
  }
}
