import { ToolDb, VerificationData, textRandom } from ".";

/**
 * Helper to check for signup conflicts with peers.
 * This runs asynchronously after local signup completes and doesn't block the signup process.
 * Uses timestamps to determine which signup wins in case of conflicts.
 */
export default async function toolDbCheckSignupConflicts(
  this: ToolDb,
  userRoot: string,
  localSignup: VerificationData<any>,
  to?: string[]
): Promise<void> {
  // Wait a bit for network responses to come in
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check if we're connected to any peers
  if (!this.isConnected) {
    this.logger("No peers connected, skipping conflict check");
    return;
  }

  const msgId = textRandom(10);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      this.removeIdListener(msgId);
      // No response means no conflict found
      resolve();
    }, 2000);

    this.addIdListener(msgId, (msg) => {
      clearTimeout(timeout);
      this.removeIdListener(msgId);

      if (msg.type === "put" && msg.data) {
        const peerData = msg.data as VerificationData<any>;

        // Check if there's a conflict (same key, different address)
        if (peerData.a !== localSignup.a) {
          // Conflict detected! Compare timestamps
          if (peerData.t < localSignup.t) {
            // Peer's signup is older, they win
            reject(
              new Error(
                `Username conflict: peer registered first at ${new Date(
                  peerData.t
                ).toISOString()}`
              )
            );
            return;
          } else if (peerData.t > localSignup.t) {
            // Our signup is older, we win
            this.logger("Our signup is older, keeping our version");
            resolve();
            return;
          } else {
            // Same timestamp - use address comparison as tiebreaker
            if (localSignup.a < peerData.a) {
              // Our address is alphabetically first, we win
              this.logger(
                "Same timestamp, our address wins alphabetically"
              );
              resolve();
            } else {
              // Their address wins
              reject(
                new Error(
                  `Username conflict: peer's address wins tiebreaker`
                )
              );
            }
            return;
          }
        }
        // Same address, no conflict
        resolve();
      } else {
        // No data returned means no conflict
        resolve();
      }
    });

    // Send get request to check for existing registrations
    this.network.sendToAll({
      type: "get",
      to: to || [],
      key: userRoot,
      id: msgId,
    });
  });
}

