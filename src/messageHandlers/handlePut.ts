import { ToolDb } from "..";
import toolDbVerificationWrapper from "../toolDbVerificationWrapper";
import { PutMessage, VerifyResult } from "../types/message";

export default function handlePut(
  this: ToolDb,
  message: PutMessage,
  remotePeerId: string
) {
  toolDbVerificationWrapper.call(this, message.data).then((value) => {
    // console.log("Verification wrapper result: ", value, message.k);
    if (value === VerifyResult.Verified) {
      this.emit("put", message);
      this.emit("data", message.data);
      this.emit("verified", message);
      // relay to other servers !!!
      this.network.sendToAll(message, true);

      this.store.get(message.data.k, (err, oldData?: string) => {
        if (oldData) {
          const parsedOldData = JSON.parse(oldData);
          if (parsedOldData.t < message.data.t) {
            const key = message.data.k;
            this.triggerKeyListener(key, message.data);
            this.store.put(
              message.data.k,
              JSON.stringify(message.data),
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
