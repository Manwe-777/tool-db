/**
 * @jest-environment node
 */
import { execFileSync } from "child_process";
import path from "path";

// Packages are published as CommonJS. Node ESM only sees the named exports
// it can detect statically, so check every package can be imported by name
// from a real ES module (Jest itself runs CommonJS).
const packages: [string, string[]][] = [
  [
    "tool-db",
    [
      "ToolDb",
      "MapCrdt",
      "ToolDbNostrUser",
      "ToolDbNip07User",
      "ToolDbMemoryStore",
      "RelayPool",
    ],
  ],
  [
    "nostr-relay",
    ["ToolDbRelay", "NostrRelay", "StorageEventStore", "MemoryEventStore"],
  ],
  ["leveldb-store", ["ToolDbLeveldb"]],
  ["indexeddb-store", ["ToolDbIndexedDb"]],
  ["redis-store", ["ToolDbRedis", "redisStore"]],
];

it.each(packages)("Imports %s by name from Node ESM", (name, exports) => {
  const entry = path.join(
    __dirname,
    "..",
    "packages",
    name,
    "dist",
    "index.js"
  );
  const script = `import { ${exports.join(", ")} } from ${JSON.stringify(
    entry
  )}; console.log([${exports.join(", ")}].map((x) => typeof x).join(","));`;

  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    {
      encoding: "utf8",
    }
  );
  expect(output.trim()).toBe(exports.map(() => "function").join(","));
});
