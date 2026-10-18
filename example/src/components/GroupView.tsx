import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ToolDb } from "tool-db";

import {
  GroupData,
  Message,
  StoredMessage,
  acceptMember,
  decryptMessages,
  getGroupKey,
  getJoinRequests,
  groupKey,
  groupRef,
  me,
  messagesKey,
  parseGroupRef,
  sendMessage,
} from "../chat";
import { shortKey, useData, useNames } from "../hooks";

/**
 * The messages of one member, decrypted. Each member writes their own
 * messages, in their own namespace.
 */
function MemberMessages({
  db,
  author,
  groupId,
  secret,
  onMessages,
}: {
  db: ToolDb;
  author: string;
  groupId: string;
  secret: string;
  onMessages: (author: string, messages: Message[]) => void;
}) {
  const stored = useData<StoredMessage[]>(db, messagesKey(author, groupId));
  useEffect(() => {
    onMessages(author, decryptMessages(secret, author, stored));
  }, [stored, secret]);
  return null;
}

function JoinRequests({ db, group }: { db: ToolDb; group: GroupData }) {
  const [requests, setRequests] = useState<Record<string, string>>({});
  // Re-read the requests whenever a new one arrives
  const changes = useData<unknown>(db, `requests-${group.id}`);

  useEffect(() => {
    getJoinRequests(db, group).then(setRequests);
  }, [changes, group.members.length]);

  const pending = Object.entries(requests);
  if (pending.length === 0) return null;

  return (
    <div className="requests">
      <h3>Join requests</h3>
      {pending.map(([user, name]) => (
        <div key={user} className="request">
          <span>
            {name || "Unnamed"} <span className="muted">{shortKey(user)}</span>
          </span>
          <button onClick={() => acceptMember(db, group, user)}>Accept</button>
        </div>
      ))}
    </div>
  );
}

export default function GroupView({
  db,
  groupRefId,
}: {
  db: ToolDb;
  groupRefId: string;
}) {
  const group = useData<GroupData>(db, groupKey(parseGroupRef(groupRefId)));
  const [secret, setSecret] = useState<string>();
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const members = group?.members || [];
  const names = useNames(db, members);
  const isMember = members.includes(me(db));
  const isOwner = group?.owner === me(db);

  // The group key is available once the owner accepted us and shared it,
  // which can arrive after the membership change
  const wrappedKey = useData<string>(
    db,
    group && isMember
      ? `:${group.owner}.groupKey-${group.id}-${me(db)}`
      : undefined
  );

  useEffect(() => {
    setSecret(undefined);
    setMessages({});
  }, [group?.id]);

  useEffect(() => {
    if (group && isMember && wrappedKey) getGroupKey(db, group).then(setSecret);
  }, [group?.id, isMember, wrappedKey]);

  const timeline = useMemo(
    () =>
      Object.values(messages)
        .flat()
        .sort((a, b) => a.t - b.t),
    [messages]
  );

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!group || !text.trim()) return;
    const sent = text;
    setText("");
    await sendMessage(db, group, sent);
  };

  const copyLink = async () => {
    if (!group) return;
    await navigator.clipboard.writeText(groupRef(group));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!group) return <div className="empty">Loading group…</div>;

  return (
    <div className="group">
      <header>
        <div>
          <h2>{group.name}</h2>
          <span className="muted small">
            {members.length} member{members.length === 1 ? "" : "s"} ·{" "}
            {members.map((m) => names[m] || shortKey(m)).join(", ")}
          </span>
        </div>
        <button className="secondary" onClick={copyLink}>
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </header>

      {isOwner && <JoinRequests db={db} group={group} />}

      {!isMember && (
        <div className="empty">
          Waiting for the owner to accept your request to join.
        </div>
      )}

      {isMember && secret && (
        <>
          {members.map((member) => (
            <MemberMessages
              key={member}
              db={db}
              author={member}
              groupId={group.id}
              secret={secret}
              onMessages={(author, list) =>
                setMessages((current) => ({ ...current, [author]: list }))
              }
            />
          ))}
          <div className="messages">
            {timeline.length === 0 && (
              <div className="empty">No messages yet, say hi!</div>
            )}
            {timeline.map((message) => (
              <div
                key={`${message.author}-${message.t}`}
                className={`message ${message.author === me(db) ? "own" : ""}`}
              >
                <span className="author">
                  {names[message.author] || shortKey(message.author)}
                </span>
                <span>{message.text}</span>
                <span className="time">
                  {new Date(message.t).toLocaleTimeString()}
                </span>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <form className="composer" onSubmit={send}>
            <input
              placeholder="Write a message (end to end encrypted)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </>
      )}

      {isMember && !secret && (
        <div className="empty">Loading the group key…</div>
      )}
    </div>
  );
}
