import { useEffect, useState } from "react";

import getToolDb from "../utils/getToolDb";

export default function WebRtcDebug() {
  const toolDb = getToolDb();

  const [_refresh, setRefresh] = useState(0);

  useEffect(() => {
    setInterval(() => {
      setRefresh(new Date().getTime());
    }, 200);
  }, []);

  const peers = Object.keys(toolDb.network.clientToSend);
  const connectedPeers = peers.length;

  return (
    <>
      <div
        title={`${connectedPeers} peer${connectedPeers > 1 ? "s" : ""} online.`}
        className={`online-indicator ${connectedPeers > 0 ? "on" : "off"}`}
      >
        {connectedPeers}
      </div>
      <div className="debugger-list">
        <div style={{ color: "white" }}>Topic: {toolDb.options.topic}</div>
        <div style={{ color: "green" }}>
          Peer ID: {toolDb.network.getClientAddress()}
        </div>
        {peers.map((key) => {
          return (
            <div
              style={{
                color: "white",
              }}
              key={key}
            >
              {key}
            </div>
          );
        })}
      </div>
    </>
  );
}
