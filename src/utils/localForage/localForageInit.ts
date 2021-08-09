import localforage from "localforage";

export default function localForageInit() {
  localforage.config({
    driver: localforage.WEBSQL,
    name: "toolChain",
    version: 1.0,
    size: 4980736, // Size of database, in bytes. WebSQL-only for now.
    storeName: "keyvaluepairs", // Should be alphanumeric, with underscores.
    description: "toolChain data storage.",
  });
}
