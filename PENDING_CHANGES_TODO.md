# Pending Changes from `many-stuffs` Branch

> **Purpose:** This document describes changes from the `many-stuffs` branch that are NOT yet on `main` and are worth implementing. Use this as a task list for granular implementation.

---

## Task 1: Local-First Signup Architecture

### What It Does
Transforms `signUp()` from a network-blocking operation to a local-first operation:
- **Before:** Signup waits up to 3 seconds for network to confirm username isn't taken
- **After:** Signup completes instantly using local storage, then async checks peers for conflicts

### Value
- Instant signup even when offline
- Better UX - no waiting for network
- Still handles conflicts when peers eventually sync using timestamp-based resolution

### Files to Create/Modify

#### 1.1 Create `packages/tool-db/lib/toolDbCheckSignupConflicts.ts`

```typescript
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
```

#### 1.2 Modify `packages/tool-db/lib/toolDbSignUp.ts`

Replace the existing implementation with local-first approach:

```typescript
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
```

#### 1.3 Update `packages/tool-db/lib/tooldb.ts`

Add import and method binding:

```typescript
// Add import at top
import toolDbCheckSignupConflicts from "./toolDbCheckSignupConflicts";

// Add method binding in class body (after verify)
public _checkSignupConflicts = toolDbCheckSignupConflicts;
```

---

## Task 2: Username Conflict Resolution in handlePut

### What It Does
Server-side conflict resolution when receiving username registrations (`==username` keys):
- Detects when two different addresses registered the same username
- Resolves using timestamps (oldest wins)
- Emits events for UI to react to conflicts

### Value
- CRDT-style eventual consistency for usernames
- Clear events for UI handling when a user "loses" their username
- Deterministic resolution using timestamp + address tiebreaker

### Files to Modify

#### 2.1 Modify `packages/tool-db/lib/messageHandlers/handlePut.ts`

Replace the `store.get().then()` section with conflict-aware logic:

```typescript
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
```

---

## Task 3: ToolDb Lifecycle API (`ready` / `close()`)

### What It Does
Adds proper async initialization and cleanup:
- `tooldb.ready` - Promise that resolves when DB is fully initialized
- `tooldb.close()` - Properly closes stores to prevent resource leaks

### Value
- Prevents race conditions during initialization
- Proper cleanup for tests and production
- Await initialization before using the database

### Files to Modify

#### 3.1 Modify `packages/tool-db/lib/tooldb.ts`

Add these properties and methods to the class:

```typescript
// Add private property
private _initPromise: Promise<void>;
private _peerStore!: ToolDbStorageAdapter;

// Add getter
get ready(): Promise<void> {
  return this._initPromise;
}

// Add close method
public async close(): Promise<void> {
  // Close the main store
  if (this._store && typeof (this._store as any).close === 'function') {
    await (this._store as any).close();
  }
  // Close the peer store (used for keys)
  if (this._peerStore && typeof (this._peerStore as any).close === 'function') {
    await (this._peerStore as any).close();
  }
}
```

Update the constructor to use async initialization:

```typescript
constructor(options: Partial<ToolDbOptions> = {}) {
  super();
  this._options = { ...this.options, ...options };

  this._store = new this.options.storageAdapter(this);
  this._peerAccount = new this.options.userAdapter(this);
  this._userAccount = new this.options.userAdapter(this);

  const DEFAULT_KEYS = "%default-peer%";
  const DEFAULT_USER_KEYS = "%default-user%";

  // DO NOT USE THE DEFAULT STORE FOR KEYS
  this._peerStore = new this.options.storageAdapter(
    this,
    "_____peer_" + this.options.storageName
  );

  // Initialize peer account and user account before network
  this._initPromise = this._initializeAccounts(this._peerStore, DEFAULT_KEYS, DEFAULT_USER_KEYS);

  // Network initialization happens after user initialization
  this._initPromise = this._initPromise
    .then(() => {
      this._network = new this.options.networkAdapter(this);
    })
    .catch((err) => {
      this.logger("Failed to initialize network", err);
      throw err;
    });
}

private async _initializeAccounts(
  tempStore: ToolDbStorageAdapter,
  peerKey: string,
  userKey: string
): Promise<void> {
  // Initialize peer account
  try {
    const val = await tempStore.get(peerKey);
    const account = await this.peerAccount.decryptAccount(JSON.parse(val), peerKey);
    await this.peerAccount.setUser(account, randomAnimal());
  } catch (_e) {
    await this.peerAccount.anonUser();
    const encrypted = await this.peerAccount.encryptAccount(peerKey);
    try {
      await tempStore.put(peerKey, JSON.stringify(encrypted));
    } catch (_putError) {
      // Ignore storage errors
    }
  }

  // Initialize user account - check if there's a saved user
  try {
    const userVal = await tempStore.get(userKey);
    const userAccount = await this.userAccount.decryptAccount(JSON.parse(userVal), userKey);
    await this.userAccount.setUser(userAccount, userAccount.name || randomAnimal());
  } catch (_e) {
    // No saved user, generate anonymous user
    await this.userAccount.anonUser();
  }

  // Emit init event after both accounts are ready
  this.emit("init", this.userAccount.getAddress());
}
```

---

## Task 4: LevelDB Store `close()` Method

### What It Does
Adds a `close()` method to properly close the LevelDB database.

### Value
- Prevents resource leaks
- Required for `tooldb.close()` to work
- Prevents LOCK file issues in tests

### Files to Modify

#### 4.1 Modify `packages/leveldb-store/lib/index.ts`

Add the close method if not present:

```typescript
public async close() {
  await this.waitForReady();
  
  return new Promise<void>((resolve, reject) => {
    this.database.close((err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
```

---

## Task 5: Tests for Signup Conflict Resolution

### What It Does
Comprehensive test suite for local-first signup and conflict resolution.

### Value
- Ensures the new behavior works correctly
- Documents expected behavior
- Catches regressions

### Files to Create

#### 5.1 Create `__tests__/signup-conflict-test.ts`

See the test file content in the branch. Key test cases:
1. `should allow instant signup without network connection`
2. `should reject duplicate signup on same peer`
3. `should resolve username conflicts based on timestamp when peers sync`
4. `should emit event when current user loses username conflict`
5. `should handle signup with peers present seamlessly`

---

## Implementation Order

1. **Task 3** (Lifecycle API) - Foundation for everything else
2. **Task 4** (LevelDB close) - Required for lifecycle to work
3. **Task 1** (Local-first signup) - Core feature
4. **Task 2** (handlePut conflicts) - Server-side resolution
5. **Task 5** (Tests) - Verify it all works

---

## Events Added

These new events should be documented:

| Event | Payload | When Emitted |
|-------|---------|--------------|
| `signup-conflict-detected` | `{ username, localTimestamp, error }` | After async conflict check finds a conflict |
| `username-conflict-resolved` | `{ username, winner, localTimestamp, remoteTimestamp, localAddress, remoteAddress }` | When handlePut resolves a username conflict |
| `current-user-lost-username` | `{ username, timestamp, winnerTimestamp, winnerAddress }` | When the currently signed-in user's username was taken by someone else |

---

## Notes

- The PoW difficulty is set to 0 in the new signup (was `this.options.pow`). Consider if this is intentional.
- The conflict check uses a 500ms initial delay and 2000ms timeout. These may need tuning.
- Username keys are identified by the `==` prefix (e.g., `==username`).

