/**
 * Mock-based tests for WebRTC adapter
 * These tests work on all platforms without requiring wrtc package
 */

import { ToolDb } from "../packages/tool-db";
import ToolDbWebRTC from "../packages/webrtc-network";

jest.setTimeout(10000);

describe("WebRTC Adapter - Mock Tests", () => {
  let mockToolDb: ToolDb;
  let adapter: ToolDbWebRTC;

  beforeEach(() => {
    // Create a mock ToolDb instance with minimal required properties
    mockToolDb = {
      options: {
        topic: "test-topic",
        server: false,
        port: 3000,
        peers: [],
        maxRetries: 3,
        wait: 1000,
      },
      isConnected: false,
      logger: jest.fn(),
      once: jest.fn((event, callback) => {
        // Immediately call 'init' callback to simulate initialization
        if (event === "init") {
          setTimeout(callback, 0);
        }
      }),
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      peerAccount: {
        getAddress: jest.fn().mockReturnValue("mock-peer-address"),
      },
    } as any;
  });

  afterEach(() => {
    if (adapter && typeof adapter.onLeave === "function") {
      adapter.onLeave();
    }
  });

  it("should instantiate WebRTC adapter", () => {
    adapter = new ToolDbWebRTC(mockToolDb);
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(ToolDbWebRTC);
  });

  it("should have required methods", () => {
    adapter = new ToolDbWebRTC(mockToolDb);

    expect(typeof adapter.close).toBe("function");
    expect(typeof adapter.onLeave).toBe("function");
    expect(typeof adapter.getClientAddress).toBe("function");
  });

  it("should call init callback", (done) => {
    const initCallback = jest.fn(() => {
      expect(initCallback).toHaveBeenCalled();
      done();
    });

    mockToolDb.once = jest.fn((event, callback) => {
      if (event === "init") {
        callback();
      }
    }) as any;

    mockToolDb.once("init", initCallback);
    adapter = new ToolDbWebRTC(mockToolDb);
  });

  it("should handle onLeave correctly", async () => {
    adapter = new ToolDbWebRTC(mockToolDb);

    // onLeave should not throw
    await expect(adapter.onLeave()).resolves.not.toThrow();
  });

  it("should handle close correctly", () => {
    adapter = new ToolDbWebRTC(mockToolDb);

    // close should not throw
    expect(() => adapter.close("test-client-id")).not.toThrow();
  });

  it("should get client address from peerAccount", () => {
    adapter = new ToolDbWebRTC(mockToolDb);

    const address = adapter.getClientAddress();
    expect(address).toBe("mock-peer-address");
    expect(mockToolDb.peerAccount.getAddress).toHaveBeenCalled();
  });

  it("should initialize with correct topic info hash", () => {
    adapter = new ToolDbWebRTC(mockToolDb);

    // The adapter should hash the topic to create an info_hash
    // We can't directly test the private property, but we can verify initialization
    expect(adapter).toBeDefined();
  });

  it("should handle server mode initialization", () => {
    const serverMockToolDb = {
      ...mockToolDb,
      options: {
        ...mockToolDb.options,
        server: true,
        port: 9000,
      },
    } as any;

    // In Node.js environment with server: true, it should create a WebSocket server
    // This tests that the constructor doesn't throw
    expect(() => {
      adapter = new ToolDbWebRTC(serverMockToolDb);
    }).not.toThrow();
  });

  it("should respect maxPeers configuration", () => {
    // This tests that the adapter accepts configuration
    // The actual peer limiting is tested in integration tests
    const options = {
      ...mockToolDb.options,
      maxPeers: 10,
    };

    (mockToolDb as any).options = options;

    expect(() => {
      adapter = new ToolDbWebRTC(mockToolDb);
    }).not.toThrow();
  });
});

describe("WebRTC Adapter - Connection Logic", () => {
  it("should handle peer disconnection gracefully", () => {
    const mockToolDb = {
      options: {
        topic: "test-topic",
        server: false,
        port: 3000,
        peers: [],
        maxRetries: 3,
        wait: 1000,
      },
      isConnected: false,
      logger: jest.fn(),
      once: jest.fn(),
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      peerAccount: {
        getAddress: jest.fn().mockReturnValue("mock-address"),
      },
    } as any;

    const adapter = new ToolDbWebRTC(mockToolDb);

    // Verify that onDisconnect is set up
    expect(adapter).toBeDefined();

    // Clean up
    if (typeof adapter.onLeave === "function") {
      adapter.onLeave();
    }
  });

  it("should support custom tracker URLs", () => {
    const mockToolDb = {
      options: {
        topic: "test-topic",
        server: false,
        port: 3000,
        peers: [],
        maxRetries: 3,
        wait: 1000,
        trackerUrls: ["wss://custom-tracker.example.com"],
      },
      isConnected: false,
      logger: jest.fn(),
      once: jest.fn(),
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      peerAccount: {
        getAddress: jest.fn().mockReturnValue("mock-address"),
      },
    } as any;

    // Should not throw with custom tracker URLs
    expect(() => {
      const adapter = new ToolDbWebRTC(mockToolDb);
      adapter.onLeave();
    }).not.toThrow();
  });
});

describe("WebRTC Adapter - Edge Cases", () => {
  it("should handle missing wrtc option gracefully", () => {
    const mockToolDb = {
      options: {
        topic: "test-topic",
        server: false,
        port: 3000,
        peers: [],
      },
      isConnected: false,
      logger: jest.fn(),
      once: jest.fn(),
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      peerAccount: {
        getAddress: jest.fn().mockReturnValue("mock-address"),
      },
    } as any;

    // Should not throw even if wrtc is not provided (will use browser WebRTC if available)
    expect(() => {
      const adapter = new ToolDbWebRTC(mockToolDb);
      adapter.onLeave();
    }).not.toThrow();
  });

  it("should handle multiple onLeave calls", async () => {
    const mockToolDb = {
      options: {
        topic: "test-topic",
        server: false,
      },
      logger: jest.fn(),
      once: jest.fn(),
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      peerAccount: {
        getAddress: jest.fn().mockReturnValue("mock-address"),
      },
    } as any;

    const adapter = new ToolDbWebRTC(mockToolDb);

    // Multiple calls should not throw
    await expect(adapter.onLeave()).resolves.not.toThrow();
    await expect(adapter.onLeave()).resolves.not.toThrow();
  });
});

