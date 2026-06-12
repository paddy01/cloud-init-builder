import {
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { BuilderCommand, CommandStage } from "../../models/commands.ts";
import { useUserValidation } from "../users/UserValidationContext.tsx";
import {
  isFullyBlankCommand,
  pathToFocusTargetId,
} from "./commandValidationPaths.ts";
import {
  ArgvCommandInput,
  type ArgvCommandInputHandle,
} from "./ArgvCommandInput.tsx";
import { CommandFormSelector } from "./CommandFormSelector.tsx";
import { ShellCommandInput } from "./ShellCommandInput.tsx";

const REMOVE_CONFIRM =
  "Remove command? This removes the command from the project and changes the execution order.";

const reorderEnabledClassName =
  "min-h-10 rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";
const reorderDisabledClassName =
  "min-h-10 cursor-not-allowed rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 opacity-50";

interface CommandCardProps {
  stage: CommandStage;
  command: BuilderCommand;
  position: number;
  total: number;
  shouldFocusCommand?: boolean;
  onFocused?: () => void;
  onFocusRequestHandled?: () => void;
  onRemove: (commandId: string) => void;
  onMove: (commandId: string, direction: "up" | "down") => void;
}

function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return true;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollCardIntoView(cardRef: RefObject<HTMLElement | null>): void {
  const card = cardRef.current;
  if (!card || typeof card.scrollIntoView !== "function") {
    return;
  }

  card.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

export function CommandCard({
  stage,
  command,
  position,
  total,
  shouldFocusCommand = false,
  onFocused,
  onFocusRequestHandled,
  onRemove,
  onMove,
}: CommandCardProps) {
  const {
    focusRequestPath,
    getCommandCardIssueCounts,
  } = useUserValidation();
  const cardRef = useRef<HTMLElement>(null);
  const commandRef = useRef<HTMLTextAreaElement>(null);
  const argvRef = useRef<ArgvCommandInputHandle>(null);
  const [focusArgvExecutable, setFocusArgvExecutable] = useState(false);
  const isFirst = position === 1;
  const isLast = position === total;
  const { errors: cardErrors, warnings: cardWarnings } =
    getCommandCardIssueCounts(stage, command.id);
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

  useLayoutEffect(() => {
    if (!shouldFocusCommand) {
      return;
    }

    if (command.form === "shell") {
      commandRef.current?.focus({ preventScroll: true });
    } else {
      argvRef.current?.focusExecutable();
    }
    scrollCardIntoView(cardRef);
    onFocused?.();
  }, [shouldFocusCommand, onFocused, command.form]);

  useLayoutEffect(() => {
    if (!focusArgvExecutable) {
      return;
    }

    argvRef.current?.focusExecutable();
    setFocusArgvExecutable(false);
  }, [focusArgvExecutable, command.form]);

  useLayoutEffect(() => {
    const prefix = `commands.${stage}.${command.id}.`;
    if (!focusRequestPath?.startsWith(prefix)) {
      return;
    }

    scrollCardIntoView(cardRef);

    const focusTarget = () => {
      if (focusRequestPath.endsWith(".command")) {
        commandRef.current?.focus({ preventScroll: true });
      } else if (focusRequestPath.endsWith(".executable")) {
        argvRef.current?.focusExecutable();
      } else {
        const targetId = pathToFocusTargetId(focusRequestPath);
        if (targetId) {
          document.getElementById(targetId)?.focus({ preventScroll: true });
        }
      }
      onFocusRequestHandled?.();
    };

    queueMicrotask(focusTarget);
  }, [command.id, focusRequestPath, onFocusRequestHandled, stage]);

  const handleRemove = () => {
    if (!isFullyBlankCommand(command) && !window.confirm(REMOVE_CONFIRM)) {
      return;
    }
    onRemove(command.id);
  };

  const handleFormSwitch = (form: BuilderCommand["form"]) => {
    if (form === "argv") {
      setFocusArgvExecutable(true);
    }
  };

  return (
    <article
      ref={cardRef}
      aria-labelledby={`command-card-title-${stage}-${command.id}`}
      className="rounded-lg border border-gray-200 bg-white p-6"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p
            id={`command-card-title-${stage}-${command.id}`}
            className="text-sm font-semibold text-gray-900"
          >
            Command {position}
          </p>
          {cardStatusBadge ? (
            <span className={cardStatusBadge.className}>{cardStatusBadge.label}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2" role="group" aria-label="Reorder command">
            <button
              type="button"
              className={isFirst ? reorderDisabledClassName : reorderEnabledClassName}
              disabled={isFirst}
              onClick={() => onMove(command.id, "up")}
            >
              Move up
            </button>
            <button
              type="button"
              className={isLast ? reorderDisabledClassName : reorderEnabledClassName}
              disabled={isLast}
              onClick={() => onMove(command.id, "down")}
            >
              Move down
            </button>
          </div>
          <button
            type="button"
            className="min-h-10 text-sm text-red-600 hover:text-red-700"
            onClick={handleRemove}
          >
            Remove command
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <CommandFormSelector
          stage={stage}
          command={command}
          onFormSwitch={handleFormSwitch}
        />

        {command.form === "shell" ? (
          <ShellCommandInput ref={commandRef} stage={stage} command={command} />
        ) : (
          <ArgvCommandInput
            ref={argvRef}
            stage={stage}
            command={command}
            shouldFocusExecutable={focusArgvExecutable}
            onFocused={() => setFocusArgvExecutable(false)}
          />
        )}
      </div>
    </article>
  );
}
