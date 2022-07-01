import { ToolDb, PutMessage, VerifyResult } from "..";

import toolDbVerificationWrapper from "../toolDbVerificationWrapper";

export default function handlePut(
  this: ToolDb,
  message: PutMessage,
  remotePeerId: string
) {
  toolDbVerificationWrapper.call(this, message.data).then((value) => {
    // this.logger("Verification wrapper result: ", value, message.k);
    if (value === VerifyResult.Verified) {
      this.emit("put", message);
      this.emit("data", message.data);
      this.emit("verified", message);
      // relay to other servers !!!
      this.network.sendToAll(message, true);

      this.store
        .get(message.data.k)
        .then((oldData) => {
          const parsedOldData = JSON.parse(oldData);
          if (parsedOldData.t < message.data.t) {
            const key = message.data.k;
            this.triggerKeyListener(key, message.data);
            this.store
              .put(message.data.k, JSON.stringify(message.data))
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
        })
        .catch((e) => {
          const key = message.data.k;
          this.triggerKeyListener(key, message.data);
          this.store
            .put(message.data.k, JSON.stringify(message.data))
            .catch((e) => {
              //
            });
        });
    } else {
      this.logger("unverified message: ", value, message);
    }
  });
}
