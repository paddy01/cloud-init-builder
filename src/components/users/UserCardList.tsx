import { useCallback, useState } from "react";
import type { BuilderUser } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { UserCard } from "./UserCard.tsx";
import { useUserValidation } from "./UserValidationContext.tsx";

interface UserCardListProps {
  entries: BuilderUser[];
}

export function UserCardList({ entries }: UserCardListProps) {
  const addUser = useProjectStore((state) => state.addUser);
  const removeUser = useProjectStore((state) => state.removeUser);
  const { focusRequestPath, consumeFocusRequest } = useUserValidation();
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const clearPendingFocus = useCallback(() => setPendingFocusId(null), []);
  const handleFocusRequestHandled = useCallback(() => {
    consumeFocusRequest();
  }, [consumeFocusRequest]);

  const handleAddUser = () => {
    const id = addUser();
    if (id) {
      setPendingFocusId(id);
    }
  };

  return (
    <div className="space-y-6">
      {entries.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          shouldFocusUsername={pendingFocusId === user.id}
          onFocused={clearPendingFocus}
          focusRequestPath={
            focusRequestPath?.startsWith(`users.entries.${user.id}.`)
              ? focusRequestPath
              : null
          }
          onFocusRequestHandled={handleFocusRequestHandled}
          onRemove={removeUser}
        />
      ))}

      <button
        type="button"
        className="mt-6 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        onClick={handleAddUser}
      >
        Add user
      </button>
    </div>
  );
}
