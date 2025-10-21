import { ToolDb, VerificationData, textRandom } from ".";

/**
 * Helper to check for signup conflicts with peers.
 * This runs asynchronously and doesn't block the signup process.
 */
export default async function toolDbCheckSignupConflicts(
  this: ToolDb,
  userRoot: string,
  localSignup: VerificationData<any>,
  to?: string[]
): Promise<void> {
  // Wait a bit for network to respond
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Check if we're connected to any peers
  if (!this.isConnected) {
    this.logger("No peers connected, skipping conflict check");
    return;
  }

  // Send a get request to check for conflicts
  const msgId = textRandom(10);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      this.removeIdListener(msgId);
      resolve(); // No response means no conflict
    }, 2000);

    this.addIdListener(msgId, (msg) => {
      clearTimeout(timeout);
      
      if (msg.type === "put" && msg.data) {
        const peerData = msg.data as VerificationData<any>;
        
        // Check if there's a conflict (same username, different address)
        if (peerData.a !== localSignup.a) {
          // Conflict detected! Compare timestamps
          if (peerData.t < localSignup.t) {
            // Peer's signup is older, they win
            reject(new Error(
              `Username conflict: peer registered first at ${new Date(peerData.t).toISOString()}`
            ));
          } else {
            // Our signup is older, we win
            this.logger("Our signup is older, keeping our version");
            resolve();
          }
        } else {
          // Same address, no conflict
          resolve();
        }
      } else {
        resolve();
      }
    });

    this.network.sendToAll({
      type: "get",
      to: to || [],
      key: userRoot,
      id: msgId,
    });
  });
}

