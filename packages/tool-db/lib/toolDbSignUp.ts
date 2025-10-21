import {
  ToolDb,
  PutMessage,
  textRandom,
  VerificationData,
  proofOfWork,
  sha256,
} from ".";

/**
 * Local-first signup that doesn't depend on peer availability.
 * Checks local storage immediately, then asynchronously checks peers.
 * Uses timestamps to resolve conflicts when duplicate usernames are detected.
 */
export default async function toolDbSignUp(
  this: ToolDb,
  user: string,
  password: string,
  to?: string[]
): Promise<PutMessage<any>> {
  const userRoot = `==${user}`;
  
  return new Promise(async (resolve, reject) => {
    try {
      // Step 1: Check local storage immediately (synchronous check)
      let localData: VerificationData<any> | null = null;
      try {
        const stored = await this.store.get(userRoot);
        localData = JSON.parse(stored);
      } catch (e) {
        // No local data found, which is fine for signup
        localData = null;
      }

      // Step 2: If user exists locally, reject immediately
      if (localData !== null) {
        reject(new Error("User already exists locally!"));
        return;
      }

      // Step 3: Create the new user account immediately (don't wait for network)
      const account = new this.options.userAdapter(this);
      await account.anonUser(); // Ensure keys are generated
      
      const userData = await account.encryptAccount(sha256(password));
      const timestamp = new Date().getTime();
      const userDataString = `${JSON.stringify(
        userData
      )}${account.getAddress()}${timestamp}`;

      const { hash, nonce } = await proofOfWork(userDataString, 0);
      const signature = await account.signData(hash);

      const signupMessage: VerificationData = {
        k: userRoot,
        a: account.getAddress() || "",
        n: nonce,
        t: timestamp,
        h: hash,
        s: signature,
        v: userData,
        c: null,
      };

      this.logger("SIGNUP PUT", userRoot, signupMessage);

      const finalMsg = {
        type: "put",
        id: textRandom(10),
        to: to || [],
        data: signupMessage,
      } as PutMessage;

      // Step 4: Store locally first
      await this.store.put(userRoot, JSON.stringify(signupMessage));
      
      // Step 5: Broadcast to network (non-blocking)
      this.network.sendToAll(finalMsg);
      
      // Step 6: Asynchronously check peers for conflicts (don't block signup)
      this._checkSignupConflicts(userRoot, signupMessage, to).catch((err) => {
        this.logger("Signup conflict check warning:", err);
        // Emit event for conflict detection but don't fail signup
        this.emit("signup-conflict-detected", {
          username: user,
          localTimestamp: timestamp,
          error: err.message,
        });
      });

      resolve(finalMsg);
    } catch (error) {
      reject(error);
    }
  });
}
