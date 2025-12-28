import { useCallback, useEffect, useReducer } from "react";

import { Routes, Route } from "react-router-dom";

import _ from "lodash";

import { GlobalState, Message } from "../types";
import UserGroupsList from "./UserGroupsList";
import Group from "./Group";
import WebRtcDebug from "./WebRtcDebug";

import reducer from "../state/reducer";
import getToolDb from "../utils/getToolDb";

import setupTooldb from "./setupTooldb";

const initialState: GlobalState = {
  names: {},
  publicKeys: {},
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

      const newMessage: Message = {
        m: msg,
        t: new Date().getTime(),
      };

      // Dont push to the state directly!
      const newMessagesArray: Message[] = [
        ...(state.groups[groupId].messages[address] || []),
        newMessage,
      ];

      // Push to state
      dispatch({
        type: "SET_USER_GROUP_MESSAGES",
        userId: address,
        groupId: groupId,
        messages: newMessagesArray,
      });
      toolDb.putData<Message[]>(`group-${groupId}`, newMessagesArray, true);
    },
    [state]
  );

  return (
    <>
      <div className="left-column">
        <WebRtcDebug />
        <UserGroupsList dispatch={dispatch} groupsList={state.groupsList} />
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
