# Race Condition Fix - Complete Analysis

## The Problem

Commit `2ecd4dca8a6a691d90db510f788adb9799f566a6` attempted to fix a race condition by making `setUser()` properly asynchronous. However, **the fix was incomplete** because `anonUser()` was not updated to return a promise.

### What the Original Commit Fixed ✅

1. **Changed `setUser()` from `void` to `Promise<void>`** across all user adapters
2. **Added proper promise chaining** in `toolDbKeysSignIn()` and `toolDbSignIn()`
3. **Fixed EcdsaUser.setUser()** to properly await `pubkeyToBase64()` before resolving

### What Was Missing ❌

The `anonUser()` method in `packages/ecdsa-user/lib/index.ts` was still synchronous (returned `void`):

```typescript
public anonUser() {
  generateKeysComb().then((keys) => {
    pubkeyToBase64(keys.publicKey as CryptoKey).then((rawPublic) => {
      this._keys = keys;
      this._address = rawPublic;
      this._username = randomAnimal();
    });
  });
}
```

This method kicked off async operations but didn't return a promise, so callers couldn't wait for completion.

### The Race Condition in the Demo

In `demo/app/page.tsx` (line 58):

```typescript
toolDb.anonSignIn(); // Not awaited!
const address = toolDb.userAccount.getAddress(); // Might be undefined!
const username = toolDb.userAccount.getUsername(); // Might be undefined!
```

**What happened:**

1. `anonSignIn()` calls `anonUser()` which starts async key generation
2. Control returns immediately (void function)
3. `getAddress()` and `getUsername()` are called before keys are generated
4. Result: `address` and `username` could be `undefined`

## The Complete Fix

### 1. Made `anonUser()` Return a Promise

**`packages/ecdsa-user/lib/index.ts`:**

```typescript
public anonUser(): Promise<void> {
  return generateKeysComb().then((keys) => {
    return pubkeyToBase64(keys.publicKey as CryptoKey).then((rawPublic) => {
      this._keys = keys;
      this._address = rawPublic;
      this._username = randomAnimal();
    });
  });
}
```

**`packages/tool-db/lib/adapters-base/userAdapter.ts`:**

```typescript
public anonUser(): Promise<void> {
  return Promise.resolve();
}
```

**`packages/web3-user/lib/index.ts`:**

```typescript
public anonUser(): Promise<void> {
  this._user = this.web3.eth.accounts.create();
  this._userName = randomAnimal();
  return Promise.resolve();
}
```

### 2. Made `anonSignIn()` Return a Promise

**`packages/tool-db/lib/toolDbAnonSignIn.ts`:**

```typescript
export default function toolDbAnonSignIn(this: ToolDb): Promise<void> {
  return this.userAccount.anonUser();
}
```

### 3. Updated the Demo to Await `anonSignIn()`

**`demo/app/page.tsx`:**

```typescript
// Sign in anonymously
await toolDb.anonSignIn(); // Now properly awaited!
const address = toolDb.userAccount.getAddress();
const username = toolDb.userAccount.getUsername();
```

### 4. Added Error Handling in Constructor

**`packages/tool-db/lib/tooldb.ts`:**

```typescript
// Initialize userAccount with anonymous keys (will be replaced on signIn)
this._userAccount.anonUser().catch(() => {
  // Ignore errors during initialization
});
```

## Testing the Fix

To verify the fix works:

1. Build the packages:

   ```bash
   npm run build
   ```

2. Run the demo:

   ```bash
   npm run demo
   ```

3. Check that:
   - User address displays correctly on page load
   - Username displays correctly on page load
   - No `undefined` values appear in the UI
   - CRDTs initialize with the correct user address

## Additional Issues Found and Fixed

### Issue #2: PeerAccount Not Initialized

The `peerAccount` (used for network ping/pong) was not being initialized properly:

**Problem in `packages/tool-db/lib/tooldb.ts` (line 336):**

```typescript
.catch((_e) => {
  // No existing peer account - create one
  this.peerAccount.encryptAccount(DEFAULT_KEYS).then((a) => {
    // ERROR: peerAccount has NO KEYS yet!
  });
});
```

