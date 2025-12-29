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
          const key = finalMessage.data.k;

          // Check for username conflicts (same key, different address)
          const isUsernameKey = key.startsWith("==");
          if (isUsernameKey && parsedOldData.a !== finalMessage.data.a) {
            // Username conflict detected! Compare timestamps
            if (parsedOldData.t < finalMessage.data.t) {
              // Local data is older, it wins - keep local data
              this.logger(
                `Username conflict detected: local signup is older, rejecting incoming data for ${key}`
              );
              this.emit("username-conflict-resolved", {
                username: key,
                winner: "local",
                localTimestamp: parsedOldData.t,
                remoteTimestamp: finalMessage.data.t,
                localAddress: parsedOldData.a,
                remoteAddress: finalMessage.data.a,
              });
              this.triggerKeyListener(key, parsedOldData);
            } else if (parsedOldData.t > finalMessage.data.t) {
              // Incoming data is older, it wins - replace local data
              this.logger(
                `Username conflict detected: remote signup is older, accepting incoming data for ${key}`
              );

              // Check if the losing address is the current user's address
              const currentUserAddress = this.userAccount?.getAddress();
              if (currentUserAddress && currentUserAddress === parsedOldData.a) {
                // The current user lost the username conflict!
                this.emit("current-user-lost-username", {
                  username: key.replace("==", ""),
                  timestamp: parsedOldData.t,
                  winnerTimestamp: finalMessage.data.t,
                  winnerAddress: finalMessage.data.a,
                });
              }

              this.emit("username-conflict-resolved", {
                username: key,
                winner: "remote",
                localTimestamp: parsedOldData.t,
                remoteTimestamp: finalMessage.data.t,
                localAddress: parsedOldData.a,
                remoteAddress: finalMessage.data.a,
              });

              this.triggerKeyListener(key, finalMessage.data);
              this.store
                .put(key, JSON.stringify(finalMessage.data))
                .catch(() => {
                  // do nothing
                });
            } else {
              // Same timestamp - use address comparison as tiebreaker (alphabetically first wins)
              if (parsedOldData.a < finalMessage.data.a) {
                // Local address wins (alphabetically first)
                this.logger(
                  `Username conflict with same timestamp: local address wins for ${key}`
                );
                this.emit("username-conflict-resolved", {
                  username: key,
                  winner: "local",
                  localTimestamp: parsedOldData.t,
                  remoteTimestamp: finalMessage.data.t,
                  localAddress: parsedOldData.a,
                  remoteAddress: finalMessage.data.a,
                });
                this.triggerKeyListener(key, parsedOldData);
              } else {
                // Remote address wins
                this.logger(
                  `Username conflict with same timestamp: remote address wins for ${key}`
                );

                // Check if current user lost
                const currentUserAddress = this.userAccount?.getAddress();
                if (currentUserAddress && currentUserAddress === parsedOldData.a) {
                  this.emit("current-user-lost-username", {
                    username: key.replace("==", ""),
                    timestamp: parsedOldData.t,
                    winnerTimestamp: finalMessage.data.t,
                    winnerAddress: finalMessage.data.a,
                  });
                }

                this.emit("username-conflict-resolved", {
                  username: key,
                  winner: "remote",
                  localTimestamp: parsedOldData.t,
                  remoteTimestamp: finalMessage.data.t,
                  localAddress: parsedOldData.a,
                  remoteAddress: finalMessage.data.a,
                });

                this.triggerKeyListener(key, finalMessage.data);
                this.store
                  .put(key, JSON.stringify(finalMessage.data))
                  .catch(() => {
                    // do nothing
                  });
              }
            }
          } else if (parsedOldData.t < finalMessage.data.t) {
            // Normal update: incoming data is newer
            this.triggerKeyListener(key, finalMessage.data);
            this.store
              .put(key, JSON.stringify(finalMessage.data))
              .catch(() => {
                // do nothing
              });
          } else {
            // Normal update: local data is newer or same
            this.triggerKeyListener(key, parsedOldData);
          }
        })
        .catch(() => {
          // No existing data - just store the incoming data
          const key = message.data.k;
          this.triggerKeyListener(key, message.data);
          this.store
            .put(message.data.k, JSON.stringify(message.data))
            .catch(() => {
              //
            });
        });
    } else {
      this.logger("unverified message: ", value, message);
    }
  });
}
