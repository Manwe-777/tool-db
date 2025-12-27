import _ from "lodash";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sha1 } from "tool-db";
import getToolDb from "../utils/getToolDb";
import { GroupData, GroupsList } from "../types";
import { AllActions } from "../state/actions";

interface GroupsListProps {
  groupsList: GroupsList;
  dispatch: React.Dispatch<AllActions>;
}

export default function UserGroupsList(props: GroupsListProps) {
  const { groupsList, dispatch } = props;
  const navigate = useNavigate();

  const [newGroupName, setNewGroupName] = useState("");

  const toolDb = getToolDb();

  // Create a new group
  const createGroup = useCallback(() => {
    // Use the group name and our pubkey to get the hash/id
    // The group id will be unique for us, in case someone else creates a new group with the same name
    const adress = toolDb.userAccount.getAddress() || "";
    const groupId = sha1(newGroupName + new Date().getTime() + adress);
    setNewGroupName("");

    // The key contains the name as well, for UI display without extra queries
    const newGroupKey = `${groupId}-${newGroupName}`;

    // Use the frozen namespace for the metadata
    toolDb
      .putData<GroupData>(`==${groupId}`, {
        owners: [adress],
        name: newGroupName,
        id: groupId,
        members: [toolDb.userAccount.getAddress() || ""],
      })
      .then((d) => {
        if (d) {
          // add this group key to our index!
          const newGroups = _.uniq([...groupsList, newGroupKey]);
          toolDb.putData<GroupsList>("groups", newGroups, true);
        }
      });
  }, [groupsList, newGroupName]);

  // Change the current group, trigger everything
  const changeGroup = useCallback(
    (groupId: string) => {
      navigate(`/group/${encodeURIComponent(groupId)}`);
    },
    [newGroupName, dispatch]
  );

  return (
    <div className="groups-list">
      <p>Groups: </p>
      {groupsList.map((name) => {
        return (
          <div
            className="group-name"
            key={`group-name-${name}`}
            onClick={() => changeGroup(name.split("-")[0])}
          >
            {name.split("-")[1]}
          </div>
        );
      })}
      <div>
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.currentTarget.value)}
        />
        <button type="button" onClick={createGroup}>
          Create
        </button>
      </div>
    </div>
  );
}
