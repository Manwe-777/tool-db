/* eslint-disable no-use-before-define */
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { ToolDb, VerificationData, MapChanges } from "tool-db";

import { HashRouter } from "react-router-dom";

import ToolDbEcdsaUser from "@tool-db/ecdsa-user";
import ToolDbWebrtc from "@tool-db/webrtc-network";
import ToolDbIndexedb from "@tool-db/indexeddb-store";
import reportWebVitals from "./reportWebVitals";
import App from "./components/App";

// Initialize tooldb outside of react to avoid unpleasant side effects
// Especially with hot module reloading while testing
const db = new ToolDb({
  peers: [],
  userAdapter: ToolDbEcdsaUser,
  networkAdapter: ToolDbWebrtc as any,
  storageAdapter: ToolDbIndexedb as any,
  debug: true, //
  topic: "testnetwork",
});

// A simple verificator to only allow insertions and not deletions
function requestsVerificator(
  msg: VerificationData<MapChanges<string>[]>
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let isValid = true;
    // Iterate over the crdt changes to find deletions, if any
    msg.v.forEach((ch) => {
      if (ch.t === "DEL") isValid = false;
    });
    resolve(isValid);
  });
}

// A simple verificator to only allow insertions and not deletions
function ownedMapVerificator(
  msg: VerificationData<MapChanges<string>[]>
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let isValid = true;
    // Iterate over the crdt changes to find deletions, if any
    msg.v.forEach((ch) => {
      if (ch.a !== ch.k) isValid = false;
      if (msg.a !== ch.k) isValid = false;
      if (ch.t === "DEL") isValid = false;
    });
    resolve(isValid);
  });
}

// // Apply to all keys starting with "group-"
db.addCustomVerification<MapChanges<string>[]>(
  "requests-",
  requestsVerificator
);

db.addCustomVerification<MapChanges<string>[]>("index-", ownedMapVerificator);

// Just for devtools/debugging
(window as any).toolDb = db;

ReactDOM.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
