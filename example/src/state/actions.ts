import { Message } from "../types";

export type ACTION_TYPES =
  | "SET_USER_NAME"
  | "SET_USER_PUBKEY"
  | "SET_GROUP_DATA"
  | "SET_USER_GROUP_MESSAGES"
  | "SET_ALL_GROUPS_LIST"
  | "CLEAR_GROUP_MESSAGES";

export interface ActionBase {
  type: ACTION_TYPES;
}

export interface ActionSetUserName extends ActionBase {
  type: "SET_USER_NAME";
  username: string;
  userId: string;
}

export interface ActionSetUserPubkey extends ActionBase {
  type: "SET_USER_PUBKEY";
  pubKey: string;
  userId: string;
}

export interface ActionSetAllGroupsList extends ActionBase {
  type: "SET_ALL_GROUPS_LIST";
  groups: string[];
}

export interface ActionSetGroupData extends ActionBase {
  type: "SET_GROUP_DATA";
  members: string[];
  owners: string[];
  groupId: string;
  name: string;
}

export interface ActionSetUserGroupMessages extends ActionBase {
  type: "SET_USER_GROUP_MESSAGES";
  messages: Message[];
  groupId: string;
  userId: string;
}

export interface ActionClearMessages extends ActionBase {
  type: "CLEAR_GROUP_MESSAGES";
  groupId: string;
}

export type AllActions =
  | ActionSetGroupData
  | ActionSetUserName
  | ActionSetUserPubkey
  | ActionSetUserGroupMessages
  | ActionSetAllGroupsList
  | ActionClearMessages;
