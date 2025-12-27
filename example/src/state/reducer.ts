import { GlobalState } from "../types";
import { AllActions } from "./actions";

export default function reducer(
  state: GlobalState,
  action: AllActions
): GlobalState {
  // console.log("DISPACTH", action);
  try {
    switch (action.type) {
      case "SET_ALL_GROUPS_LIST":
        return {
          ...state,
          groupsList: action.groups,
        };

      case "SET_GROUP_DATA":
        return {
          ...state,
          groups: {
            ...state.groups,
            [action.groupId]: {
              ...state.groups[action.groupId],
              messages: state.groups[action.groupId]?.messages || {},
              members: action.members,
              owners: action.owners,
              name: action.name,
            },
          },
        };

      case "SET_USER_NAME":
        return {
          ...state,
          names: {
            ...state.names,
            [action.userId]: action.username,
          },
        };

      case "SET_USER_PUBKEY":
        return {
          ...state,
          publicKeys: {
            ...state.publicKeys,
            [action.userId]: action.pubKey,
          },
        };

      case "SET_USER_GROUP_MESSAGES":
        return {
          ...state,
          groups: {
            ...state.groups,
            [action.groupId]: {
              ...state.groups[action.groupId],
              messages: {
                ...state.groups[action.groupId].messages,
                [action.userId]: action.messages,
              },
            },
          },
        };

      case "CLEAR_GROUP_MESSAGES":
        return {
          ...state,
          groups: {
            ...state.groups,
            [action.groupId]: {
              ...state.groups[action.groupId],
              messages: {},
            },
          },
        };
      default:
        throw new Error(`No action with type ${action} found!`);
    }
  } catch (e) {
    console.error(e);
  }
  return state;
}
