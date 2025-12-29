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
 * Checks local storage immediately, then asynchronously checks peers for conflicts.
 * Uses timestamps to resolve conflicts when duplicate usernames are detected.
 *
 * @param user Username to register
 * @param password Password to encrypt the account
 * @param to Optional array of peer IDs to send to
 * @returns Promise that resolves with the PutMessage on success
 */
export default async function toolDbSignUp(
  this: ToolDb,
  user: string,
  password: string,
  to?: string[]
): Promise<PutMessage<any>> {
  const userRoot = `==${user}`;

  // Step 1: Check local storage immediately
  let localData: VerificationData<any> | null = null;
  try {
    const stored = await this.store.get(userRoot);
    localData = JSON.parse(stored);
  } catch (_e) {
    // No local data found, which is expected for new signup
    localData = null;
  }

  // Step 2: If user exists locally, reject immediately
  if (localData !== null) {
    throw new Error("User already exists locally!");
  }

  // Step 3: Create the new user account
  // The account already has keys generated in the constructor
  const account = new this.options.userAdapter(this);

  const userData = await account.encryptAccount(sha256(password));
  const timestamp = new Date().getTime();
  const userDataString = `${JSON.stringify(
    userData
  )}${account.getAddress()}${timestamp}`;

  // Use configured PoW difficulty
  const { hash, nonce } = await proofOfWork(userDataString, this.options.pow);
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

  // Step 4: Store locally first (local-first approach)
  await this.store.put(userRoot, JSON.stringify(signupMessage));

  // Step 5: Broadcast to network (non-blocking)
  this.network.sendToAll(finalMsg);

  // Step 6: Asynchronously check peers for conflicts (don't block signup)
  // This runs in the background and emits events if conflicts are found
  this._checkSignupConflicts(userRoot, signupMessage, to).catch((err) => {
    this.logger("Signup conflict check warning:", err.message);
    // Emit event for conflict detection - UI can react to this
    this.emit("signup-conflict-detected", {
      username: user,
      localTimestamp: timestamp,
      error: err.message,
    });
  });

  return finalMsg;
}
