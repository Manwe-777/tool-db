# Race Condition Fix - Anonymous User Generation

## Problem

There was a race condition in the anonymous user generation in the ToolDb library:

1. **Double User Generation**: The `EcdsaUser` constructor was automatically calling `anonUser()` when instantiated (line 48 of `packages/ecdsa-user/lib/index.ts`)
2. **Second Call from Demo**: The demo was calling `await toolDb.anonSignIn()` after the "init" event, which triggered `anonUser()` again
3. **Non-Awaitable Operations**: The `anonUser()` and `setUser()` methods were not returning Promises, so there was no way to wait for them to complete
4. **Async Without Await**: These methods performed async cryptographic operations internally using `.then()` chains but didn't expose this to callers

This caused:

- Users to be generated multiple times
- Race conditions where `getAddress()` and `getUsername()` returned undefined or empty values
- Inconsistent state in the demo UI

## Solution

### 1. Made User Methods Async

**Changed in `packages/ecdsa-user/lib/index.ts`:**

- Converted `anonUser()` from callback-based to `async/await`
- Converted `setUser()` from callback-based to `async/await`
- Both methods now return `Promise<void>` and can be properly awaited

**Changed in `packages/web3-user/lib/index.ts`:**

- Made `anonUser()` and `setUser()` async for interface consistency
- Removed automatic user generation from constructor (set `_userName` to empty string)

**Changed in `packages/tool-db/lib/adapters-base/userAdapter.ts`:**

- Updated base class interface to reflect async signatures

### 2. Removed Automatic User Generation

**Changed in `packages/ecdsa-user/lib/index.ts`:**

- Removed the automatic `this.anonUser()` call from the constructor (line 48)
- Users must now explicitly call `anonSignIn()` to generate an anonymous user

### 3. Updated All Call Sites

**Changed in `packages/tool-db/lib/toolDbAnonSignIn.ts`:**

- Made the function async and await the `anonUser()` call

**Changed in `packages/tool-db/lib/tooldb.ts`:**

- Added `await` to the `peerAccount.setUser()` call

**Changed in `packages/tool-db/lib/toolDbKeysSignIn.ts`:**

- Made the function async
- Converted from `.then()` chains to `async/await`
- Added `await` to `setUser()` call

**Changed in `packages/tool-db/lib/toolDbSignIn.ts`:**

- Made the callback in `.then()` async
- Added `await` to `setUser()` call

## Impact

### Benefits

- **No More Race Conditions**: User generation completes before the address/username are accessed
- **Predictable Behavior**: `anonSignIn()` can now be properly awaited
- **Cleaner Code**: Using `async/await` instead of nested `.then()` chains
- **Better Debugging**: Easier to trace async operations

### Breaking Changes

- User adapters that extend `ToolDbUserAdapter` must update their `anonUser()` and `setUser()` methods to be async
- Code that calls these methods should await them (though they likely should have been doing this already)

## Testing

To verify the fix works:

1. Open the demo in multiple browser tabs
2. Check that the user address and username display correctly immediately after connection
3. Verify that the "Peer Information" panel shows the correct data
4. Confirm that no duplicate users are generated (check browser console logs)

## Files Modified

- `packages/ecdsa-user/lib/index.ts`
- `packages/web3-user/lib/index.ts`
- `packages/tool-db/lib/adapters-base/userAdapter.ts`
- `packages/tool-db/lib/tooldb.ts`
- `packages/tool-db/lib/toolDbAnonSignIn.ts`
- `packages/tool-db/lib/toolDbKeysSignIn.ts`
- `packages/tool-db/lib/toolDbSignIn.ts`
