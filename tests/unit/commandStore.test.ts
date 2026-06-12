import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../src/models/project.ts";
import { isCommandsConfig } from "../../src/models/commands.ts";
import { useProjectStore } from "../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [],
};

describe("command store actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Commands Test");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function commands() {
    const project = useProjectStore.getState().project;
    expect(isCommandsConfig(project?.commands)).toBe(true);
    if (!project || !isCommandsConfig(project.commands)) {
      throw new Error("expected canonical commands");
    }
    return project.commands;
  }

  it("adds commands only to the requested stage", () => {
    const runId = useProjectStore.getState().addCommand("runcmd", "run-1");
    const bootId = useProjectStore.getState().addCommand("bootcmd", "boot-1");

    expect(runId).toBe("run-1");
    expect(bootId).toBe("boot-1");
    expect(commands().runcmd).toHaveLength(1);
    expect(commands().bootcmd).toHaveLength(1);
    expect(commands().runcmd[0]?.id).toBe("run-1");
    expect(commands().bootcmd[0]?.id).toBe("boot-1");
  });

  it("updates shell command values by stable id within a stage", () => {
    useProjectStore.getState().addCommand("runcmd", "run-1");
    useProjectStore.getState().addCommand("runcmd", "run-2");
    useProjectStore.getState().updateShellCommand(
      "runcmd",
      "run-1",
      "apt-get update",
    );

    expect(commands().runcmd[0]).toMatchObject({
      id: "run-1",
      form: "shell",
      command: "apt-get update",
    });
    expect(commands().runcmd[1]).toMatchObject({
      id: "run-2",
      form: "shell",
      command: "",
    });
  });

  it("removes commands only from the requested stage", () => {
    useProjectStore.getState().addCommand("runcmd", "run-1");
    useProjectStore.getState().addCommand("bootcmd", "boot-1");
    useProjectStore.getState().removeCommand("runcmd", "run-1");

    expect(commands().runcmd).toEqual([]);
    expect(commands().bootcmd).toHaveLength(1);
  });

  it("moves a command exactly one position and clamps at boundaries", () => {
    useProjectStore.getState().addCommand("runcmd", "run-1");
    useProjectStore.getState().addCommand("runcmd", "run-2");
    useProjectStore.getState().addCommand("runcmd", "run-3");

    useProjectStore.getState().moveCommand("runcmd", "run-2", "up");
    expect(commands().runcmd.map((command) => command.id)).toEqual([
      "run-2",
      "run-1",
      "run-3",
    ]);

    useProjectStore.getState().moveCommand("runcmd", "run-2", "up");
    expect(commands().runcmd.map((command) => command.id)).toEqual([
      "run-2",
      "run-1",
      "run-3",
    ]);

    useProjectStore.getState().moveCommand("runcmd", "run-3", "down");
    expect(commands().runcmd.map((command) => command.id)).toEqual([
      "run-2",
      "run-1",
      "run-3",
    ]);
  });

  it("updates metadata.updatedAt and isDirty on successful mutations", () => {
    const before = useProjectStore.getState().project?.metadata.updatedAt;
    vi.advanceTimersByTime(1000);

    useProjectStore.getState().addCommand("runcmd", "run-1");

    const state = useProjectStore.getState();
    expect(state.isDirty).toBe(true);
    expect(state.project?.metadata.updatedAt).not.toBe(before);
  });

  it("returns injectable ids from addCommand for focus targeting", () => {
    const id = useProjectStore.getState().addCommand("runcmd", "focus-run");
    expect(id).toBe("focus-run");
  });

  it("no-ops when project commands are missing", () => {
    const project = createDefaultProject("No Commands");
    delete project.commands;
    useProjectStore.getState().loadProject(project);

    expect(useProjectStore.getState().addCommand("runcmd", "run-1")).toBeUndefined();
    useProjectStore.getState().updateShellCommand("runcmd", "run-1", "true");
    useProjectStore.getState().removeCommand("runcmd", "run-1");
    useProjectStore.getState().moveCommand("runcmd", "run-1", "up");

    expect(useProjectStore.getState().project?.commands).toBeUndefined();
  });
});
