import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { BuilderCommand, CommandStage } from "../../models/commands.ts";
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

function isBlankCommand(command: BuilderCommand): boolean {
  if (command.form === "shell") {
    return command.command.trim() === "";
  }

  return (
    command.executable.trim() === "" &&
    command.arguments.every((argument) => argument.value.trim() === "")
  );
}

export function CommandCard({
  stage,
  command,
  position,
  total,
  shouldFocusCommand = false,
  onFocused,
  onRemove,
  onMove,
}: CommandCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const commandRef = useRef<HTMLTextAreaElement>(null);
  const argvRef = useRef<ArgvCommandInputHandle>(null);
  const [focusArgvExecutable, setFocusArgvExecutable] = useState(false);
  const isFirst = position === 1;
  const isLast = position === total;

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

  const handleRemove = () => {
    if (!isBlankCommand(command) && !window.confirm(REMOVE_CONFIRM)) {
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
        <p
          id={`command-card-title-${stage}-${command.id}`}
          className="text-sm font-semibold text-gray-900"
        >
          Command {position}
        </p>
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
