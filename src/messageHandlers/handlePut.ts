import { PutMessage, ToolDb, VerifyResult } from "..";
import toolDbVerificationWrapper from "../toolDbVerificationWrapper";

export default function handlePut(
  this: ToolDb,
  message: PutMessage,
  remotePeerId: string
) {
  toolDbVerificationWrapper.call(this, message).then((value) => {
    // console.log("Verification wrapper result: ", value, message.k);
    if (value === VerifyResult.Verified) {
      // relay to other servers !!!
      this.network.sendToAll(message, true);

      this.store.get(message.k, (err, oldData?: string) => {
        if (oldData) {
          const parsedOldData: PutMessage = {
            type: "put",
            ...JSON.parse(oldData),
          };
          if (parsedOldData.t < message.t) {
            const key = message.k;
            this.triggerKeyListener(key, message);
            this.store.put(message.k, JSON.stringify(message), (err, data) => {
              //
            });
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
