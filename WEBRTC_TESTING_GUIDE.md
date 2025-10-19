# WebRTC Testing Guide

## Overview

This guide explains how to test the WebRTC module in tool-db. We've created comprehensive tests that work across different platforms with different capabilities.

## Test Files

### 1. `__tests__/webrtc.ts` - Integration Tests

This file contains full integration tests that establish actual WebRTC connections between peers. These tests:

- Create multiple ToolDb instances using WebRTC adapter
- Test peer discovery through tracker servers
- Verify data exchange between peers
- Test user authentication flows
- Verify CRDT synchronization

**Requirements:**

- Requires the `wrtc` package (node-webrtc) for Node.js WebRTC support
- `wrtc` is only supported on Linux and macOS (not Windows)
- Tests will be automatically skipped if `wrtc` is not available

**To install wrtc (Linux/Mac only):**

```bash
npm install --save-dev wrtc
```

### 2. `__tests__/webrtc.mock.ts` - Mock Tests

This file contains mock-based tests that verify the WebRTC adapter logic without requiring actual WebRTC connections. These tests:

- Test adapter instantiation and configuration
- Verify method existence and behavior
- Test error handling and edge cases
- Work on all platforms including Windows

**No special requirements** - these tests run everywhere!

## Running the Tests

### Run all WebRTC tests:

```bash
npx jest __tests__/webrtc
```

### Run only integration tests:

```bash
npx jest __tests__/webrtc.ts
```

### Run only mock tests:

```bash
npx jest __tests__/webrtc.mock.ts
```

## Test Output Examples

### On Windows (or without wrtc):

```
⚠️  wrtc package not available - WebRTC tests will be skipped
   To run WebRTC tests on Linux/Mac: npm install --save-dev wrtc
   Note: wrtc is not supported on Windows

WebRTC Network Tests
  ○ skipped 8 tests (integration tests)
WebRTC Module Structure
  √ 2 passed (structure tests)
```

### On Linux/Mac (with wrtc):

```
WebRTC Network Tests
  √ 8 passed (integration tests)
WebRTC Module Structure
  √ 2 passed (structure tests)
```

### Mock tests (all platforms):

```
WebRTC Adapter - Mock Tests
  √ 13 passed
```

## What Gets Tested

### Integration Tests (`webrtc.ts`)

1. **Peer Connection**: Multiple peers connect through WebRTC trackers
2. **Data Exchange**: Peers can put and get data
3. **P2P Communication**: Direct peer-to-peer messaging works
4. **Subscriptions**: Real-time data subscriptions function correctly
5. **Authentication**: Sign up and sign in work across peers
6. **CRDTs**: Conflict-free replicated data types sync properly
7. **Peer Discovery**: Peers discover each other automatically

### Mock Tests (`webrtc.mock.ts`)

1. **Instantiation**: Adapter creates without errors
2. **Method Presence**: All required methods exist
3. **Configuration**: Accepts various configuration options
4. **Error Handling**: Gracefully handles edge cases
5. **Cleanup**: `onLeave` and `close` methods work correctly
6. **Server Mode**: Can initialize in server mode
7. **Custom Trackers**: Accepts custom tracker URLs

## Bug Fixes

During test development, we discovered and fixed a bug in the WebRTC adapter:

**Issue**: The `onLeave()` method tried to access `this.socketListeners[url][this.infoHash]` without checking if the parent object existed, causing a crash.

**Fix**: Added null safety checks:

```typescript
this.trackerUrls.forEach((url) => {
  if (this.socketListeners[url] && this.socketListeners[url][this.infoHash]) {
    delete this.socketListeners[url][this.infoHash];
  }
});
```

## Platform Compatibility

| Platform | Integration Tests        | Mock Tests |
| -------- | ------------------------ | ---------- |
| Linux    | ✅ Yes (with wrtc)       | ✅ Yes     |
| macOS    | ✅ Yes (with wrtc)       | ✅ Yes     |
| Windows  | ❌ No (wrtc unsupported) | ✅ Yes     |

## CI/CD Recommendations

For continuous integration:

1. **Linux CI**: Install wrtc and run all tests

   ```bash
   npm install --save-dev wrtc
   npm run build
   npx jest __tests__/webrtc
   ```

2. **Windows CI**: Run only mock tests

   ```bash
   npm run build
   npx jest __tests__/webrtc.mock.ts
   ```

3. **Multi-platform CI**: Let tests auto-skip when wrtc is unavailable
   ```bash
   npm run build
   npx jest __tests__/webrtc  # Skips integration tests automatically on Windows
   ```

## Troubleshooting

### "wrtc package not available"

This is expected on Windows. The mock tests will still run and provide good coverage of the adapter logic.

### Integration tests timeout

- Check that tracker servers are accessible
- Increase test timeout in the test file (currently 60 seconds)
- Verify network connectivity

### "Cannot convert undefined or null to object"

This was the bug we fixed. Make sure you've rebuilt the package after the fix:

```bash
npm run build
```

## Comparing with WebSocket Tests

The WebRTC tests follow a similar structure to the WebSocket tests (`__tests__/network.ts`), but with key differences:

| Aspect           | WebSocket        | WebRTC                |
| ---------------- | ---------------- | --------------------- |
| Topology         | Client-Server    | Peer-to-Peer          |
| Connection       | Direct to server | Via tracker signaling |
| Server Nodes     | Required         | Optional              |
| Setup Time       | ~5 seconds       | ~15-30 seconds        |
| Platform Support | All platforms    | Limited (wrtc)        |

## Future Improvements

Possible enhancements to the test suite:

1. **Browser Testing**: Use Puppeteer/Playwright for real browser WebRTC tests
2. **Stress Testing**: Test with many peers (10+)
3. **Network Simulation**: Test with network delays, packet loss
4. **Tracker Fallback**: Test behavior when trackers are unavailable
5. **Reconnection**: Test peer reconnection after disconnects

## Contributing

When adding new WebRTC features:

1. Add integration tests to `__tests__/webrtc.ts` for functionality
2. Add mock tests to `__tests__/webrtc.mock.ts` for logic
3. Ensure tests work with and without wrtc package
4. Update this guide with new testing patterns
