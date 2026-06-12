import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isCommandsConfig,
  type CommandStage,
} from "../../models/commands.ts";
import { isUsersConfig } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { isSupportedPasswordHash } from "../../validators/passwordHash.ts";
import {
  validateConfig,
  type ValidationIssue,
} from "../../validators/validateConfig.ts";
import { USER_VALIDATION_MESSAGES } from "../../validators/validateUsers.ts";
import {
  getStageFromIssuePath,
  isCommandIssuePath,
  sortCommandSummaryIssues,
} from "../commands/commandValidationPaths.ts";
import { isUserIssuePath } from "../users/userValidationPaths.ts";

export interface ValidationContextValue {
  mergedIssues: ValidationIssue[];
  blockingErrors: ValidationIssue[];
  revealAll: boolean;
  blockedExportAnnouncement: string;
  setPasswordDraft: (userId: string, value: string) => void;
  getPasswordDraft: (userId: string) => string;
  markTouched: (path: string) => void;
  markAuthTouched: (userId: string) => void;
  revealAllValidation: () => void;
  revealAllUserValidation: () => void;
  requestFocus: (path: string) => void;
  focusRequestPath: string | null;
  consumeFocusRequest: () => string | null;
  resetValidationInteraction: () => void;
  getVisibleIssuesForPath: (path: string) => ValidationIssue[];
  shouldShowAuthStatus: (userId: string) => boolean;
  hasVisibleErrorForPath: (path: string) => boolean;
  getFieldMessageId: (path: string, code: string) => string;
  clearBlockedExportAnnouncement: () => void;
  getVisibleUserSummaryIssues: () => ValidationIssue[];
  getVisibleCommandSummaryIssues: (activeStage: CommandStage) => ValidationIssue[];
  getCardIssueCounts: (
    userId: string,
  ) => { errors: number; warnings: number };
  getCommandCardIssueCounts: (
    stage: CommandStage,
    commandId: string,
  ) => { errors: number; warnings: number };
  getFirstBlockingIssueSection: () => "identity" | "users" | "commands";
  getFirstBlockingCommandStage: () => CommandStage | null;
}

const ValidationContext = createContext<ValidationContextValue | null>(null);

function passwdPath(userId: string): string {
  return `users.entries.${userId}.passwd`;
}

function authenticationPath(userId: string): string {
  return `users.entries.${userId}.authentication`;
}

function buildDraftIssues(
  passwordDraftByUserId: Record<string, string>,
  canonicalIssues: ValidationIssue[],
): ValidationIssue[] {
  const canonicalPasswdErrors = new Set(
    canonicalIssues
      .filter((issue) => issue.code === "USER_PASSWORD_HASH_INVALID")
      .map((issue) => issue.path),
  );
  const issues: ValidationIssue[] = [];

  for (const [userId, draft] of Object.entries(passwordDraftByUserId)) {
    const trimmed = draft.trim();
    if (trimmed === "" || isSupportedPasswordHash(trimmed)) {
      continue;
    }

    const path = passwdPath(userId);
    if (canonicalPasswdErrors.has(path)) {
      continue;
    }

    issues.push({
      path,
      code: "USER_PASSWORD_HASH_INVALID",
      message: USER_VALIDATION_MESSAGES.USER_PASSWORD_HASH_INVALID,
      severity: "error",
    });
  }

  return issues;
}

function getIssueSection(
  path: string,
): "identity" | "users" | "commands" | null {
  if (path.startsWith("identity.")) {
    return "identity";
  }
  if (isUserIssuePath(path)) {
    return "users";
  }
  if (isCommandIssuePath(path)) {
    return "commands";
  }
  return null;
}

