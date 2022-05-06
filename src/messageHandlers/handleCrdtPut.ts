import { ToolDb } from "..";
import { VerifyResult, CrdtPutMessage } from "../types/message";
import toolDbVerificationWrapper from "../toolDbVerificationWrapper";
import MapCrdt from "../crdt/mapCrdt";

export default function handleCrdtPut(
  this: ToolDb,
  message: CrdtPutMessage,
  remotePeerId: string
) {
  toolDbVerificationWrapper.call(this, message).then((value) => {
    // console.log("Verification wrapper result: ", value, message.k);
    if (value === VerifyResult.Verified) {
      this.emit("verified", message);
      // relay to other servers !!!
      this.network.sendToAll(message, true);

      this.store.get(message.k, (err, oldData?: string) => {
        if (oldData) {
          const parsedOldData: CrdtPutMessage = {
            type: "crdtPut",
            ...JSON.parse(oldData),
          };

          let newMessage = message;

          // Merge old document with new data incoming and save it
          // Add handles for all kinds of CRDT we add
          if (parsedOldData.crdt === "MAP") {
            const oldDoc = new MapCrdt(
              this.getAddress() || "",
              parsedOldData.v
            );
            oldDoc.mergeChanges(message.v);
            const changesMerged = oldDoc.getChanges();
            newMessage = {
              ...message,
              v: changesMerged,
            };
          }

          if (parsedOldData.t < message.t) {
            const key = newMessage.k;
            this.triggerKeyListener(key, newMessage);
            this.store.put(
              newMessage.k,
              JSON.stringify(newMessage),
              (err, data) => {
                //
              }
            );
          } else {
            const key = message.k;
            this.triggerKeyListener(key, parsedOldData);
          }
          // } else if (this.options.debug) {
          //   console.log(
          //     `${message.k} has old data, but its newer. old ${parsedOldData.t} < new ${message.t}`
          //   );
          // }
        } else {
          const key = message.k;
          this.triggerKeyListener(key, message);
          this.store.put(message.k, JSON.stringify(message), (err, data) => {
            //
          });
        }
      });
    } else {
      console.warn("unverified message: ", value, message);
    }
  });
}
