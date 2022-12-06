import {
  ToolDb,
  VerifyResult,
  CrdtPutMessage,
  VerificationData,
  MapCrdt,
  MapChanges,
  CRDT_COUNTER,
  CRDT_LIST,
  CRDT_MAP,
  ListCrdt,
  ListChanges,
  CounterCrdt,
  CounterChanges,
} from "..";

import toolDbVerificationWrapper from "../toolDbVerificationWrapper";

export default function handleCrdtPut(
  this: ToolDb,
  message: CrdtPutMessage,
  remotePeerId: string
) {
  toolDbVerificationWrapper.call(this, message.data).then((value) => {
    // this.logger("Verification wrapper result: ", value, message.k);
    if (value === VerifyResult.Verified) {
      const finalMessage: CrdtPutMessage = {
        ...message,
        to: [...message.to, remotePeerId],
      };

      this.emit("crdtput", finalMessage);
      this.emit("data", finalMessage.data);
      this.emit("verified", finalMessage);
      // relay to other servers !!!
      this.network.sendToAll(finalMessage, true);

      this.store
        .get(finalMessage.data.k)
        .then((oldData) => {
          try {
            const parsedOldData: VerificationData<any> = JSON.parse(oldData);

            let newMessage = finalMessage;

            // Merge old document with new data incoming and save it
            // Add handles for all kinds of CRDT we add
            let oldDoc:
              | MapCrdt<any>
              | ListCrdt<any>
              | CounterCrdt<any>
              | undefined;

            if (parsedOldData.c === CRDT_MAP) {
              oldDoc = new MapCrdt(
                this.userAccount.getAddress() || "",
                parsedOldData.v
              );
            }

            if (parsedOldData.c === CRDT_LIST) {
              oldDoc = new ListCrdt(
                this.userAccount.getAddress() || "",
                parsedOldData.v
              );
            }

            if (parsedOldData.c === CRDT_COUNTER) {
              oldDoc = new CounterCrdt(
                this.userAccount.getAddress() || "",
                parsedOldData.v
              );
            }

            let changesMerged:
              | MapChanges<any>[]
              | ListChanges<any>[]
              | CounterChanges[] = [];

            if (oldDoc) {
              oldDoc.mergeChanges(finalMessage.data.v);
              changesMerged = oldDoc.getChanges();
            }
            newMessage = {
              ...finalMessage,
            };
            newMessage.data.v = changesMerged;

            if (parsedOldData.t < finalMessage.data.t) {
              const key = newMessage.data.k;
              this.triggerKeyListener(key, newMessage.data);
              this.store
                .put(newMessage.data.k, JSON.stringify(newMessage.data))
                .catch((e) => {
                  // do nothing
                });
            } else {
              const key = message.data.k;
              this.triggerKeyListener(key, parsedOldData);
            }
            // } else {
            //   this.logger(
            //     `${message.k} has old data, but its newer. old ${parsedOldData.t} < new ${message.t}`
            //   );
            // }
          } catch (e) {
            this.logger("Couldnt parse crdt data", oldData, e);
          }
        })
        .catch((e) => {
          const key = finalMessage.data.k;
          this.triggerKeyListener(key, finalMessage.data);
          this.store
            .put(finalMessage.data.k, JSON.stringify(finalMessage.data))
            .catch((e) => {
              // do nothing
            });
        });
    } else {
      this.logger("unverified message: ", value, message);
    }
  });
}