When no stored peer account exists, the code tried to encrypt an account with no keys. In `ecdsa-user/lib/index.ts`, `encryptAccount()` recursively waits for keys (lines 133-136), causing an infinite wait.

**Fix:**

```typescript
.catch((_e) => {
  // No existing peer account - generate new keys first
  this.peerAccount.anonUser().then(() => {
    return this.peerAccount.encryptAccount(DEFAULT_KEYS).then((a) => {
      // Now keys exist!
    });
  });
});
```

### Issue #3: Network Connecting Before PeerAccount Ready

The network adapters tried to connect immediately in their constructors, before `peerAccount` keys were ready:

**Problems:**

- `packages/websocket-network/lib/index.ts` (line 45): Called `connectTo()` immediately
- `packages/webrtc-network/lib/index.ts` (line 442): Called `announceAll()` immediately
- Both call `craftPingMessage()` which needs `peerAccount.getAddress()` → undefined!

**Fix:**
Wrapped connection attempts in `tooldb.once("init", ...)` to wait for peerAccount initialization:

```typescript
// Websocket
this.tooldb.once("init", () => {
  this.tooldb.options.peers.forEach((p) => {
    this.connectTo(p.host, p.port);
  });
});

// WebRTC
this.tooldb.once("init", () => {
  if (Object.keys(this.peerMap).length < maxPeers) {
    this.announceAll();
  }
});
```

## Summary

The original commit was on the right track but incomplete. Three separate race conditions were fixed:

1. **User Sign-in Race**: Made `anonUser()`, `setUser()`, and `anonSignIn()` properly async

   - Pattern: `anonUser()` → `Promise<void>` (async key generation)
   - Pattern: `setUser()` → `Promise<void>` (async key import)
   - Pattern: `anonSignIn()` → `Promise<void>` (returns `anonUser()` promise)
   - Demo awaits sign-in before using user data

2. **PeerAccount Creation Race**: Added `anonUser()` call before encrypting new peer accounts

   - PeerAccount must generate keys before encryption
   - Prevents infinite wait in `encryptAccount()`

3. **Network Connection Race**: Delayed network connections until "init" event
   - WebSocket and WebRTC now wait for peerAccount keys
   - Prevents `craftPingMessage()` from using undefined address
   - Ensures proper peer identification during connection

All three fixes ensure that asynchronous operations complete in the correct order before dependent code executes.

## Demo-Specific Issue: Waiting for Peers

### Issue #4: Demo Only Works When Peers Are Connected

The original demo implementation had a critical UX flaw:

**Problem in `demo/app/page.tsx`:**

```typescript
toolDb.onConnect = async () => {
  // Sign in anonymously
  await toolDb.anonSignIn();
  const address = toolDb.userAccount.getAddress();
  // ... initialize everything
};
```

The `onConnect` callback only fires when **another peer connects** (when ping/pong messages are exchanged). With WebRTC, if you're the only user or no peers are available:

- `onConnect` never fires
- User never signs in
- UI shows "Loading..." forever
- Nothing works even though ToolDb is initialized

**Fix:**
Listen to the `"init"` event instead, which fires when `peerAccount` is ready (regardless of peer connections):

```typescript
// Wait for peerAccount initialization
toolDb.once("init", async () => {
  // Sign in immediately (don't wait for peers)
  await toolDb.anonSignIn();
  const address = toolDb.userAccount.getAddress();
  // ... initialize CRDTs and UI

  setStatus("Ready (looking for peers...)");
});

// Separate connection status
toolDb.onConnect = () => {
  setIsConnected(true);
  setStatus("Connected to peers");
  // Subscribe to real-time updates
};

toolDb.onDisconnect = () => {
  setIsConnected(false);
  setStatus("Ready (no peers connected)");
};
```

**Benefits:**

- Demo works immediately, even with no peers
- User can interact with local CRDTs
- Clear status messages: "Ready (looking for peers...)" vs "Connected to peers"
- Real-time sync activates when peers are found
- Better user experience for solo testing
