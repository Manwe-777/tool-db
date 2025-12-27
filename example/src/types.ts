// "=={groupId}"
export interface GroupData {
  owners: string[];
  id: string;
  name: string;
  members: string[];
}

// :{address}.group-{groupId}
export interface Message {
  m: string;
  t: number;
  u?: string;
}

// :{address}.groups
export type GroupsList = string[];

// Global State
export interface GroupState {
  name: string;
  owners: string[]; // Array of owners
  members: string[]; // Array of userIds
  messages: Record<string, Message[]>;
}

export interface GlobalState {
  names: Record<string, string>; // { userId: name }
  publicKeys: Record<string, string>; // { userId: publicKey }
  groups: Record<string, GroupState>; // { groupId: GroupState }
  groupsList: string[];
}
