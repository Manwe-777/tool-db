import { ToolDb } from "..";
import { VerifyResult, CrdtPutMessage } from "../types/message";
import toolDbVerificationWrapper from "../toolDbVerificationWrapper";
import MapCrdt, { MapChanges } from "../crdt/mapCrdt";
import { CRDT_COUNTER, CRDT_LIST, CRDT_MAP } from "../crdt/baseCrdt";
import ListCrdt, { ListChanges } from "../crdt/listCrdt";
import CounterCrdt, { CounterChanges } from "../crdt/counterCrdt";

export default function handleCrdtPut(
  this: ToolDb,
  message: CrdtPutMessage,
  remotePeerId: string
) {
  toolDbVerificationWrapper.call(this, message.data).then((value) => {
    // console.log("Verification wrapper result: ", value, message.k);
    if (value === VerifyResult.Verified) {
      this.emit("crdtput", message);
      this.emit("data", message.data);
      this.emit("verified", message);
      // relay to other servers !!!
      this.network.sendToAll(message, true);

      this.store.get(message.data.k, (err, oldData?: string) => {
        if (oldData) {
          const parsedOldData = JSON.parse(oldData);

          let newMessage = message;

          // Merge old document with new data incoming and save it
          // Add handles for all kinds of CRDT we add
          let oldDoc:
            | MapCrdt<any>
            | ListCrdt<any>
            | CounterCrdt<any>
            | undefined;

          if (parsedOldData.crdt === CRDT_MAP) {
            oldDoc = new MapCrdt(this.getAddress() || "", parsedOldData.v);
          }

          if (parsedOldData.crdt === CRDT_LIST) {
            oldDoc = new ListCrdt(this.getAddress() || "", parsedOldData.v);
          }

          if (parsedOldData.crdt === CRDT_COUNTER) {
            oldDoc = new CounterCrdt(this.getAddress() || "", parsedOldData.v);
          }

          let changesMerged:
            | MapChanges<any>[]
            | ListChanges<any>[]
            | CounterChanges[] = [];

          if (oldDoc) {
            oldDoc.mergeChanges(message.data.v);
            changesMerged = oldDoc.getChanges();
          }
          newMessage = {
            ...message,
          };
          newMessage.data.v = changesMerged;

          if (parsedOldData.t < message.data.t) {
            const key = newMessage.data.k;
            this.triggerKeyListener(key, newMessage.data);
            this.store.put(
              newMessage.data.k,
              JSON.stringify(newMessage.data),
              (err, data) => {
                //
              }
            );
          } else {
            const key = message.data.k;
            this.triggerKeyListener(key, parsedOldData);
          }
          // } else if (this.options.debug) {
          //   console.log(
          //     `${message.k} has old data, but its newer. old ${parsedOldData.t} < new ${message.t}`
          //   );
          // }
        } else {
          const key = message.data.k;
          this.triggerKeyListener(key, message.data);
          this.store.put(
            message.data.k,
            JSON.stringify(message.data),
            (err, data) => {
              //
            }
          );
        }
      });
    } else {
      console.warn("unverified message: ", value, message);
    }
  });
}
