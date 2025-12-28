// "=={groupId}"
export interface GroupData {
  owners: string[];
  id: string;
  name: string;
  members: string[];
}

// :{address}.group-{groupId}
export interface Message {
  m: string; // Message content (always the original - encrypted if e=true)
  t: number; // Timestamp
  u?: string; // Username (added when displaying)
  e?: boolean; // Encrypted flag - true if message is encrypted
  decrypted?: string; // Decrypted content (local only, never sent to network)
}

// :{address}.groups
export type GroupsList = string[];

// Wrapped group key for a specific member
// Stored at: groupKey-{groupId}-{memberAddress}
export interface WrappedGroupKeyData {
  iv: string; // base64 encoded
  key: string; // hex encoded encrypted group key
  from: string; // address of who wrapped it (need their encPubKey to unwrap)
}

// Global State
export interface GroupState {
  name: string;
  owners: string[]; // Array of owners
  members: string[]; // Array of userIds
  messages: Record<string, Message[]>;
}

export interface GlobalState {
  names: Record<string, string>; // { userId: name }
  publicKeys: Record<string, string>; // { userId: signing publicKey (address) }
  encryptionKeys: Record<string, string>; // { userId: encryption ECDH publicKey }
  groups: Record<string, GroupState>; // { groupId: GroupState }
  groupsList: string[];
}
