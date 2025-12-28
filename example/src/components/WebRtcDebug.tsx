import { useEffect, useState } from "react";

import getToolDb from "../utils/getToolDb";

export default function WebRtcDebug() {
  const toolDb = getToolDb();

  const [_refresh, setRefresh] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setInterval(() => {
      setRefresh(new Date().getTime());
    }, 200);
  }, []);

  const peers = Object.keys(toolDb.network.clientToSend);
  const connectedPeers = peers.length;

  return (
    <div className="debug-container">
      <div
        title={`${connectedPeers} peer${connectedPeers > 1 ? "s" : ""} online. Click to ${expanded ? "collapse" : "expand"}`}
        className={`online-indicator ${connectedPeers > 0 ? "on" : "off"}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="peer-count">{connectedPeers}</span>
        <span className={`expand-icon ${expanded ? "expanded" : ""}`}>›</span>
      </div>
      {expanded && (
        <div className="debugger-list">
          <div>Topic: {toolDb.options.topic}</div>
          <div className="peer-id">
            Peer ID: {toolDb.network.getClientAddress()}
          </div>
          {peers.length > 0 && (
            <div className="peers-section">
              <span className="peers-label">Connected Peers:</span>
              {peers.map((key) => (
                <div className="peer-item" key={key}>
                  {key}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
