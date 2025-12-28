import { useCallback, useEffect, useReducer } from "react";

import { Routes, Route } from "react-router-dom";

import _ from "lodash";

import { GlobalState, Message } from "../types";
import UserGroupsList from "./UserGroupsList";
import Group from "./Group";
import WebRtcDebug from "./WebRtcDebug";

import reducer from "../state/reducer";
import getToolDb from "../utils/getToolDb";
import { encryptGroupMessage, getCachedGroupKey } from "../utils/groupCrypto";

import setupTooldb from "./setupTooldb";

const initialState: GlobalState = {
  names: {},
  publicKeys: {},
  encryptionKeys: {},
  groups: {},
  groupsList: [],
};

export default function ChatApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  // console.log(state);
  const toolDb = getToolDb();

  useEffect(() => {
    const addr = toolDb.userAccount.getAddress();
    if (addr) {
      dispatch({
        type: "SET_USER_NAME",
        userId: addr,
        username: toolDb.userAccount.getUsername() || "",
      });
    }
    setupTooldb(dispatch);
  }, []);

  const sendMessage = useCallback(
    async (groupId: string, msg: string) => {
      const address = toolDb.userAccount.getAddress() || "";

      if (!state.groups[groupId]) return;
      if (!state.groups[groupId].members.includes(address)) return;

      // Check if we have the group key for encryption
      const hasGroupKey = !!getCachedGroupKey(groupId);

      // Encrypt the message if we have the key
      const messageContent = hasGroupKey
        ? await encryptGroupMessage(msg, groupId)
        : msg;

      const newMessage: Message = {
        m: messageContent,
        t: new Date().getTime(),
        e: hasGroupKey, // Only mark as encrypted if we actually encrypted
      };

      // Build network array from existing messages, stripping 'decrypted' field
      // to avoid sending decrypted content to the network
      const existingMessages = state.groups[groupId].messages[address] || [];
      const networkMessagesArray: Message[] = [
        ...existingMessages.map(
          ({ decrypted: _decrypted, u: _u, ...rest }) => rest
        ),
        newMessage,
      ];

      // For local display, show the decrypted message
      const displayMessage: Message = {
        m: messageContent, // Keep encrypted content in m
        t: newMessage.t,
        e: hasGroupKey,
        decrypted: msg, // Decrypted text for display
      };

      const displayMessagesArray: Message[] = [
        ...existingMessages,
        displayMessage,
      ];

      // Push to local state for immediate display
      dispatch({
        type: "SET_USER_GROUP_MESSAGES",
        userId: address,
        groupId: groupId,
        messages: displayMessagesArray,
      });

      // Send to network (without decrypted field)
      toolDb.putData<Message[]>(`group-${groupId}`, networkMessagesArray, true);
    },
    [state]
  );

  return (
    <>
      <div className="left-column">
        <WebRtcDebug />
        <UserGroupsList
          dispatch={dispatch}
          groupsList={state.groupsList}
          groups={state.groups}
        />
      </div>
      <Routes>
        <Route path="/" element={<p>Select or create a group to start</p>} />
        <Route path="/group">
          <Route
            path=":groupRoute"
            element={
              <Group
                sendMessage={sendMessage}
                dispatch={dispatch}
                state={state}
              />
            }
          />
        </Route>
      </Routes>
    </>
  );
}