export function ValidationProvider({ children }: { children: ReactNode }) {
  const project = useProjectStore((state) => state.project);
  const [passwordDraftByUserId, setPasswordDraftByUserId] = useState<
    Record<string, string>
  >({});
  const [touchedPaths, setTouchedPaths] = useState<Set<string>>(
    () => new Set(),
  );
  const [authTouchedUserIds, setAuthTouchedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [revealAll, setRevealAll] = useState(false);
  const [blockedExportAnnouncement, setBlockedExportAnnouncement] =
    useState("");
  const [focusRequestPath, setFocusRequestPath] = useState<string | null>(null);
  const projectBoundaryRef = useRef<string | null>(null);
  const previousUserIdsRef = useRef<string[]>([]);
  const previousCommandIdsRef = useRef<string[]>([]);

  const resetValidationInteraction = useCallback(() => {
    setPasswordDraftByUserId({});
    setTouchedPaths(new Set());
    setAuthTouchedUserIds(new Set());
    setRevealAll(false);
    setBlockedExportAnnouncement("");
    setFocusRequestPath(null);
  }, []);

  const projectBoundaryKey = project
    ? `${project.metadata.name}:${project.metadata.createdAt}`
    : null;

  useEffect(() => {
    if (
      projectBoundaryRef.current !== null &&
      projectBoundaryKey !== projectBoundaryRef.current
    ) {
      resetValidationInteraction();
    }
    projectBoundaryRef.current = projectBoundaryKey;
  }, [projectBoundaryKey, resetValidationInteraction]);

  const currentUserIds = useMemo(() => {
    if (!project?.users || !isUsersConfig(project.users)) {
      return [];
    }
    return project.users.entries.map((entry) => entry.id);
  }, [project]);

  const currentCommandIds = useMemo(() => {
    if (!project?.commands || !isCommandsConfig(project.commands)) {
      return [];
    }
    return [
      ...project.commands.runcmd.map((entry) => entry.id),
      ...project.commands.bootcmd.map((entry) => entry.id),
    ];
  }, [project]);

  useEffect(() => {
    const previousIds = previousUserIdsRef.current;
    const removedIds = previousIds.filter((id) => !currentUserIds.includes(id));
    if (removedIds.length === 0) {
      previousUserIdsRef.current = currentUserIds;
      return;
    }

    setPasswordDraftByUserId((current) => {
      const next = { ...current };
      for (const userId of removedIds) {
        delete next[userId];
      }
      return next;
    });

    setTouchedPaths((current) => {
      const next = new Set(current);
      for (const path of current) {
        if (removedIds.some((userId) => path.includes(userId))) {
          next.delete(path);
        }
      }
      return next;
    });

    setAuthTouchedUserIds((current) => {
      const next = new Set(current);
      for (const userId of removedIds) {
        next.delete(userId);
      }
      return next;
    });

    previousUserIdsRef.current = currentUserIds;
  }, [currentUserIds]);

  useEffect(() => {
    const previousIds = previousCommandIdsRef.current;
    const removedIds = previousIds.filter((id) => !currentCommandIds.includes(id));
    if (removedIds.length === 0) {
      previousCommandIdsRef.current = currentCommandIds;
      return;
    }

    setTouchedPaths((current) => {
      const next = new Set(current);
      for (const path of current) {
        if (removedIds.some((commandId) => path.includes(commandId))) {
          next.delete(path);
        }
      }
      return next;
    });

    previousCommandIdsRef.current = currentCommandIds;
  }, [currentCommandIds]);

  const canonicalIssues = useMemo(
    () => validateConfig(project),
    [project],
  );

  const mergedIssues = useMemo(() => {
    const draftIssues = buildDraftIssues(
      passwordDraftByUserId,
      canonicalIssues,
    );
    return [...canonicalIssues, ...draftIssues];
  }, [canonicalIssues, passwordDraftByUserId]);

  const blockingErrors = useMemo(
    () => mergedIssues.filter((issue) => issue.severity === "error"),
    [mergedIssues],
  );

  const setPasswordDraft = useCallback((userId: string, value: string) => {
    setPasswordDraftByUserId((current) => ({
      ...current,
      [userId]: value,
    }));
  }, []);

  const getPasswordDraft = useCallback(
    (userId: string) => passwordDraftByUserId[userId] ?? "",
    [passwordDraftByUserId],
  );

  const markTouched = useCallback((path: string) => {
    setTouchedPaths((current) => {
      if (current.has(path)) {
        return current;
      }
      const next = new Set(current);
      next.add(path);
      return next;
    });
  }, []);

  const markAuthTouched = useCallback((userId: string) => {
    markTouched(authenticationPath(userId));
    setAuthTouchedUserIds((current) => {
      if (current.has(userId)) {
        return current;
      }
      const next = new Set(current);
      next.add(userId);
      return next;
    });
  }, [markTouched]);

  const revealAllValidation = useCallback(() => {
    setRevealAll(true);

    const firstError = blockingErrors[0];
    const section = firstError ? getIssueSection(firstError.path) : null;

    if (section === "commands") {
      setBlockedExportAnnouncement(
        "Export is blocked. Review the highlighted command errors.",
      );
      return;
    }

    if (section === "users") {
      setBlockedExportAnnouncement(
        "Export is blocked. Review the highlighted user errors.",
      );
      return;
    }

    setBlockedExportAnnouncement(
      "Export is blocked. Review the highlighted errors.",
    );
  }, [blockingErrors]);

  const revealAllUserValidation = revealAllValidation;

  const requestFocus = useCallback((path: string) => {
    setFocusRequestPath(path);
  }, []);

  const consumeFocusRequest = useCallback(() => {
    const path = focusRequestPath;
    setFocusRequestPath(null);
    return path;
  }, [focusRequestPath]);

  const clearBlockedExportAnnouncement = useCallback(() => {
    setBlockedExportAnnouncement("");
  }, []);

  const isPathVisible = useCallback(
    (path: string) => revealAll || touchedPaths.has(path),
    [revealAll, touchedPaths],
  );

  const getVisibleIssuesForPath = useCallback(
    (path: string) => {
      if (!isPathVisible(path)) {
        return [];
      }
      return mergedIssues.filter((issue) => issue.path === path);
    },
    [isPathVisible, mergedIssues],
  );

  const shouldShowAuthStatus = useCallback(
    (userId: string) =>
      revealAll ||
      authTouchedUserIds.has(userId) ||
      touchedPaths.has(authenticationPath(userId)),
    [authTouchedUserIds, revealAll, touchedPaths],
  );

  const hasVisibleErrorForPath = useCallback(
    (path: string) =>
      getVisibleIssuesForPath(path).some((issue) => issue.severity === "error"),
    [getVisibleIssuesForPath],
  );

  const getFieldMessageId = useCallback(
    (path: string, code: string) =>
      `${path.replace(/\./g, "-")}-${code}`.toLowerCase(),
    [],
  );

  const getVisibleUserSummaryIssues = useCallback(() => {
    return mergedIssues.filter(
      (issue) => isUserIssuePath(issue.path) && isPathVisible(issue.path),
    );
  }, [isPathVisible, mergedIssues]);

  const getVisibleCommandSummaryIssues = useCallback(
    (activeStage: CommandStage) => {
      const commands =
        project?.commands && isCommandsConfig(project.commands)
          ? project.commands
          : { bootcmd: [], runcmd: [] };

      const visible = mergedIssues.filter(
        (issue) => isCommandIssuePath(issue.path) && isPathVisible(issue.path),
      );

      return sortCommandSummaryIssues(visible, activeStage, commands);
    },
    [isPathVisible, mergedIssues, project],
  );

  const getCardIssueCounts = useCallback(
    (userId: string) => {
      const prefix = `users.entries.${userId}.`;
      let errors = 0;
      let warnings = 0;

      for (const issue of mergedIssues) {
        if (!issue.path.startsWith(prefix)) {
          continue;
        }
        if (issue.severity === "error") {
          errors += 1;
        } else {
          warnings += 1;
        }
      }

      return { errors, warnings };
    },
    [mergedIssues],
  );

  const getCommandCardIssueCounts = useCallback(
    (stage: CommandStage, commandId: string) => {
      const prefix = `commands.${stage}.${commandId}.`;
      let errors = 0;
      let warnings = 0;

      for (const issue of mergedIssues) {
        if (!issue.path.startsWith(prefix)) {
          continue;
        }
        if (issue.severity === "error") {
          errors += 1;
        } else {
          warnings += 1;
        }
      }

      return { errors, warnings };
    },
    [mergedIssues],
  );

  const getFirstBlockingIssueSection = useCallback((): "identity" | "users" | "commands" => {
    const firstError = blockingErrors[0];
    if (!firstError) {
      return "identity";
    }
    return getIssueSection(firstError.path) ?? "identity";
  }, [blockingErrors]);

  const getFirstBlockingCommandStage = useCallback((): CommandStage | null => {
    const firstCommandError = blockingErrors.find((issue) =>
      isCommandIssuePath(issue.path),
    );
    if (!firstCommandError) {
      return null;
    }
    return getStageFromIssuePath(firstCommandError.path);
  }, [blockingErrors]);

  const value = useMemo(
    () => ({
      mergedIssues,
      blockingErrors,
      revealAll,
      blockedExportAnnouncement,
      setPasswordDraft,
      getPasswordDraft,
      markTouched,
      markAuthTouched,
      revealAllValidation,
      revealAllUserValidation,
      requestFocus,
      focusRequestPath,
      consumeFocusRequest,
      resetValidationInteraction,
      getVisibleIssuesForPath,
      shouldShowAuthStatus,
      hasVisibleErrorForPath,
      getFieldMessageId,
      clearBlockedExportAnnouncement,
      getVisibleUserSummaryIssues,
      getVisibleCommandSummaryIssues,
      getCardIssueCounts,
      getCommandCardIssueCounts,
      getFirstBlockingIssueSection,
      getFirstBlockingCommandStage,
    }),
    [
      mergedIssues,
      blockingErrors,
      revealAll,
      blockedExportAnnouncement,
      setPasswordDraft,
      getPasswordDraft,
      markTouched,
      markAuthTouched,
      revealAllValidation,
      revealAllUserValidation,
      requestFocus,
      focusRequestPath,
      consumeFocusRequest,
      resetValidationInteraction,
      getVisibleIssuesForPath,
      shouldShowAuthStatus,
      hasVisibleErrorForPath,
      getFieldMessageId,
      clearBlockedExportAnnouncement,
      getVisibleUserSummaryIssues,
      getVisibleCommandSummaryIssues,
      getCardIssueCounts,
      getCommandCardIssueCounts,
      getFirstBlockingIssueSection,
      getFirstBlockingCommandStage,
    ],
  );

  return (
    <ValidationContext.Provider value={value}>
      {children}
    </ValidationContext.Provider>
  );
}

const noopValidation: ValidationContextValue = {
  mergedIssues: [],
  blockingErrors: [],
  revealAll: false,
  blockedExportAnnouncement: "",
  setPasswordDraft: () => undefined,
  getPasswordDraft: () => "",
  markTouched: () => undefined,
  markAuthTouched: () => undefined,
  revealAllValidation: () => undefined,
  revealAllUserValidation: () => undefined,
  requestFocus: () => undefined,
  focusRequestPath: null,
  consumeFocusRequest: () => null,
  resetValidationInteraction: () => undefined,
  getVisibleIssuesForPath: () => [],
  shouldShowAuthStatus: () => false,
  hasVisibleErrorForPath: () => false,
  getFieldMessageId: (path, code) =>
    `${path.replace(/\./g, "-")}-${code}`.toLowerCase(),
  clearBlockedExportAnnouncement: () => undefined,
  getVisibleUserSummaryIssues: () => [],
  getVisibleCommandSummaryIssues: () => [],
  getCardIssueCounts: () => ({ errors: 0, warnings: 0 }),
  getCommandCardIssueCounts: () => ({ errors: 0, warnings: 0 }),
  getFirstBlockingIssueSection: () => "identity",
  getFirstBlockingCommandStage: () => null,
};

export function useValidation(): ValidationContextValue {
  const context = useContext(ValidationContext);
  return context ?? noopValidation;
}
