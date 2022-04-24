import { sha256 } from "..";
import { Account } from "web3-core";

import getTimestamp from "../utils/getTimestamp";

export interface TxJson {
  from: string;
  to: string;
  timestamp: number;
  amount: number;
  nonce: number;
  datahash: string;
  txid: string;
  sig: string;
}

export default class Tx {
  private _timestamp = getTimestamp();

  private _txid: string;
  private _datahash: string;

  private _nonce: number;

  private _data: string = "";

  private _signature: string;

  private _sender: string;

  private _receiver: string;
  private _ammount: number;

  constructor(from: Account, to: string, data: string, ammount: number) {
    this._timestamp = getTimestamp();

    this._nonce = 1;

    this._datahash = sha256(data);
    this._txid = sha256("" + from + to + this._datahash + this._nonce);
    this._sender = from.address;

    this._receiver = to;
    this._ammount = ammount;

    this._data = data;

    this._signature = from.sign(this._txid).signature;
  }

  get timestamp() {
    return this._timestamp;
  }

  get ammount() {
    return this._ammount;
  }

  get data() {
    return this._data;
  }

  get sender() {
    return this._sender;
  }

  get receiver() {
    return this._receiver;
  }

  get verify() {
    return this._receiver;
  }

  get txid() {
    return this._txid;
  }

  toJson(): TxJson {
    return {
      from: this._sender,
      to: this._receiver,
      amount: this._ammount,
      timestamp: this._timestamp,
      nonce: this._nonce,
      datahash: this._datahash,
      txid: this._txid,
      sig: this._signature,
    };
  }

  static sortTx(a: Tx, b: Tx) {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    if (a.txid < b.txid) return -1;
    if (a.txid > b.txid) return 1;
    return 0;
  }

  static sortTxJson(a: TxJson, b: TxJson) {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    if (a.txid < b.txid) return -1;
    if (a.txid > b.txid) return 1;
    return 0;
  }

  static fn() {
    return "";
  }
}
