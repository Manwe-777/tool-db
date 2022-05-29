import w3 from "web3";
import { Transactions } from "./chain/Tx";
import getTimestamp from "./utils/getTimestamp";
import sha256 from "./utils/sha256";

const web3 = new w3(w3.givenProvider);

const account = web3.eth.accounts.create();

const timestamp = getTimestamp();
const txid = sha256(account.address + timestamp + "put");

const tx: Transactions = {
  adress: account.address,
  id: txid,
  timestamp,
  sig: account.sign(txid).signature,
  type: "put",
  key: "testkey",
  nonce: 0,
  fee: 0,
  data: {
    message: "hello world",
  },
};

console.log(tx);
