import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { BuilderUser } from "../../models/users.ts";
import { getUserHeaderMetadata } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { AdvancedUserOptions } from "./AdvancedUserOptions.tsx";
import { FieldMessage } from "./FieldMessage.tsx";
import { GroupsInput } from "./GroupsInput.tsx";
import { PasswordHashField } from "./PasswordHashField.tsx";
import { ShellSelector } from "./ShellSelector.tsx";
import { SshAuthorizedKeysInput } from "./SshAuthorizedKeysInput.tsx";
import { SudoRuleSelector } from "./SudoRuleSelector.tsx";
import { UserAuthStatus } from "./UserAuthStatus.tsx";
import {
  getSshRowIdFromPath,
  pathToFocusTargetId,
} from "./userValidationPaths.ts";
import { useUserValidation } from "./UserValidationContext.tsx";

const inputDefaultClassName =
  "border border-gray-300 rounded px-3 py-2 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const inputErrorClassName =
  "border border-red-300 rounded px-3 py-2 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const inputWarningClassName =
  "border border-amber-300 rounded px-3 py-2 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

interface UserCardProps {
  user: BuilderUser;
  shouldFocusUsername?: boolean;
  onFocused?: () => void;
  focusRequestPath?: string | null;
  onFocusRequestHandled?: () => void;
  onRemove: (id: string) => void;
}

