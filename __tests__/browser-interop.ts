import vm from "vm";
import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import WebSocket from "ws";
import browserify from "browserify";

import { MapCrdt, textRandom, ToolDb } from "../packages/tool-db";
import { ToolDbRelay } from "../packages/nostr-relay";

import MemoryStore from "../test-utils/memoryStore";

jest.setTimeout(30000);

const TOPIC = "browser-interop-test";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bundles the core like a browser app would, so Node built ins can not be
 * used without failing.
 */
const bundleCore = () =>
  new Promise<string>((resolve, reject) => {
    browserify(`${__dirname}/../packages/tool-db/dist/index.js`, {
      standalone: "tooldb",
    }).bundle((err: Error | null, buffer: Buffer) =>
      err ? reject(err) : resolve(buffer.toString())
    );
  });

/**
 * Runs the bundle in a sandbox with browser globals only: no require,
 * process, Buffer or Node modules.
 */
const createBrowser = (bundle: string) => {
  const sandbox: Record<string, any> = {
    WebSocket,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    console,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(bundle, sandbox);
  return sandbox.tooldb;
};

let relay: ToolDbRelay;
let browserLib: any;
let browser: any;
let node: ToolDb;

const waitForConnect = (db: { isConnected: boolean; onConnect: () => void }) =>
  new Promise<void>((resolve) => {
    if (db.isConnected) resolve();
    db.onConnect = () => resolve();
  });

beforeAll(async () => {
  relay = new ToolDbRelay({ topic: TOPIC });
  await relay.start();

  browserLib = createBrowser(await bundleCore());
  browser = new browserLib.ToolDb({ relays: [relay.url], topic: TOPIC });
  node = new ToolDb({
    relays: [relay.url],
    topic: TOPIC,
    storageAdapter: MemoryStore,
  });
  await Promise.all([waitForConnect(browser), waitForConnect(node)]);
});

afterAll(async () => {
  await browser.close();
  await node.close();
  await relay.close();
});

it("Runs without Node built ins", () => {
  expect(typeof browserLib.ToolDb).toBe("function");
  expect(browser.userAccount.getAddress()).toMatch(/^[0-9a-f]{64}$/);
});

it("Syncs values from the browser to Node", async () => {
  const key = "from-browser-" + textRandom(8);
  await browser.putData(key, { hello: "node" });
  await wait(100);
  expect(await node.getData(key)).toEqual({ hello: "node" });
});

it("Syncs values from Node to the browser", async () => {
  const key = "from-node-" + textRandom(8);
  await node.putData(key, ["hello", "browser"]);
  await wait(100);
  expect(await browser.getData(key)).toEqual(["hello", "browser"]);
});

it("Syncs user namespaced values", async () => {
  const key = "namespaced-" + textRandom(8);
  await browser.putData(key, "mine", true);
  await wait(100);
  expect(
    await node.getData(`:${browser.userAccount.getAddress()}.${key}`)
  ).toBe("mine");
});

it("Merges CRDTs between the browser and Node", async () => {
  const key = "crdt-" + textRandom(8);

  const browserMap = new browserLib.MapCrdt(browser.userAccount.getAddress());
  browserMap.SET("browser", "b");
  await browser.putCrdt(key, browserMap);

  const nodeMap = new MapCrdt<string>(node.userAccount.getAddress() || "");
  nodeMap.SET("node", "n");
  await node.putCrdt(key, nodeMap);
  await wait(100);

  const fromNode = new browserLib.MapCrdt(browser.userAccount.getAddress());
  await browser.getCrdt(key, fromNode);
  expect(fromNode.value).toEqual({ browser: "b", node: "n" });

  const fromBrowser = new MapCrdt<string>(node.userAccount.getAddress() || "");
  await node.getCrdt(key, fromBrowser);
  expect(fromBrowser.value).toEqual({ browser: "b", node: "n" });
});

it("Sends live updates between the browser and Node", async () => {
  const key = "live-" + textRandom(8);
  const received: any[] = [];
  browser.addKeyListener(key, (msg: any) => received.push(msg.v));
  await browser.subscribeData(key);
  await wait(100);

  await node.putData(key, "live value");
  await wait(300);
  expect(received).toEqual(["live value"]);
});
