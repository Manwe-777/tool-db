import ToolChain from "./ToolChain";

type TxType = "tx" | "put" | "name";

import w3 from "web3";
import sha256 from "../utils/sha256";

export interface TxBase {
  timestamp: number;
  type: TxType;
  /**
   * Adress that sent the transaction, owner
   */
  adress: string;
  /**
   * ID/Hash, should be unique per transaction (a hash of the owner + timestamp + type)
   */
  id: string;
  /**
   * Signature of the id, signed by the owner
   */
  sig: string;
  /**
   * Nonce, or ordinal number of transaction for this adress
   */
  nonce: number;
  /**
   * Amount of tokens for the miner
   */
  fee: number;
}

export interface TxSend extends TxBase {
  type: "tx";
  to: string;
  amount: number;
}

export interface TxPut extends TxBase {
  type: "put";
  key: string;
  data: any;
}

export interface TxName extends TxBase {
  type: "name";
  name: string;
}

export type Transactions = TxSend | TxPut | TxName;

const web3 = new w3(w3.givenProvider);

/**
 * Validate a new transaction against the latest state of the chain
 */
export function validateNewTransaction(tx: Transactions, chain: ToolChain) {
  if (tx.fee > chain.balances[tx.adress] || 0) return -1;

  if (tx.nonce <= chain.nonces[tx.adress] || -1) return -2;

  if (tx.type === "tx") {
    if (tx.fee + tx.amount > chain.balances[tx.adress] || 0) return -3;
  }

  return validateTransactionData(tx);
}

/**
 * Validate a transaction's data, regardless of the chain state
 */
export function validateTransactionData(tx: Transactions) {
  const hash = sha256(tx.adress + tx.timestamp + tx.type);
  if (hash !== tx.id) return -4;

  const verify = web3.eth.accounts.recover(tx.adress, tx.sig);
  if (!verify) return -5;

  if (tx.type === "put") {
    if (tx.key.length > 128) return -6;

    let s = "";
    try {
      s = JSON.stringify(tx.data);
    } catch (e) {
      return -7;
    }

    if (s.length > 2048) return -8;
  }

  if (tx.type === "name") {
    if (tx.name.length > 64) return -9;
  }
}
