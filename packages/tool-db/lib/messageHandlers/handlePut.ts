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
      const finalMessage: PutMessage = {
        ...message,
        to: [...message.to, remotePeerId],
      };

      this.network.sendToAll(finalMessage, true);

      this.store
        .get(finalMessage.data.k)
        .then((oldData) => {
          const parsedOldData = JSON.parse(oldData);
          
          // Check for username conflicts (same key, different address)
          const isUsernameKey = finalMessage.data.k.startsWith("==");
          if (isUsernameKey && parsedOldData.a !== finalMessage.data.a) {
            // Username conflict detected! Compare timestamps
            if (parsedOldData.t < finalMessage.data.t) {
              // Local data is older, it wins
              this.logger(
                `Username conflict detected: local signup is older, rejecting incoming data for ${finalMessage.data.k}`
              );
              this.emit("username-conflict-resolved", {
                username: finalMessage.data.k,
                winner: "local",
                localTimestamp: parsedOldData.t,
                remoteTimestamp: finalMessage.data.t,
                localAddress: parsedOldData.a,
                remoteAddress: finalMessage.data.a,
              });
              // Keep local data, don't update
              const key = finalMessage.data.k;
              this.triggerKeyListener(key, parsedOldData);
            } else if (parsedOldData.t > finalMessage.data.t) {
              // Incoming data is older, it wins
              this.logger(
                `Username conflict detected: remote signup is older, accepting incoming data for ${finalMessage.data.k}`
              );
              
              // Check if the losing address is the current user's address
              const currentUserAddress = this.userAccount?.getAddress();
              if (currentUserAddress === parsedOldData.a) {
                // The current user lost the username conflict!
                this.emit("current-user-lost-username", {
                  username: finalMessage.data.k.replace("==", ""),
                  timestamp: parsedOldData.t,
                  winnerTimestamp: finalMessage.data.t,
                  winnerAddress: finalMessage.data.a,
                });
              }
              
              this.emit("username-conflict-resolved", {
                username: finalMessage.data.k,
                winner: "remote",
                localTimestamp: parsedOldData.t,
                remoteTimestamp: finalMessage.data.t,
                localAddress: parsedOldData.a,
                remoteAddress: finalMessage.data.a,
              });
              // Replace with incoming data
              const key = finalMessage.data.k;
              this.triggerKeyListener(key, finalMessage.data);
              this.store
                .put(finalMessage.data.k, JSON.stringify(finalMessage.data))
                .catch((e) => {
                  // do nothing
                });
            } else {
              // Same timestamp - use address comparison as tiebreaker
              if (parsedOldData.a < finalMessage.data.a) {
                // Local address wins (alphabetically first)
                this.logger(
                  `Username conflict with same timestamp: local address wins for ${finalMessage.data.k}`
                );
                const key = finalMessage.data.k;
                this.triggerKeyListener(key, parsedOldData);
              } else {
                // Remote address wins
                this.logger(
                  `Username conflict with same timestamp: remote address wins for ${finalMessage.data.k}`
                );
                const key = finalMessage.data.k;
                this.triggerKeyListener(key, finalMessage.data);
                this.store
                  .put(finalMessage.data.k, JSON.stringify(finalMessage.data))
                  .catch((e) => {
                    // do nothing
                  });
              }
            }
          } else if (parsedOldData.t < finalMessage.data.t) {
            // Normal update: incoming data is newer
            const key = finalMessage.data.k;
            this.triggerKeyListener(key, finalMessage.data);
            this.store
              .put(finalMessage.data.k, JSON.stringify(finalMessage.data))
              .catch((e) => {
                // do nothing
              });
          } else {
            // Normal update: local data is newer or same
            const key = finalMessage.data.k;
            this.triggerKeyListener(key, parsedOldData);
          }
        })
        .catch((e) => {
          // No existing data, just store the new data
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
