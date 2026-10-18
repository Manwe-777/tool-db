import { FormEvent, useEffect, useState } from "react";
import { ToolDb, ToolDbNostrUser, npubEncode } from "tool-db";

import {
  GroupData,
  createGroup,
  getMyGroups,
  groupKey,
  me,
  parseGroupRef,
  requestToJoin,
} from "../chat";
import { useData } from "../hooks";
import { RELAYS } from "../identity";
import GroupView from "./GroupView";

function GroupItem({
  db,
  groupRefId,
  selected,
  onSelect,
}: {
  db: ToolDb;
  groupRefId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useData<GroupData>(db, groupKey(parseGroupRef(groupRefId)));
  const pending = group && !group.members.includes(me(db));
  return (
    <button
      className={`group-item ${selected ? "active" : ""}`}
      onClick={onSelect}
    >
      {group?.name || "Loading…"}
      {pending && <span className="badge">pending</span>}
    </button>
  );
}

export default function ChatApp({ db }: { db: ToolDb }) {
  const myGroups = useData<string[]>(db, `:${me(db)}.groups`) || [];
  const [selected, setSelected] = useState<string>();
  const [newGroup, setNewGroup] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(db.isConnected);

  useEffect(() => {
    db.onConnect = () => setConnected(true);
    db.onDisconnect = () => setConnected(false);
    // Our groups, also from before this session
    getMyGroups(db);
  }, [db]);

  useEffect(() => {
    if (!selected && myGroups.length > 0) setSelected(myGroups[0]);
  }, [myGroups.length]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!newGroup.trim()) return;
    const group = await createGroup(db, newGroup.trim());
    setNewGroup("");
    setSelected(`${group.owner}/${group.id}`);
  };

  const join = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      parseGroupRef(joinLink);
      await requestToJoin(db, joinLink.trim());
      setSelected(joinLink.trim());
      setJoinLink("");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  const isLocalKey = db.userAccount instanceof ToolDbNostrUser;

  return (
    <div className="app">
      <aside>
        <div className="me">
          <strong>{db.userAccount.getUsername() || "Nostr user"}</strong>
          <span className="muted small" title={me(db)}>
            {npubEncode(me(db)).slice(0, 20)}…
          </span>
          <span className={`status ${connected ? "online" : ""}`}>
            {connected ? "Connected" : "Offline"} · {RELAYS.join(", ")}
          </span>
          {isLocalKey && (
            <span className="muted small">Key saved in this browser</span>
          )}
        </div>

        <h3>Groups</h3>
        {myGroups.length === 0 && (
          <p className="muted small">
            Create a group, or join one with a link.
          </p>
        )}
        {myGroups.map((ref) => (
          <GroupItem
            key={ref}
            db={db}
            groupRefId={ref}
            selected={ref === selected}
            onSelect={() => setSelected(ref)}
          />
        ))}

        <form onSubmit={create}>
          <input
            placeholder="New group name"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
          />
          <button type="submit">Create</button>
        </form>

        <form onSubmit={join}>
          <input
            placeholder="Paste an invite link"
            value={joinLink}
            onChange={(e) => setJoinLink(e.target.value)}
          />
          <button type="submit">Join</button>
        </form>
        {error && <p className="error">{error}</p>}
      </aside>

      <main>
        {selected ? (
          <GroupView key={selected} db={db} groupRefId={selected} />
        ) : (
          <div className="empty">Select or create a group</div>
        )}
      </main>
    </div>
  );
}
