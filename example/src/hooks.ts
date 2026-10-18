import { useEffect, useState } from "react";
import { Profile, ToolDb } from "tool-db";

// Several components can watch the same key, only the last one to stop
// watching closes the relay subscription
const watchers: Record<string, number> = {};

/**
 * The live value of a key: read once, then updated on every change
 */
export function useData<T>(db: ToolDb, key: string | undefined): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    setValue(null);

    const listener = db.addKeyListener<T>(key, (msg) => {
      if (active) setValue(msg.v);
    });
    watchers[key] = (watchers[key] || 0) + 1;
    db.subscribeData(key);
    db.getData<T>(key).then((initial) => {
      if (active && initial !== null) setValue(initial);
    });

    return () => {
      active = false;
      db.removeKeyListener(listener);
      watchers[key] -= 1;
      if (watchers[key] === 0) db.unsubscribeData(key);
    };
  }, [db, key]);

  return value;
}

const profiles: Record<string, Promise<Profile | null>> = {};

/**
 * Display names of users, from their Nostr profiles
 */
export function useNames(db: ToolDb, users: string[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const usersKey = users.join(",");

  useEffect(() => {
    let active = true;
    users.forEach((user) => {
      profiles[user] = profiles[user] || db.getProfile(user);
      profiles[user].then((profile) => {
        if (active && profile?.name) {
          setNames((current) => ({ ...current, [user]: String(profile.name) }));
        }
      });
    });
    return () => {
      active = false;
    };
  }, [db, usersKey]);

  return names;
}

export const shortKey = (pubkey: string) =>
  `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`;
