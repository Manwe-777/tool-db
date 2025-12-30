import { useEffect, useState, useRef } from "react";

import getToolDb from "../utils/getToolDb";

const TOPIC_STORAGE_KEY = "tooldb-network-topic";

export default function WebRtcDebug() {
  const toolDb = getToolDb();

  const [_refresh, setRefresh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicInput, setTopicInput] = useState(toolDb.options.topic);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInterval(() => {
      setRefresh(new Date().getTime());
    }, 200);
  }, []);

  useEffect(() => {
    if (isEditingTopic && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTopic]);

  const handleEditTopic = () => {
    setTopicInput(toolDb.options.topic);
    setIsEditingTopic(true);
  };

  const handleSaveTopic = () => {
    const newTopic = topicInput.trim();
    if (newTopic && newTopic !== toolDb.options.topic) {
      localStorage.setItem(TOPIC_STORAGE_KEY, newTopic);
      // Reload the page to reinitialize with the new topic
      window.location.reload();
    } else {
      setIsEditingTopic(false);
    }
  };

  const handleCancelEdit = () => {
    setTopicInput(toolDb.options.topic);
    setIsEditingTopic(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTopic();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const peers = Object.keys(toolDb.network.clientToSend);
  const connectedPeers = peers.length;

  return (
    <div className="debug-container">
      <div
        title={`${connectedPeers} peer${
          connectedPeers > 1 ? "s" : ""
        } online. Click to ${expanded ? "collapse" : "expand"}`}
        className={`online-indicator ${connectedPeers > 0 ? "on" : "off"}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="peer-count">{connectedPeers}</span>
        <span className={`expand-icon ${expanded ? "expanded" : ""}`}>›</span>
      </div>
      {expanded && (
        <div className="debugger-list">
          <div className="topic-row">
            {isEditingTopic ? (
              <div className="topic-edit">
                <input
                  ref={inputRef}
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="topic-input"
                  placeholder="Enter network topic"
                />
                <button
                  type="button"
                  className="topic-btn topic-btn-save"
                  onClick={handleSaveTopic}
                  title="Save topic"
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="topic-btn topic-btn-cancel"
                  onClick={handleCancelEdit}
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <span>Topic: {toolDb.options.topic}</span>
                <button
                  type="button"
                  className="topic-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTopic();
                  }}
                  title="Edit network topic"
                >
                  ✎
                </button>
              </>
            )}
          </div>
          <div className="topic-hint">
            Network peers are discovered by topic
          </div>
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