function scrollCardIntoView(cardRef: RefObject<HTMLElement | null>): void {
  const card = cardRef.current;
  if (!card) {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (typeof card.scrollIntoView === "function") {
    card.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }
}

export function UserCard({
  user,
  shouldFocusUsername = false,
  onFocused,
  focusRequestPath = null,
  onFocusRequestHandled,
  onRemove,
}: UserCardProps) {
  const updateUser = useProjectStore((state) => state.updateUser);
  const {
    markTouched,
    getVisibleIssuesForPath,
    hasVisibleErrorForPath,
    getFieldMessageId,
    getCardIssueCounts,
  } = useUserValidation();
  const cardRef = useRef<HTMLElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const [pendingSshFocusId, setPendingSshFocusId] = useState<string | null>(
    null,
  );
  const { title, secondary, badges } = getUserHeaderMetadata(user);
  const usernamePath = `users.entries.${user.id}.name`;
  const usernameIssues = getVisibleIssuesForPath(usernamePath);
  const usernameErrors = usernameIssues.filter(
    (issue) => issue.severity === "error",
  );
  const usernameWarnings = usernameIssues.filter(
    (issue) => issue.severity === "warning",
  );
  const hasUsernameError = hasVisibleErrorForPath(usernamePath);
  const { errors: cardErrors, warnings: cardWarnings } = getCardIssueCounts(
    user.id,
  );
  const cardStatusBadge =
    cardErrors > 0
      ? {
          label: cardErrors === 1 ? "1 error" : `${cardErrors} errors`,
          className:
            "inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs text-red-700",
        }
      : cardWarnings > 0
        ? {
            label:
              cardWarnings === 1 ? "1 warning" : `${cardWarnings} warnings`,
            className:
              "inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800",
          }
        : null;

  const usernameDescribedBy = [
    `user-username-help-${user.id}`,
    ...usernameIssues.map((issue) =>
      getFieldMessageId(usernamePath, issue.code),
    ),
  ].join(" ");

  useLayoutEffect(() => {
    if (!shouldFocusUsername) return;
    usernameRef.current?.focus({ preventScroll: true });
    onFocused?.();
  }, [shouldFocusUsername, onFocused]);

  useLayoutEffect(() => {
    if (!focusRequestPath?.startsWith(`users.entries.${user.id}.`)) {
      return;
    }

    scrollCardIntoView(cardRef);

    const focusTarget = () => {
      const sshRowId = getSshRowIdFromPath(focusRequestPath);
      if (sshRowId) {
        document
          .getElementById(`user-ssh-key-${user.id}-${sshRowId}`)
          ?.focus({ preventScroll: true });
      } else if (focusRequestPath.endsWith(".name")) {
        usernameRef.current?.focus({ preventScroll: true });
      } else {
        const targetId = pathToFocusTargetId(focusRequestPath);
        if (targetId) {
          document.getElementById(targetId)?.focus({ preventScroll: true });
        }
      }
      onFocusRequestHandled?.();
    };

    queueMicrotask(focusTarget);
  }, [focusRequestPath, onFocusRequestHandled, user.id]);

  const handleRemove = () => {
    if (
      !window.confirm(
        "Remove user? This removes the custom user card from the project.",
      )
    ) {
      return;
    }
    onRemove(user.id);
  };

  const usernameInputClassName = hasUsernameError
    ? inputErrorClassName
    : usernameWarnings.length > 0
      ? inputWarningClassName
      : inputDefaultClassName;

  return (
    <article
      ref={cardRef}
      aria-labelledby={`user-card-title-${user.id}`}
      className="rounded-lg border border-gray-200 bg-white p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p
                id={`user-card-title-${user.id}`}
                className="text-sm font-semibold text-gray-900"
              >
                {title}
              </p>
              {cardStatusBadge ? (
                <span className={cardStatusBadge.className}>
                  {cardStatusBadge.label}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
              {secondary.map((line) => (
                <span key={`${user.id}-${line}`}>{line}</span>
              ))}
            </div>
          </div>
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => {
                const isAttention =
                  badge === "Custom shell" || badge === "Custom sudo";
                return (
                  <span
                    key={`${user.id}-${badge}`}
                    className={
                      isAttention
                        ? "inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800"
                        : "inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                    }
                  >
                    {badge}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="text-sm text-red-600 hover:text-red-700"
          onClick={handleRemove}
        >
          Remove user
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor={`user-username-${user.id}`}
            className="text-sm font-semibold text-gray-700"
          >
            Username
          </label>
          <input
            ref={usernameRef}
            id={`user-username-${user.id}`}
            type="text"
            placeholder="e.g. deploy"
            value={user.name ?? ""}
            aria-invalid={hasUsernameError ? true : undefined}
            aria-describedby={usernameDescribedBy}
            onChange={(event) =>
              updateUser(user.id, { name: event.target.value })
            }
            onBlur={() => markTouched(usernamePath)}
            className={usernameInputClassName}
          />
          <p
            id={`user-username-help-${user.id}`}
            className="text-xs text-gray-500"
          >
            Letters, numbers, underscores, and hyphens. Must start with a letter
            or underscore.
          </p>
          {usernameErrors.map((issue) => (
            <FieldMessage
              key={issue.code}
              id={getFieldMessageId(usernamePath, issue.code)}
              message={issue.message}
              severity="error"
            />
          ))}
          {usernameWarnings.map((issue) => (
            <FieldMessage
              key={issue.code}
              id={getFieldMessageId(usernamePath, issue.code)}
              message={issue.message}
              severity="warning"
            />
          ))}
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`user-gecos-${user.id}`}
            className="text-sm font-semibold text-gray-700"
          >
            Full name
          </label>
          <input
            id={`user-gecos-${user.id}`}
            type="text"
            placeholder="e.g. Deploy User"
            value={user.gecos ?? ""}
            onChange={(event) =>
              updateUser(user.id, { gecos: event.target.value })
            }
            className={inputDefaultClassName}
          />
          <p className="text-xs text-gray-500">
            Optional. Written to cloud-init as the user&apos;s GECOS value.
          </p>
        </div>

        <GroupsInput
          id={`user-groups-${user.id}`}
          groups={user.groups ?? []}
          onChange={(groups) =>
            updateUser(user.id, {
              groups: groups.length === 0 ? undefined : groups,
            })
          }
        />

        <ShellSelector
          shellId={`user-shell-${user.id}`}
          customShellId={`user-custom-shell-${user.id}`}
          shell={user.shell}
          onChange={(shell) =>
            updateUser(user.id, {
              shell: shell === "" ? undefined : shell,
            })
          }
        />

        <SudoRuleSelector
          id={`user-sudo-${user.id}`}
          sudo={user.sudo}
          onChange={(sudo) => updateUser(user.id, { sudo })}
        />

        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              Authentication
            </h4>
            <p className="mt-1 text-xs text-gray-500">
              Regular login users need a supported password hash or at least one
              valid SSH key.
            </p>
          </div>

          <PasswordHashField
            userId={user.id}
            passwd={user.passwd}
            lockPasswd={user.lock_passwd}
          />

          <SshAuthorizedKeysInput
            userId={user.id}
            rows={user.ssh_authorized_keys ?? []}
            focusRowId={pendingSshFocusId}
            onFocused={() => setPendingSshFocusId(null)}
            onRowAdded={(rowId) => setPendingSshFocusId(rowId)}
          />

          <UserAuthStatus userId={user.id} />
        </div>

        <AdvancedUserOptions user={user} />
      </div>
    </article>
  );
}
