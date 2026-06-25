import { createContext, useContext } from "react";
import type { CommandStage } from "../../models/commands.ts";
import type { ValidationIssue } from "../../validators/validateConfig.ts";

export type YamlOutputChannel = "export" | "copy";

export interface ValidationContextValue {
  mergedIssues: ValidationIssue[];
  blockingErrors: ValidationIssue[];
  revealAll: boolean;
  blockedExportAnnouncement: string;
  setPasswordDraft: (userId: string, value: string) => void;
  getPasswordDraft: (userId: string) => string;
  markTouched: (path: string) => void;
  markAuthTouched: (userId: string) => void;
  revealAllValidation: (channel?: YamlOutputChannel) => void;
  revealAllUserValidation: (channel?: YamlOutputChannel) => void;
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

export const ValidationContext = createContext<ValidationContextValue | null>(
  null,
);

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
